import os
import json
import warnings
from typing import Dict
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from .preprocess import load_thermo_dataset, build_preprocessing_pipeline, TARGET_COLUMNS, NUMERIC_COLUMNS, CATEGORICAL_COLUMNS
from .feature_extractor import build_sequence_features
from .model_loader import save_model, ensure_model_directory, MODEL_NAMES

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'trained_models')


def _prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df['ligand_name'] = df['ligand_name'].fillna('missing').astype(str)
    df[CATEGORICAL_COLUMNS] = df[CATEGORICAL_COLUMNS].fillna('missing')
    df[NUMERIC_COLUMNS] = df[NUMERIC_COLUMNS].fillna(df[NUMERIC_COLUMNS].median())
    return df


def _mock_sequence_features(df: pd.DataFrame) -> pd.DataFrame:
    if 'sequence_length' not in df.columns:
        df['sequence_length'] = df.get('sequence_length', df['sequence_length'] if 'sequence_length' in df else 300)
    if 'molecular_weight_kDa' not in df.columns:
        df['molecular_weight_kDa'] = df['sequence_length'] * 0.11
    return df


def train_all_models() -> Dict[str, object]:
    ensure_model_directory()
    df = load_thermo_dataset()
    if df.empty:
        raise RuntimeError('Thermodynamics dataset is empty. Unable to train models.')

    df = _prepare_features(df)
    df = _mock_sequence_features(df)

    preprocessor = build_preprocessing_pipeline()
    X = preprocessor.fit_transform(df)
    y = df[TARGET_COLUMNS].copy()

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.33, random_state=42)

    results = {}
    target_mapping = {
        'deltaG_kcal_mol': 'delta_g',
        'deltaH_kcal_mol': 'delta_h',
        'deltaS_cal_molK': 'delta_s',
        'stability_score': 'stability',
        'binding_affinity_kcal_mol': 'binding'
    }

    for target in TARGET_COLUMNS:
        model = RandomForestRegressor(n_estimators=50, random_state=42)
        model.fit(X_train, y_train[target])

        pred_train = model.predict(X_train)
        pred_test = model.predict(X_test)

        import math
        metrics = {
            'mae_train': float(mean_absolute_error(y_train[target], pred_train)),
            'rmse_train': float(math.sqrt(mean_squared_error(y_train[target], pred_train))),
            'mae_test': float(mean_absolute_error(y_test[target], pred_test)),
            'rmse_test': float(math.sqrt(mean_squared_error(y_test[target], pred_test))),
        }

        save_model_name = target_mapping.get(target, target)
        save_model(save_model_name, model)
        results[save_model_name] = metrics

    metrics_path = os.path.join(MODEL_DIR, 'training_metrics.json')
    with open(metrics_path, 'w', encoding='utf-8') as handle:
        json.dump(results, handle, indent=2)

    return results


def run_training_if_missing() -> Dict[str, object]:
    models_missing = [name for name in MODEL_NAMES if not os.path.exists(os.path.join(MODEL_DIR, MODEL_NAMES[name]))]
    if models_missing:
        return train_all_models()
    return {'status': 'models already present'}


if __name__ == '__main__':
    warnings.filterwarnings('ignore')
    print('Starting EnzyXNova training pipeline...')
    metrics = train_all_models()
    print('Training metrics:')
    print(metrics)
