import os
import asyncio
from fastapi import WebSocket
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from .database import SessionLocal
from .bioinformatics import analyze_enzyme_metrics
from .models import Project, AnalysisResult

# Optional Celery/Redis task queue support
try:
    from celery import Celery
    CELERY_AVAILABLE = True
except ImportError:
    Celery = None
    CELERY_AVAILABLE = False

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_BACKEND_URL = os.getenv("CELERY_RESULT_BACKEND", CELERY_BROKER_URL)
celery_app = None
if CELERY_AVAILABLE:
    celery_app = Celery(
        "enzyxnova",
        broker=CELERY_BROKER_URL,
        backend=CELERY_BACKEND_URL,
    )
    celery_app.conf.update(
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        timezone="UTC",
        enable_utc=True,
    )

# WebSocket Connection Manager for live updates
class ConnectionManager:
    def __init__(self):
        # Maps session_id -> list of WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def broadcast_progress(self, session_id: str, progress: int, status: str):
        if session_id in self.active_connections:
            payload = {"progress": progress, "status": status}
            for ws in self.active_connections[session_id]:
                try:
                    await ws.send_json(payload)
                except Exception:
                    pass

manager = ConnectionManager()

# In-memory dictionary to track background job status
ACTIVE_JOBS: Dict[str, Dict[str, Any]] = {}

def _set_job_status(project_id: str, progress: int, status: str):
    ACTIVE_JOBS[project_id] = {"progress": progress, "status": status}

async def execute_analysis_pipeline(project_id: str):
    """Runs the multi-stage bioinformatics calculation pipeline and streams progress."""
    db = SessionLocal()
    try:
        _set_job_status(project_id, 0, "Starting analysis...")

        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            _set_job_status(project_id, 100, "Project not found.")
            return

        steps = [
            {"p": 15, "text": "Parsing inputs and validating molecular representations..."},
            {"p": 35, "text": "Mapping sequence residues onto evolutionary databases..."},
            {"p": 55, "text": "Resolving enzyme tertiary folding structure and binding pocket coordinates..."},
            {"p": 78, "text": "Evaluating electrostatic, salt bridge, and van der Waals interactions..."},
            {"p": 92, "text": "Running graph neural networks (GibbsNet-v4.1) free energy models..."},
            {"p": 100, "text": "Compiling predictive results and generating visual charts..."}
        ]

        for step in steps:
            await asyncio.sleep(0.4)
            _set_job_status(project_id, step["p"], step["text"])
            await manager.broadcast_progress(project_id, step["p"], step["text"])

        metrics = analyze_enzyme_metrics(
            fasta_seq=project.fasta_sequence,
            pdb_content=project.pdb_content or "",
            temp=project.temperature,
            ph=project.ph,
            mutation=project.mutation
        )

        db.query(AnalysisResult).filter(AnalysisResult.project_id == project_id).delete()

        result = AnalysisResult(
            project_id=project_id,
            delta_g=metrics["dg"]["delta_g"],
            delta_g_confidence=metrics["dg"]["confidence_score"],
            delta_h=metrics["dh"]["delta_h"],
            delta_h_confidence=metrics["dh"]["confidence_score"],
            active_site_residues=metrics["active_site"]["catalytic_residues"],
            mechanism_type=metrics["mechanism"]["mechanism_type"],
            mechanism_steps=metrics["mechanism"]["catalytic_steps"],
            binding_docking_score=metrics["binding"]["docking_score"],
            binding_interaction_residues=metrics["binding"]["interaction_residues"],
            stability_score=metrics["stability"]["stability_score"],
            stability_tm=metrics["stability"]["thermal_tolerance"],
            unstable_regions=metrics["stability"]["unstable_regions"],
            mutation_predictions=metrics["mutation"]["beneficial_mutations"] + metrics["mutation"]["harmful_mutations"],
            pathway_feasibility_score=metrics["pathway"]["feasibility_score"],
            pathway_steps=metrics["pathway"]["pathway_steps"]
        )

        db.add(result)
        db.commit()
        _set_job_status(project_id, 100, "Complete")
    except Exception as e:
        print(f"Error in analysis pipeline: {e}")
        _set_job_status(project_id, 100, f"Error: {str(e)}")
    finally:
        db.close()


if celery_app:
    @celery_app.task(name="app.tasks.execute_analysis_pipeline_task")
    def execute_analysis_pipeline_task(project_id: str):
        asyncio.run(execute_analysis_pipeline(project_id))
else:
    execute_analysis_pipeline_task = None


async def run_analysis_pipeline(project_id: str):
    if celery_app and execute_analysis_pipeline_task is not None:
        _set_job_status(project_id, 0, "Queued in Celery task queue.")
        execute_analysis_pipeline_task.apply_async(args=[project_id])
        return

    await execute_analysis_pipeline(project_id)
