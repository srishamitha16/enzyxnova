import os
import joblib

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'trained_models')
MODEL_NAMES = {
    'delta_g': 'rf_delta_g.pkl',
    'delta_h': 'rf_delta_h.pkl',
    'delta_s': 'rf_delta_s.pkl',
    'stability': 'rf_stability.pkl',
    'binding': 'rf_binding.pkl'
}


def get_model_path(name: str) -> str:
    file_name = MODEL_NAMES.get(name)
    if not file_name:
        raise ValueError(f"Unknown model name: {name}")
    return os.path.join(MODEL_DIR, file_name)


def ensure_model_directory() -> None:
    os.makedirs(MODEL_DIR, exist_ok=True)


def save_model(name: str, model) -> str:
    ensure_model_directory()
    path = get_model_path(name)
    joblib.dump(model, path)
    return path


def load_model(name: str):
    path = get_model_path(name)
    if not os.path.exists(path):
        return None
    return joblib.load(path)


def get_model_paths() -> dict:
    ensure_model_directory()
    return {name: get_model_path(name) for name in MODEL_NAMES}
