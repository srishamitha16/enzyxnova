import re
import math
import json
import hashlib

# Check RDKit availability
try:
    from rdkit import Chem
    from rdkit.Chem import Descriptors, AllChem
    RDKIT_AVAILABLE = True
except ImportError:
    RDKIT_AVAILABLE = False


# ==========================================
# 1. SEQUENCE PREPROCESSING
# ==========================================

AMINO_ACIDS = "ACDEFGHIKLMNPQRSTVWY"

def calculate_sequence_descriptors(sequence: str) -> dict:
    """
    Computes sequence length, amino acid frequencies, dipeptide composition,
    and charge/polarity ratios.
    """
    sequence = sequence.upper()
    # Remove non-standard characters
    sequence = "".join([c for c in sequence if c in AMINO_ACIDS])
    length = len(sequence)
    if length == 0:
        return {"length": 0, "aa_composition": {}, "dipeptide_composition": {}, "polar_ratio": 0.0}

    # AA composition
    aa_counts = {aa: sequence.count(aa) for aa in AMINO_ACIDS}
    aa_composition = {aa: count / length for aa, count in aa_counts.items()}

    # Group counts
    polar = sum(aa_counts[aa] for aa in "STCYNQ")
    charged = sum(aa_counts[aa] for aa in "DEKRH")
    hydrophobic = sum(aa_counts[aa] for aa in "AVILMFYWPGC")

    # Dipeptide composition (400 features, compressed as non-zero map or list)
    dipeptides = {}
    for i in range(length - 1):
        di = sequence[i:i+2]
        dipeptides[di] = dipeptides.get(di, 0) + 1
    dipeptide_composition = {di: count / (length - 1) for di, count in dipeptides.items()}

    return {
        "length": length,
        "aa_composition": aa_composition,
        "dipeptide_composition": dipeptide_composition,
        "polar_ratio": polar / length,
        "charged_ratio": charged / length,
        "hydrophobic_ratio": hydrophobic / length,
        "isoelectric_point_approx": 7.0 + (charged / length) * 2.0 - (polar / length) * 1.0 # heuristic IP
    }


# ==========================================
# 2. STRUCTURE PREPROCESSING (PDB PARSER)
# ==========================================

def parse_pdb_content(pdb_content: str) -> list:
    """
    Parses a PDB file string into atom dictionary entries in pure Python.
    """
    atoms = []
    for line in pdb_content.splitlines():
        if line.startswith("ATOM  ") or line.startswith("HETATM"):
            try:
                atom_name = line[12:16].strip()
                res_name = line[17:20].strip()
                chain_id = line[21].strip()
                res_seq = int(line[22:26].strip())
                x = float(line[30:38].strip())
                y = float(line[38:46].strip())
                z = float(line[46:54].strip())
                element = line[76:78].strip()
                if not element and len(atom_name) > 0:
                    element = atom_name[0] # guess element
                b_factor = float(line[60:66].strip()) if len(line) >= 66 else 0.0
                atoms.append({
                    "name": atom_name,
                    "res_name": res_name,
                    "chain_id": chain_id,
                    "res_seq": res_seq,
                    "x": x, "y": y, "z": z,
                    "element": element.upper(),
                    "b_factor": b_factor
                })
            except Exception:
                continue
    return atoms

def normalize_coordinates(atoms: list) -> list:
    """
    Translates all coordinates so that the centroid lies at (0, 0, 0).
    """
    if not atoms:
        return []
    xs = [a["x"] for a in atoms]
    ys = [a["y"] for a in atoms]
    zs = [a["z"] for a in atoms]
    cx = sum(xs) / len(atoms)
    cy = sum(ys) / len(atoms)
    cz = sum(zs) / len(atoms)

    normalized = []
    for a in atoms:
        an = a.copy()
        an["x"] -= cx
        an["y"] -= cy
        an["z"] -= cz
        normalized.append(an)
    return normalized

def extract_ca_path(atoms: list) -> list:
    """
    Extracts alpha carbon (CA) atoms sorted by residue sequence index.
    """
    ca_atoms = [a for a in atoms if a["name"] == "CA"]
    ca_atoms.sort(key=lambda a: (a["chain_id"], a["res_seq"]))
    return ca_atoms

def catmull_rom_spline(p0, p1, p2, p3, n_points=5):
    """
    Calculates Catmull-Rom spline points between p1 and p2.
    """
    points = []
    for i in range(n_points):
        t = i / n_points
        t2 = t * t
        t3 = t2 * t
        
        # Coefficients
        f0 = -0.5 * t3 + t2 - 0.5 * t
        f1 = 1.5 * t3 - 2.5 * t2 + 1.0
        f2 = -1.5 * t3 + 2.0 * t2 + 0.5 * t
        f3 = 0.5 * t3 - 0.5 * t2
        
        x = p0[0]*f0 + p1[0]*f1 + p2[0]*f2 + p3[0]*f3
        y = p0[1]*f0 + p1[1]*f1 + p2[1]*f2 + p3[1]*f3
        z = p0[2]*f0 + p1[2]*f1 + p2[2]*f2 + p3[2]*f3
        
        points.append((x, y, z))
    return points

def generate_backbone_spline(ca_atoms: list) -> list:
    """
    Generates a dense Catmull-Rom backbone coordinate spline path for visualization.
    """
    if len(ca_atoms) < 4:
        return [(a["x"], a["y"], a["z"]) for a in ca_atoms]
        
    coords = [(a["x"], a["y"], a["z"]) for a in ca_atoms]
    spline_points = []
    
    # Pad end points for boundary splines
    coords_padded = [coords[0]] + coords + [coords[-1]]
    
    for i in range(1, len(coords_padded) - 2):
        p0 = coords_padded[i-1]
        p1 = coords_padded[i]
        p2 = coords_padded[i+1]
        p3 = coords_padded[i+2]
        spline_points.extend(catmull_rom_spline(p0, p1, p2, p3))
    return spline_points

def detect_hydrogen_bonds(atoms: list, distance_cutoff: float = 3.2) -> list:
    """
    Performs fast spatial-grid-based hydrogen bond detection.
    Finds polar atoms (N, O, S) from different residues within the distance_cutoff.
    """
    polar_atoms = [a for a in atoms if a["element"] in ("N", "O", "S")]
    if not polar_atoms:
        return []
        
    # Spatial hashing grid
    grid = {}
    grid_size = distance_cutoff
    for idx, atom in enumerate(polar_atoms):
        gx = int(atom["x"] / grid_size)
        gy = int(atom["y"] / grid_size)
        gz = int(atom["z"] / grid_size)
        key = (gx, gy, gz)
        grid.setdefault(key, []).append(idx)
        
    hbonds = []
    checked = set()
    
    for key, atom_indices in grid.items():
        # Check current cell and neighboring cells (27 cells total)
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for dz in (-1, 0, 1):
                    neighbor_key = (key[0] + dx, key[1] + dy, key[2] + dz)
                    if neighbor_key not in grid:
                        continue
                    
                    for i in atom_indices:
                        a1 = polar_atoms[i]
                        for j in grid[neighbor_key]:
                            if i >= j:
                                continue # check once
                            a2 = polar_atoms[j]
                            
                            # Must be different residues
                            if a1["res_seq"] == a2["res_seq"] and a1["chain_id"] == a2["chain_id"]:
                                continue
                                
                            bond_pair = (i, j)
                            if bond_pair in checked:
                                continue
                            checked.add(bond_pair)
                            
                            # Distance calculation
                            dist = math.sqrt(
                                (a1["x"] - a2["x"])**2 +
                                (a1["y"] - a2["y"])**2 +
                                (a1["z"] - a2["z"])**2
                            )
                            if dist < distance_cutoff:
                                hbonds.append({
                                    "atom1": a1["name"],
                                    "res1": f"{a1['res_name']}{a1['res_seq']}",
                                    "atom2": a2["name"],
                                    "res2": f"{a2['res_name']}{a2['res_seq']}",
                                    "distance": round(dist, 2)
                                })
    return hbonds

def calculate_pocket_centroid(atoms: list, active_site_residues: list) -> tuple:
    """
    Computes the geometric centroid of active site pocket residues.
    active_site_residues: list of ints (residue indices).
    """
    pocket_atoms = [a for a in atoms if a["res_seq"] in active_site_residues]
    if not pocket_atoms:
        pocket_atoms = atoms # Fallback to centroid of entire structure
        
    xs = [a["x"] for a in pocket_atoms]
    ys = [a["y"] for a in pocket_atoms]
    zs = [a["z"] for a in pocket_atoms]
    
    return sum(xs)/len(xs), sum(ys)/len(ys), sum(zs)/len(zs)

def calculate_residue_pocket_distances(ca_atoms: list, centroid: tuple) -> dict:
    """
    Calculates distances from each CA residue to the active pocket centroid.
    """
    cx, cy, cz = centroid
    distances = {}
    for a in ca_atoms:
        dist = math.sqrt((a["x"] - cx)**2 + (a["y"] - cy)**2 + (a["z"] - cz)**2)
        distances[a["res_seq"]] = round(dist, 2)
    return distances


# ==========================================
# 3. LIGAND PREPROCESSING
# ==========================================

def calculate_ligand_descriptors(smiles: str) -> dict:
    """
    Calculates ligand chemical properties using RDKit with analytical mocks as fallback.
    """
    if RDKIT_AVAILABLE:
        try:
            mol = Chem.MolFromSmiles(smiles)
            if mol is None:
                raise ValueError("RDKit failed to parse SMILES.")
            
            # Compute properties
            mw = Descriptors.MolWt(mol)
            logp = Descriptors.MolLogP(mol)
            tpsa = Descriptors.TPSA(mol)
            
            # Morgan fingerprint
            fp = AllChem.GetMorganFingerprintAsBitVect(mol, 2, nBits=1024)
            fp_list = list(fp.ToBitString())
            
            return {
                "smiles": smiles,
                "molecular_weight": round(mw, 2),
                "logp": round(logp, 2),
                "psa": round(tpsa, 2),
                "morgan_fingerprint": "".join(fp_list)
            }
        except Exception as e:
            print(f"[Warning] RDKit runtime error on {smiles}: {e}. Falling back to analytical descriptor estimation.")
            
    # Mock / Analytical heuristic fallback
    # Count atoms using regex
    carbons = len(re.findall(r'C|c', smiles))
    oxygens = len(re.findall(r'O|o', smiles))
    nitrogens = len(re.findall(r'N|n', smiles))
    sulfurs = len(re.findall(r'S|s', smiles))
    halogens = len(re.findall(r'F|Cl|Br|I', smiles))
    
    # Approximate molecular weight
    approx_mw = carbons * 12 + oxygens * 16 + nitrogens * 14 + sulfurs * 32 + halogens * 35 + 20
    
    # Heuristic logP: logP goes up with carbon count and down with polar atoms (oxygen/nitrogen)
    approx_logp = carbons * 0.5 - (oxygens + nitrogens) * 0.4
    
    # Heuristic PSA: Oxygen adds ~14, Nitrogen adds ~12, Sulfur adds ~25
    approx_psa = oxygens * 14.1 + nitrogens * 12.0 + sulfurs * 25.3
    
    # Generate a deterministic pseudo-fingerprint from MD5 hash
    hasher = hashlib.md5(smiles.encode("utf-8"))
    binary_hash = bin(int(hasher.hexdigest(), 16))[2:].zfill(128)[:128]
    # expand to 1024 bits by repeating
    morgan_fp_mock = (binary_hash * 8)[:1024]
    
    return {
        "smiles": smiles,
        "molecular_weight": round(approx_mw, 2),
        "logp": round(approx_logp, 2),
        "psa": round(approx_psa, 2),
        "morgan_fingerprint": morgan_fp_mock
    }
