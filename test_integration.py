import asyncio
import httpx
import websockets
import json
import sys

BASE_URL = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000"

# Mock PDB file content representing catalytic residues ASP-HIS-SER
MOCK_PDB = """ATOM      1  N   ASP A   1      -9.529  18.172  -3.210  1.00  0.00           N
ATOM      2  CA  ASP A   1      -8.118  18.665  -3.036  1.00  0.00           C
ATOM      3  C   ASP A   1      -7.144  17.585  -3.411  1.00  0.00           C
ATOM      4  O   ASP A   1      -7.514  16.409  -3.454  1.00  0.00           O
ATOM      5  CB  ASP A   1      -7.859  19.924  -3.874  1.00  0.00           C
ATOM      6  CG  ASP A   1      -8.810  21.050  -3.473  1.00  0.00           C
ATOM      7  OD1 ASP A   1      -9.986  20.781  -3.136  1.00  0.00           O
ATOM      8  OD2 ASP A   1      -8.384  22.217  -3.497  1.00  0.00           O
ATOM      9  N   HIS A   2      -5.892  17.989  -3.666  1.00  0.00           N
ATOM     10  CA  HIS A   2      -4.857  17.065  -4.077  1.00  0.00           C
ATOM     11  C   HIS A   2      -4.498  16.035  -2.998  1.00  0.00           C
ATOM     12  O   HIS A   2      -4.148  14.887  -3.298  1.00  0.00           O
ATOM     13  CB  HIS A   2      -3.606  17.848  -4.529  1.00  0.00           C
ATOM     14  CG  HIS A   2      -3.843  18.777  -5.683  1.00  0.00           C
ATOM     15  ND1 HIS A   2      -4.417  20.017  -5.556  1.00  0.00           N
ATOM     16  CD2 HIS A   2      -3.590  18.647  -7.009  1.00  0.00           C
ATOM     17  CE1 HIS A   2      -4.498  20.609  -6.755  1.00  0.00           C
ATOM     18  NE2 HIS A   2      -4.004  19.800  -7.653  1.00  0.00           N
ATOM     19  N   SER A   3      -4.597  16.444  -1.737  1.00  0.00           N
ATOM     20  CA  SER A   3      -4.321  15.540  -0.627  1.00  0.00           C
ATOM     21  C   SER A   3      -5.467  14.542  -0.457  1.00  0.00           C
ATOM     22  O   SER A   3      -5.263  13.435  -0.957  1.00  0.00           O
ATOM     23  CB  SER A   3      -4.120  16.353   0.655  1.00  0.00           C
ATOM     24  OG  SER A   3      -2.977  17.181   0.490  1.00  0.00           O
TER"""

async def test_flow():
    async with httpx.AsyncClient() as client:
        # 1. Health check
        print("1. Checking backend health...")
        res = await client.get(f"{BASE_URL}/")
        assert res.status_code == 200, "Health check failed"
        print(f"Health Response: {res.json()}")

        # 2. Upload protein structure
        print("\n2. Uploading protein structure PDB...")
        files = {"file": ("test.pdb", MOCK_PDB, "text/plain")}
        res = await client.post(f"{BASE_URL}/api/upload/protein-structure", files=files)
        assert res.status_code == 200, "Protein structure upload failed"
        upload_data = res.json()
        project_id = upload_data["project_id"]
        print(f"Project ID created: {project_id}")
        print(f"Chains parsed: {upload_data['chains']}")
        print(f"Residues parsed count: {upload_data['residue_count']}")
        print(f"Atoms parsed count: {len(upload_data['atoms'])}")
        assert upload_data["residue_count"] == 3, "Residue count should be 3"
        assert len(upload_data["atoms"]) == 24, "Atom count should be 24"

        # 3. Upload ligand SMILES
        print("\n3. Uploading ligand SMILES...")
        data = {
            "ligand_type": "smiles",
            "ligand_smiles": "CC(=O)NC1=CC=C(O)C=C1", # Acetaminophen
            "project_id": project_id
        }
        res = await client.post(f"{BASE_URL}/api/upload/ligand", data=data)
        assert res.status_code == 200, "Ligand upload failed"
        print(f"Ligand upload response: {res.json()}")

        # 4. Start analysis pipeline
        print("\n4. Starting analysis pipeline...")
        payload = {
            "project_id": project_id,
            "temperature": 310.15, # 37C
            "ph": 7.2,
            "mutation": "H2A" # Mutating histidine
        }
        res = await client.post(f"{BASE_URL}/api/analyze/start", json=payload)
        assert res.status_code == 200, "Pipeline start failed"
        print(f"Pipeline response: {res.json()}")

        # 5. Listen to WebSocket progress updates
        print("\n5. Connecting to WebSocket for real-time progress...")
        ws_uri = f"{WS_URL}/ws/analysis/{project_id}"
        async with websockets.connect(ws_uri) as websocket:
            while True:
                msg = await websocket.recv()
                data = json.loads(msg)
                print(f"Progress update: {data}")
                if data["status"] == "Complete" or data["progress"] == 100:
                    break

        # 6. Verify modular calculation result endpoints
        print("\n6. Verifying modular calculation results...")
        module_endpoints = ["delta-g", "delta-h", "active-site", "mechanism", "binding", "stability", "mutation", "pathway"]
        for endpoint in module_endpoints:
            res = await client.post(f"{BASE_URL}/api/analyze/{endpoint}", json={"project_id": project_id})
            assert res.status_code == 200, f"Module endpoint '{endpoint}' failed"
            print(f"Endpoint '{endpoint}' result: {list(res.json().keys())}")

        # 7. Generate combined PDF report
        print("\n7. Generating PDF report...")
        report_req = {
            "project_id": project_id,
            "selected_modules": ["dg", "dh", "active-site", "mechanism", "binding", "stability", "mutation", "pathway"]
        }
        res = await client.post(f"{BASE_URL}/api/report/generate", json=report_req)
        assert res.status_code == 200, "Report generation failed"
        report_data = res.json()
        print(f"Report generated: {report_data}")
        download_url = report_data["download_url"]

        # 8. Download PDF report
        print("\n8. Downloading PDF report...")
        res = await client.get(f"{BASE_URL}{download_url}")
        assert res.status_code == 200, "Report download failed"
        pdf_content = res.content
        print(f"PDF content size: {len(pdf_content)} bytes")
        assert pdf_content.startswith(b"%PDF"), "Response is not a valid PDF document"
        print("Verification Succeeded! The PDF is a valid PDF document.")

if __name__ == "__main__":
    asyncio.run(test_flow())
