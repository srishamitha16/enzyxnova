import os
import uuid
from fastapi import FastAPI, Depends, Header, UploadFile, File, Form, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from .database import engine, Base, get_db
from .models import Project, AnalysisResult, Report, User, Setting
from .schemas import (
    ProjectResponse,
    DeltaGResponse,
    DeltaHResponse,
    ActiveSiteResponse,
    MechanismResponse,
    BindingResponse,
    SpecificityResponse,
    StabilityResponse,
    MutationResponse,
    PathwayResponse,
    ReportGenerateRequest,
    ReportResponse
)
from .bioinformatics import parse_pdb_text, analyze_enzyme_metrics
from .ai import ensure_models_ready
from .tasks import manager, run_analysis_pipeline, ACTIVE_JOBS
from .services.project_service import create_project, update_project, delete_project as delete_project_record, get_project as get_project_record, list_projects
from .services.analysis_service import validate_analysis_inputs, get_analysis_results, get_module_metrics, get_analysis_status as lookup_analysis_status
from .services.report_service import create_report, delete_report as delete_report_record
from .services.settings_service import get_user_settings, update_user_settings
from .services.validation import validate_fasta, validate_pdb_text, validate_smiles

# Ensure core database tables are created
Base.metadata.create_all(bind=engine)

API_KEY = os.getenv("API_KEY")
API_KEY_HEADER = os.getenv("API_KEY_HEADER_NAME", "X-API-KEY")
allowed_origins_raw = os.getenv("BACKEND_ALLOW_ORIGINS", "*")
allow_origins = [origin.strip() for origin in allowed_origins_raw.split(",") if origin.strip()]
if not allow_origins:
    allow_origins = ["*"]


def verify_api_key(api_key: Optional[str] = Header(None, alias=API_KEY_HEADER)):
    if API_KEY and api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

app = FastAPI(
    title="EnzyXNova Backend API",
    version="1.0.0",
    dependencies=[Depends(verify_api_key)] if API_KEY else [],
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    # Ensure model artifacts are available when the API starts.
    ensure_models_ready()

# Root/Health check
@app.get("/")
def read_root():
    return {"status": "EnzyXNova API Running", "version": "1.0.0"}

# Request body helper for module analysis
class ModuleRequest(BaseModel):
    project_id: str

# 1. Upload Sequence
@app.post("/api/upload/protein-sequence")
def upload_protein_sequence(
    fasta_sequence: str = Form(...),
    project_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    if not project_id:
        project_id = str(uuid.uuid4())
        project = Project(id=project_id, fasta_sequence=fasta_sequence)
        db.add(project)
    else:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            project = Project(id=project_id, fasta_sequence=fasta_sequence)
            db.add(project)
        else:
            project.fasta_sequence = fasta_sequence

    db.commit()
    db.refresh(project)
    
    return {
        "project_id": project.id,
        "status": "success",
        "residue_count": len(fasta_sequence.replace(" ", "").replace("\n", "").replace("\r", ""))
    }

# 2. Upload Structure
@app.post("/api/upload/protein-structure")
async def upload_protein_structure(
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    content = await file.read()
    pdb_text = content.decode("utf-8", errors="ignore")
    
    # Parse PDB native metrics
    parsed = parse_pdb_text(pdb_text)
    
    if not project_id:
        project_id = str(uuid.uuid4())
        project = Project(
            id=project_id,
            pdb_filename=file.filename,
            pdb_content=pdb_text,
            fasta_sequence="".join([r["name"] for r in parsed["residues"]])
        )
        db.add(project)
    else:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            project = Project(
                id=project_id,
                pdb_filename=file.filename,
                pdb_content=pdb_text,
                fasta_sequence="".join([r["name"] for r in parsed["residues"]])
            )
            db.add(project)
        else:
            project.pdb_filename = file.filename
            project.pdb_content = pdb_text
            if not project.fasta_sequence:
                project.fasta_sequence = "".join([r["name"] for r in parsed["residues"]])

    if not file.filename.lower().endswith('.pdb'):
        raise HTTPException(status_code=422, detail="Uploaded protein structure must be a .pdb file")
    db.commit()
    db.refresh(project)
    
    return {
        "project_id": project.id,
        "filename": file.filename,
        "chains": parsed["chains"],
        "residue_count": parsed["residue_count"],
        "residues": parsed["residues"],
        "atoms": parsed["atoms"]
    }

# 2.5. Unified Upload File
@app.post("/api/upload/file")
async def upload_file(
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    import re
    content = await file.read()
    text = content.decode("utf-8", errors="ignore")
    filename = file.filename.lower()
    
    is_pdb = False
    sequence = ""
    
    # 1. PDB detection
    if filename.endswith(".pdb") or "ATOM  " in text or "HETATM" in text:
        is_pdb = True
    # 2. JSON detection
    elif filename.endswith(".json") or text.strip().startswith("{") or text.strip().startswith("["):
        try:
            import json as json_lib
            data = json_lib.loads(text)
            if isinstance(data, dict):
                sequence = data.get("sequence") or data.get("seq") or data.get("fasta_sequence") or ""
                if not sequence and ("pdb" in data or "pdb_content" in data):
                    text = data.get("pdb") or data.get("pdb_content") or ""
                    is_pdb = True
            elif isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
                sequence = data[0].get("sequence") or data[0].get("seq") or ""
        except Exception:
            pass
    # 3. CSV detection
    elif filename.endswith(".csv") or "," in text.split("\n")[0]:
        try:
            import csv
            lines = text.splitlines()
            reader = csv.reader(lines)
            header = [h.strip().lower() for h in next(reader)]
            seq_col_idx = -1
            for idx, h in enumerate(header):
                if h in ["sequence", "seq", "fasta", "amino_acids", "protein"]:
                    seq_col_idx = idx
                    break
            if seq_col_idx != -1:
                for row in reader:
                    if row and len(row) > seq_col_idx:
                        sequence = row[seq_col_idx].strip()
                        break
            else:
                # Fallback: check first column of first data row
                for row in reader:
                    if row:
                        sequence = row[0].strip()
                        break
        except Exception:
            pass
    # 4. FASTA detection
    elif text.strip().startswith(">"):
        lines = text.splitlines()
        seq_lines = [line.strip() for line in lines[1:] if not line.strip().startswith(">")]
        sequence = "".join(seq_lines)
    # 5. TXT detection
    else:
        sequence = text.strip()
        
    # Clean sequence of non-alphabet characters
    if not is_pdb:
        sequence = re.sub(r'[^A-Za-z]', '', sequence)
        
    if is_pdb:
        parsed = parse_pdb_text(text)
        if not project_id:
            project_id = str(uuid.uuid4())
            project = Project(
                id=project_id,
                pdb_filename=file.filename,
                pdb_content=text,
                fasta_sequence="".join([r["name"] for r in parsed["residues"]])
            )
            db.add(project)
        else:
            project = db.query(Project).filter(Project.id == project_id).first()
            if not project:
                project = Project(
                    id=project_id,
                    pdb_filename=file.filename,
                    pdb_content=text,
                    fasta_sequence="".join([r["name"] for r in parsed["residues"]])
                )
                db.add(project)
            else:
                project.pdb_filename = file.filename
                project.pdb_content = text
                project.fasta_sequence = "".join([r["name"] for r in parsed["residues"]])
        db.commit()
        db.refresh(project)
        return {
            "project_id": project.id,
            "type": "pdb",
            "filename": file.filename,
            "residue_count": parsed["residue_count"],
            "chains": parsed["chains"],
            "residues": parsed["residues"],
            "atoms": parsed["atoms"]
        }
    else:
        if not sequence:
            raise HTTPException(status_code=422, detail="Could not parse any valid sequence or structure from file")
        if not project_id:
            project_id = str(uuid.uuid4())
            project = Project(id=project_id, fasta_sequence=sequence)
            db.add(project)
        else:
            project = db.query(Project).filter(Project.id == project_id).first()
            if not project:
                project = Project(id=project_id, fasta_sequence=sequence)
                db.add(project)
            else:
                project.fasta_sequence = sequence
        db.commit()
        db.refresh(project)
        return {
            "project_id": project.id,
            "type": "sequence",
            "filename": file.filename,
            "residue_count": len(sequence)
        }


# 3. Upload Ligand
@app.post("/api/upload/ligand")
async def upload_ligand(
    ligand_type: str = Form(...),  # "smiles" or "pdb"
    ligand_smiles: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    project_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    if not project_id:
        project_id = str(uuid.uuid4())
        project = Project(id=project_id, ligand_type=ligand_type)
        db.add(project)
    else:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            project = Project(id=project_id, ligand_type=ligand_type)
            db.add(project)
        else:
            project.ligand_type = ligand_type
            
    if ligand_type == "smiles":
        if not ligand_smiles or not validate_smiles(ligand_smiles):
            raise HTTPException(status_code=422, detail="Invalid SMILES input")
        project.ligand_smiles = ligand_smiles
        project.ligand_pdb_filename = None
        project.ligand_pdb_content = None
    elif ligand_type == "pdb":
        if not file or not file.filename.lower().endswith('.pdb'):
            raise HTTPException(status_code=422, detail="Uploaded ligand must be a .pdb file")
        content = await file.read()
        project.ligand_pdb_filename = file.filename
        project.ligand_pdb_content = content.decode("utf-8", errors="ignore")
        project.ligand_smiles = None
        
    db.commit()
    db.refresh(project)
    
    return {
        "project_id": project.id,
        "status": "success"
    }

# 4. Start Analysis Pipeline
class StartAnalysisRequest(BaseModel):
    project_id: str
    temperature: float = 298.15
    ph: float = 7.4
    mutation: Optional[str] = None

@app.post("/api/analyze/start")
async def start_analysis(
    req: StartAnalysisRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not validate_analysis_inputs(project.fasta_sequence, project.pdb_content, project.ligand_smiles or project.ligand_pdb_content):
        raise HTTPException(status_code=422, detail="Project inputs are incomplete or invalid for analysis")
        
    # Update project parameters
    project.temperature = req.temperature
    project.ph = req.ph
    project.mutation = req.mutation
    db.commit()
    
    # Trigger async background pipeline
    background_tasks.add_task(run_analysis_pipeline, req.project_id)
    
    return {
        "project_id": req.project_id,
        "session_id": req.project_id,
        "status": "started",
        "redirect_url": f"#/dashboard/{req.project_id}"
    }

# 5. Get Pipeline Status
@app.get("/api/analyze/status/{project_id}")
def get_analysis_status(project_id: str):
    if project_id not in ACTIVE_JOBS:
        return {"progress": 100, "status": "Not active or completed."}
    return ACTIVE_JOBS[project_id]

# 6. WebSocket for real-time progress stream
@app.websocket("/ws/analysis/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str):
    await manager.connect(project_id, websocket)
    try:
        # Send initial status
        initial_status = ACTIVE_JOBS.get(project_id, {"progress": 0, "status": "Initializing socket..."})
        await websocket.send_json(initial_status)
        
        # Keep connection open
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(project_id, websocket)

# 7. Helper: Run calculations dynamically or load from Cache
def get_calculated_metrics(project_id: str, db: Session) -> Dict[str, Any]:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    return analyze_enzyme_metrics(
        fasta_seq=project.fasta_sequence or "",
        pdb_content=project.pdb_content or "",
        temp=project.temperature,
        ph=project.ph,
        mutation=project.mutation
    )

# 8. Modular Route Integrations
@app.post("/api/analyze/delta-g", response_model=DeltaGResponse)
def get_delta_g(req: ModuleRequest, db: Session = Depends(get_db)):
    metrics = get_calculated_metrics(req.project_id, db)
    return metrics["dg"]

@app.post("/api/analyze/delta-h", response_model=DeltaHResponse)
def get_delta_h(req: ModuleRequest, db: Session = Depends(get_db)):
    metrics = get_calculated_metrics(req.project_id, db)
    return metrics["dh"]

@app.post("/api/analyze/active-site", response_model=ActiveSiteResponse)
def get_active_site(req: ModuleRequest, db: Session = Depends(get_db)):
    metrics = get_calculated_metrics(req.project_id, db)
    return metrics["active_site"]

@app.post("/api/analyze/mechanism", response_model=MechanismResponse)
def get_mechanism(req: ModuleRequest, db: Session = Depends(get_db)):
    metrics = get_calculated_metrics(req.project_id, db)
    return metrics["mechanism"]

@app.post("/api/analyze/binding", response_model=BindingResponse)
def get_binding(req: ModuleRequest, db: Session = Depends(get_db)):
    metrics = get_calculated_metrics(req.project_id, db)
    return metrics["binding"]

@app.post("/api/analyze/substrate-specificity", response_model=SpecificityResponse)
def get_substrate_specificity(req: ModuleRequest, db: Session = Depends(get_db)):
    metrics = get_calculated_metrics(req.project_id, db)
    return metrics["specificity"]

@app.post("/api/analyze/stability", response_model=StabilityResponse)
def get_stability(req: ModuleRequest, db: Session = Depends(get_db)):
    metrics = get_calculated_metrics(req.project_id, db)
    return metrics["stability"]

@app.post("/api/analyze/mutation", response_model=MutationResponse)
def get_mutation_analysis(req: ModuleRequest, db: Session = Depends(get_db)):
    metrics = get_calculated_metrics(req.project_id, db)
    return metrics["mutation"]

@app.post("/api/analyze/pathway", response_model=PathwayResponse)
def get_reaction_pathway(req: ModuleRequest, db: Session = Depends(get_db)):
    metrics = get_calculated_metrics(req.project_id, db)
    return metrics["pathway"]

# Alias prediction routes for public API compatibility
@app.post("/predict/delta-g", response_model=DeltaGResponse)
def predict_delta_g(req: ModuleRequest, db: Session = Depends(get_db)):
    return get_delta_g(req, db)

@app.post("/predict/delta-h", response_model=DeltaHResponse)
def predict_delta_h(req: ModuleRequest, db: Session = Depends(get_db)):
    return get_delta_h(req, db)

@app.post("/predict/active-site", response_model=ActiveSiteResponse)
def predict_active_site(req: ModuleRequest, db: Session = Depends(get_db)):
    return get_active_site(req, db)

@app.post("/predict/mechanism", response_model=MechanismResponse)
def predict_mechanism(req: ModuleRequest, db: Session = Depends(get_db)):
    return get_mechanism(req, db)

@app.post("/predict/binding-affinity", response_model=BindingResponse)
def predict_binding(req: ModuleRequest, db: Session = Depends(get_db)):
    return get_binding(req, db)

@app.post("/predict/substrate", response_model=SpecificityResponse)
def predict_substrate(req: ModuleRequest, db: Session = Depends(get_db)):
    return get_substrate_specificity(req, db)

@app.post("/predict/stability", response_model=StabilityResponse)
def predict_stability(req: ModuleRequest, db: Session = Depends(get_db)):
    return get_stability(req, db)

@app.post("/predict/mutation", response_model=MutationResponse)
def predict_mutation(req: ModuleRequest, db: Session = Depends(get_db)):
    return get_mutation_analysis(req, db)

@app.post("/predict/pathway", response_model=PathwayResponse)
def predict_pathway(req: ModuleRequest, db: Session = Depends(get_db)):
    return get_reaction_pathway(req, db)

@app.post("/api/predict/delta-g", response_model=DeltaGResponse)
def api_predict_delta_g(req: ModuleRequest, db: Session = Depends(get_db)):
    return get_delta_g(req, db)

@app.post("/api/predict/delta-h", response_model=DeltaHResponse)
def api_predict_delta_h(req: ModuleRequest, db: Session = Depends(get_db)):
    return get_delta_h(req, db)

@app.post("/api/predict/active-site", response_model=ActiveSiteResponse)
def api_predict_active_site(req: ModuleRequest, db: Session = Depends(get_db)):
    return get_active_site(req, db)

@app.post("/api/predict/mechanism", response_model=MechanismResponse)
def api_predict_mechanism(req: ModuleRequest, db: Session = Depends(get_db)):
    return get_mechanism(req, db)

@app.post("/api/predict/binding-affinity", response_model=BindingResponse)
def api_predict_binding(req: ModuleRequest, db: Session = Depends(get_db)):
    return get_binding(req, db)

@app.post("/api/predict/substrate", response_model=SpecificityResponse)
def api_predict_substrate(req: ModuleRequest, db: Session = Depends(get_db)):
    return get_substrate_specificity(req, db)

@app.post("/api/predict/stability", response_model=StabilityResponse)
def api_predict_stability(req: ModuleRequest, db: Session = Depends(get_db)):
    return get_stability(req, db)

@app.post("/api/predict/mutation", response_model=MutationResponse)
def api_predict_mutation(req: ModuleRequest, db: Session = Depends(get_db)):
    return get_mutation_analysis(req, db)

@app.post("/api/predict/pathway", response_model=PathwayResponse)
def api_predict_pathway(req: ModuleRequest, db: Session = Depends(get_db)):
    return get_reaction_pathway(req, db)

@app.post("/upload/fasta")
def upload_fasta(
    fasta_sequence: str = Form(...),
    project_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    return upload_protein_sequence(fasta_sequence=fasta_sequence, project_id=project_id, db=db)

@app.post("/upload/pdb")
async def upload_pdb(
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    return await upload_protein_structure(file=file, project_id=project_id, db=db)

@app.post("/generate/report", response_model=ReportResponse)
def generate_report_alias(req: ReportGenerateRequest, db: Session = Depends(get_db)):
    return generate_report(req, db)

# 9. PDF Report Generation & Serving
# Create report directory if missing
REPORT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "reports")
os.makedirs(REPORT_DIR, exist_ok=True)

@app.post("/api/report/generate", response_model=ReportResponse)
def generate_report(req: ReportGenerateRequest, db: Session = Depends(get_db)):
    # Verify project exists
    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    report_id = str(uuid.uuid4())
    filename = f"EnzyXNova_Report_{project.id[:8]}_{report_id[:8]}.pdf"
    file_path = os.path.join(REPORT_DIR, filename)
    
    # Import report compiler dynamically to avoid circular references
    from .report import compile_pdf_report
    
    metrics = get_calculated_metrics(req.project_id, db)
    compile_pdf_report(file_path, project, metrics, req.selected_modules)
    
    # Register report in DB
    report = Report(
        id=report_id,
        project_id=project.id,
        filename=filename,
        selected_modules=req.selected_modules
    )
    db.add(report)
    db.commit()
    
    # Dynamic download URL
    download_url = f"/api/report/download/{report_id}"
    
    return ReportResponse(
        report_id=report_id,
        download_url=download_url,
        filename=filename
    )

@app.get("/api/report/download/{report_id}")
def download_report(report_id: str, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    file_path = os.path.join(REPORT_DIR, report.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF file not found on disk")
        
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=report.filename
    )


# --- Project Management Endpoints
@app.get("/api/projects")
def list_projects(q: Optional[str] = None, status: Optional[str] = None, limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    query = db.query(Project)
    if q:
        q_like = f"%{q}%"
        query = query.filter((Project.name.ilike(q_like)) | (Project.pdb_filename.ilike(q_like)))
    # status filter placeholder - projects don't have explicit status column; infer from results
    projects = query.order_by(Project.created_at.desc()).offset(offset).limit(limit).all()

    out = []
    for p in projects:
        analyses_count = db.query(AnalysisResult).filter(AnalysisResult.project_id == p.id).count()
        last_modified = p.created_at
        # find latest analysis timestamp
        last_result = db.query(AnalysisResult).filter(AnalysisResult.project_id == p.id).order_by(AnalysisResult.created_at.desc()).first()
        if last_result:
            last_modified = last_result.created_at

        status_label = 'Draft'
        if analyses_count > 0:
            status_label = 'Completed'

        out.append({
            'id': p.id,
            'name': p.name or f"Project-{p.id[:8]}",
            'protein_name': None,
            'organism': None,
            'created_at': p.created_at.isoformat(),
            'last_modified': last_modified.isoformat() if last_modified else None,
            'status': status_label,
            'analyses_completed': analyses_count,
        })

    return {'projects': out, 'count': len(out)}


@app.get("/api/projects/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    # Build response
    analyses = db.query(AnalysisResult).filter(AnalysisResult.project_id == project.id).order_by(AnalysisResult.created_at.desc()).all()
    reports = db.query(Report).filter(Report.project_id == project.id).all()
    return {
        'id': project.id,
        'name': project.name,
        'fasta_sequence': project.fasta_sequence,
        'pdb_filename': project.pdb_filename,
        'created_at': project.created_at.isoformat(),
        'analyses': [a.id for a in analyses],
        'reports': [r.id for r in reports]
    }


@app.get("/api/projects/{project_id}/results")
def get_project_results(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    try:
        metrics = get_calculated_metrics(project_id, db)
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.post('/api/projects/create')
def create_project_route(data: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    project = create_project(db, owner_id=None, data=data)
    return {'status': 'created', 'project_id': project.id}


@app.put('/api/projects/update/{project_id}')
def update_project_route(project_id: str, data: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    project = update_project(db, project_id, data)
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    return {'status': 'updated', 'project_id': project.id}


@app.get('/api/settings')
def get_settings(user_id: Optional[str] = None, db: Session = Depends(get_db)):
    return get_user_settings(db, user_id)


@app.put('/api/settings/update')
def update_settings(user_id: Optional[str] = None, data: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    return update_user_settings(db, data, user_id)


@app.get('/api/history')
def history_list(project_id: Optional[str] = None, limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    return list_analyses(project_id=project_id, limit=limit, offset=offset, db=db)


@app.get('/api/history/{analysis_id}')
def get_history_item(analysis_id: int, db: Session = Depends(get_db)):
    analysis = db.query(AnalysisResult).filter(AnalysisResult.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail='Analysis not found')
    return {
        'id': analysis.id,
        'project_id': analysis.project_id,
        'created_at': analysis.created_at.isoformat(),
        'status': 'Completed',
        'confidence_score': max(filter(None, [analysis.delta_g_confidence or 0, analysis.delta_h_confidence or 0]), default=0),
        'details': {
            'delta_g': analysis.delta_g,
            'delta_h': analysis.delta_h,
            'stability_score': analysis.stability_score
        }
    }


@app.delete('/api/history/delete/{analysis_id}')
def delete_history_item(analysis_id: int, db: Session = Depends(get_db)):
    analysis = db.query(AnalysisResult).filter(AnalysisResult.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail='Analysis not found')
    db.delete(analysis)
    db.commit()
    return {'status': 'deleted', 'analysis_id': analysis_id}


@app.delete('/api/report/delete/{report_id}')
def delete_report_route(report_id: str, db: Session = Depends(get_db)):
    if not delete_report_record(db, report_id):
        raise HTTPException(status_code=404, detail='Report not found')
    return {'status': 'deleted', 'report_id': report_id}


@app.delete("/api/projects/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    db.delete(project)
    db.commit()
    return {'status': 'deleted', 'project_id': project_id}


@app.post("/api/projects/{project_id}/duplicate")
def duplicate_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    new_id = str(uuid.uuid4())
    new_proj = Project(
        id=new_id,
        name=(project.name + " (copy)"),
        fasta_sequence=project.fasta_sequence,
        pdb_filename=project.pdb_filename,
        pdb_content=project.pdb_content,
        ligand_type=project.ligand_type,
        ligand_smiles=project.ligand_smiles,
        ligand_pdb_filename=project.ligand_pdb_filename,
        ligand_pdb_content=project.ligand_pdb_content,
        temperature=project.temperature,
        ph=project.ph,
        mutation=project.mutation
    )
    db.add(new_proj)
    db.commit()
    return {'status': 'duplicated', 'new_project_id': new_id}


# --- Analysis History Endpoints
@app.get("/api/analyses")
def list_analyses(project_id: Optional[str] = None, analysis_type: Optional[str] = None, limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    q = db.query(AnalysisResult)
    if project_id:
        q = q.filter(AnalysisResult.project_id == project_id)
    total = q.count()
    items = q.order_by(AnalysisResult.created_at.desc()).offset(offset).limit(limit).all()
    out = []
    for a in items:
        out.append({
            'id': a.id,
            'project_id': a.project_id,
            'created_at': a.created_at.isoformat(),
            'status': 'Completed',
            'runtime': None,
            'confidence_score': max(filter(None, [a.delta_g_confidence or 0, a.delta_h_confidence or 0]), default=0)
        })
    return {'count': total, 'analyses': out}


# --- Reports listing & export endpoints
@app.get("/api/reports")
def list_reports(project_id: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Report)
    if project_id:
        q = q.filter(Report.project_id == project_id)
    items = q.order_by(Report.created_at.desc()).all()
    out = []
    for r in items:
        out.append({
            'id': r.id,
            'project_id': r.project_id,
            'filename': r.filename,
            'selected_modules': r.selected_modules,
            'created_at': r.created_at.isoformat()
        })
    return {'reports': out}


@app.post('/api/report/export/csv')
def export_report_csv(req: ReportGenerateRequest, db: Session = Depends(get_db)):
    # For simplicity, return CSV text as file response
    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    metrics = get_calculated_metrics(req.project_id, db)
    # Flatten selected modules into CSV rows (very simple)
    csv_lines = ['module,metric,value']
    for module in req.selected_modules:
        if module in metrics:
            mod = metrics[module]
            for k, v in mod.items():
                csv_lines.append(f"{module},{k},{v}")
    csv_content = '\n'.join(csv_lines)
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(content=csv_content, media_type='text/csv')


@app.post('/api/report/export/json')
def export_report_json(req: ReportGenerateRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    metrics = get_calculated_metrics(req.project_id, db)
    selected = {m: metrics.get(m) for m in req.selected_modules}
    return selected
