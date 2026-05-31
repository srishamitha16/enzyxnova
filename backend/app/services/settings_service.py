import uuid
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models import Setting


def get_user_settings(session: Session, user_id: Optional[str] = None) -> Dict[str, Any]:
    query = session.query(Setting)
    if user_id:
        setting = query.filter(Setting.user_id == user_id).first()
    else:
        setting = query.filter(Setting.user_id == None).first()
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


def update_user_settings(session: Session, data: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
    query = session.query(Setting)
    setting = query.filter(Setting.user_id == user_id).first() if user_id else query.filter(Setting.user_id == None).first()
    if not setting:
        setting = Setting(id=str(uuid.uuid4()), user_id=user_id)
        session.add(setting)
    for key in ['theme', 'visualization_quality', 'export_format', 'notifications']:
        if key in data:
            setattr(setting, key, data[key])
    session.commit()
    session.refresh(setting)
    return {
        'theme': setting.theme,
        'visualization_quality': setting.visualization_quality,
        'export_format': setting.export_format,
        'notifications': setting.notifications
    }
