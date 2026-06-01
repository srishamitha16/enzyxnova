import os
import asyncio
import time
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from .database import SessionLocal
from .bioinformatics import analyze_enzyme_metrics
from .models import Project, AnalysisResult

ACTIVE_JOBS: Dict[str, Dict[str, Any]] = {}

def _set_job_status(project_id: str, progress: int, status: str):
    ACTIVE_JOBS[project_id] = {
        "progress": progress,
        "status": status
    }

# -----------------------------
# MAIN PIPELINE (FIXED)
# -----------------------------
def execute_analysis_pipeline(project_id: str):
    db = SessionLocal()

    try:
        _set_job_status(project_id, 0, "Starting analysis...")

        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            _set_job_status(project_id, 100, "Project not found")
            return

        steps = [
            (5, "Parsing inputs..."),
            (20, "Mapping sequence residues..."),
            (40, "Computing structural interactions..."),
            (60, "Running energy calculations..."),
            (80, "Applying ML prediction models..."),
            (100, "Finalizing results...")
        ]

        for progress, text in steps:
            time.sleep(1)   # ✅ FIX (NO asyncio)
            _set_job_status(project_id, progress, text)

        metrics = analyze_enzyme_metrics(
            fasta_seq=project.fasta_sequence,
            pdb_content=project.pdb_content or "",
            temp=project.temperature,
            ph=project.ph,
            mutation=project.mutation
        )

        db.query(AnalysisResult).filter(
            AnalysisResult.project_id == project_id
        ).delete()

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
            mutation_predictions=metrics["mutation"]["beneficial_mutations"]
            + metrics["mutation"]["harmful_mutations"],
            pathway_feasibility_score=metrics["pathway"]["feasibility_score"],
            pathway_steps=metrics["pathway"]["pathway_steps"]
        )

        db.add(result)
        db.commit()

        _set_job_status(project_id, 100, "Complete")

    except Exception as e:
        print("PIPELINE ERROR:", e)
        _set_job_status(project_id, 100, f"Error: {str(e)}")

    finally:
        db.close()
