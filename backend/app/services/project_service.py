import uuid
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models import Project, User, Setting


def create_user(session: Session, email: str, name: Optional[str] = None, role: str = "researcher") -> User:
    user = session.query(User).filter(User.email == email).first()
    if user:
        return user
    user = User(id=str(uuid.uuid4()), email=email, name=name or email.split('@')[0], role=role)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def create_project(session: Session, owner_id: Optional[str] = None, data: Dict[str, Any] = None) -> Project:
    data = data or {}
    project = Project(
        id=str(uuid.uuid4()),
        owner_id=owner_id,
        name=data.get('name', 'EZX-Project'),
        fasta_sequence=data.get('fasta_sequence'),
        pdb_filename=data.get('pdb_filename'),
        pdb_content=data.get('pdb_content'),
        ligand_type=data.get('ligand_type', 'smiles'),
        ligand_smiles=data.get('ligand_smiles'),
        ligand_pdb_filename=data.get('ligand_pdb_filename'),
        ligand_pdb_content=data.get('ligand_pdb_content'),
        temperature=data.get('temperature', 298.15),
        ph=data.get('ph', 7.4),
        mutation=data.get('mutation')
    )
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


def update_project(session: Session, project_id: str, data: Dict[str, Any]) -> Optional[Project]:
    project = session.query(Project).filter(Project.id == project_id).first()
    if not project:
        return None
    for field in ['name', 'fasta_sequence', 'pdb_filename', 'pdb_content', 'ligand_type', 'ligand_smiles', 'ligand_pdb_filename', 'ligand_pdb_content', 'temperature', 'ph', 'mutation']:
        if field in data:
            setattr(project, field, data[field])
    session.commit()
    session.refresh(project)
    return project


def delete_project(session: Session, project_id: str) -> bool:
    project = session.query(Project).filter(Project.id == project_id).first()
    if not project:
        return False
    session.delete(project)
    session.commit()
    return True


def get_project(session: Session, project_id: str) -> Optional[Project]:
    return session.query(Project).filter(Project.id == project_id).first()


def list_projects(session: Session, query: Optional[str] = None, limit: int = 50, offset: int = 0):
    q = session.query(Project)
    if query:
        q_like = f"%{query}%"
        q = q.filter((Project.name.ilike(q_like)) | (Project.pdb_filename.ilike(q_like)))
    return q.order_by(Project.created_at.desc()).offset(offset).limit(limit).all()


def get_settings(session: Session, user_id: Optional[str] = None) -> Dict[str, Any]:
    setting = None
    if user_id:
        setting = session.query(Setting).filter(Setting.user_id == user_id).first()
    if not setting:
        setting = session.query(Setting).filter(Setting.user_id == None).first()
    if not setting:
        return {
            'theme': 'light',
            'visualization_quality': 'high',
            'export_format': 'pdf',
            'notifications': True
        }
    return {
        'theme': setting.theme,
        'visualization_quality': setting.visualization_quality,
        'export_format': setting.export_format,
        'notifications': setting.notifications
    }


def update_settings(session: Session, user_id: Optional[str], data: Dict[str, Any]):
    setting = None
    if user_id:
        setting = session.query(Setting).filter(Setting.user_id == user_id).first()
    if not setting:
        setting = session.query(Setting).filter(Setting.user_id == None).first()
    if not setting:
        setting = Setting(id=str(uuid.uuid4()), user_id=user_id)
        session.add(setting)
    for field in ['theme', 'visualization_quality', 'export_format', 'notifications']:
        if field in data:
            setattr(setting, field, data[field])
    session.commit()
    session.refresh(setting)
    return setting
