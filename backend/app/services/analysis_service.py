import asyncio
from typing import Dict, Optional
from sqlalchemy.orm import Session
from app.bioinformatics import analyze_enzyme_metrics
from app.models import Project, AnalysisResult
from app.tasks import run_analysis_pipeline, ACTIVE_JOBS
from app.services.validation import validate_fasta, validate_pdb_text, validate_smiles


def validate_analysis_inputs(fasta_sequence: Optional[str], pdb_content: Optional[str], smiles: Optional[str]) -> bool:
    if fasta_sequence and validate_fasta(fasta_sequence):
        return True
    if pdb_content and validate_pdb_text(pdb_content):
        return True
    if smiles and validate_smiles(smiles):
        return True
    return False


def start_analysis(session: Session, project_id: str, temperature: float = 298.15, ph: float = 7.4, mutation: Optional[str] = None) -> Dict[str, str]:
    project = session.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError('Project not found')

    if not validate_analysis_inputs(project.fasta_sequence, project.pdb_content, project.ligand_smiles or project.ligand_pdb_content):
        raise ValueError('Insufficient project inputs for analysis')

    project.temperature = temperature
    project.ph = ph
    project.mutation = mutation
    session.commit()

    asyncio.create_task(run_analysis_pipeline(project_id))
    return {
        'project_id': project_id,
        'session_id': project_id,
        'status': 'started',
        'redirect_url': f'/#/dashboard/{project_id}'
    }


def get_analysis_status(project_id: str):
    return ACTIVE_JOBS.get(project_id, {'progress': 100, 'status': 'Not active or completed.'})


def get_analysis_results(session: Session, project_id: str) -> Dict[str, any]:
    project = session.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError('Project not found')
    return analyze_enzyme_metrics(
        fasta_seq=project.fasta_sequence or '',
        pdb_content=project.pdb_content or '',
        temp=project.temperature,
        ph=project.ph,
        mutation=project.mutation
    )


def get_module_metrics(session: Session, project_id: str, module: str) -> Dict:
    metrics = get_analysis_results(session, project_id)
    module_map = {
        'delta-g': 'dg',
        'delta-h': 'dh',
        'active-site': 'active_site',
        'mechanism': 'mechanism',
        'binding': 'binding',
        'substrate-specificity': 'specificity',
        'stability': 'stability',
        'mutation': 'mutation',
        'pathway': 'pathway'
    }
    key = module_map.get(module, module)
    return metrics.get(key, {})
