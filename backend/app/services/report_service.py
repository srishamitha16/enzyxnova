import os
import uuid
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models import Report, Project
from app.report import compile_pdf_report

REPORT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'reports')
os.makedirs(REPORT_DIR, exist_ok=True)


def create_report(session: Session, project_id: str, selected_modules: List[str]) -> Dict[str, Any]:
    project = session.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError('Project not found')

    report_id = str(uuid.uuid4())
    filename = f'EnzyXNova_Report_{project.id[:8]}_{report_id[:8]}.pdf'
    file_path = os.path.join(REPORT_DIR, filename)

    from app.services.analysis_service import get_analysis_results
    metrics = get_analysis_results(session, project_id)
    compile_pdf_report(file_path, project, metrics, selected_modules)

    report = Report(id=report_id, project_id=project.id, filename=filename, selected_modules=selected_modules)
    session.add(report)
    session.commit()
    session.refresh(report)

    return {
        'report_id': report_id,
        'download_url': f'/api/report/download/{report_id}',
        'filename': filename
    }


def delete_report(session: Session, report_id: str) -> bool:
    report = session.query(Report).filter(Report.id == report_id).first()
    if not report:
        return False
    file_path = os.path.join(REPORT_DIR, report.filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass
    session.delete(report)
    session.commit()
    return True
