import os
from typing import Tuple
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

DATASET_PATH = os.path.join(os.path.dirname(__file__), '..', 'datasets', 'thermodynamics', 'thermodynamics_dataset.csv')

NUMERIC_COLUMNS = [
    'sequence_length',
    'molecular_weight_kDa',
    'pH',
    'temperature_C',
    'hydrophobicity_index',
    'isoelectric_point',
    'pocket_volume_A3',
]

CATEGORICAL_COLUMNS = [
    'ec_number',
    'mutation',
    'substrate',
    'cofactor',
    'ligand_name',
    'stability_class',
    'organism',
    'enzyme_name',
]

TARGET_COLUMNS = ['deltaG_kcal_mol', 'deltaH_kcal_mol', 'deltaS_cal_molK', 'stability_score', 'binding_affinity_kcal_mol']


def load_thermo_dataset(path: str = None) -> pd.DataFrame:
    path = path or DATASET_PATH
    return pd.read_csv(path)


def build_preprocessing_pipeline() -> Pipeline:
    numeric_transformer = Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])

    categorical_transformer = Pipeline([
        ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
        ('encoder', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
    ])

    return ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, NUMERIC_COLUMNS),
            ('cat', categorical_transformer, CATEGORICAL_COLUMNS)
        ],
        remainder='drop'
    )


def prepare_training_data(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, Pipeline]:
    df = df.copy()
    df[NUMERIC_COLUMNS] = df[NUMERIC_COLUMNS].fillna(df[NUMERIC_COLUMNS].median())
    df[CATEGORICAL_COLUMNS] = df[CATEGORICAL_COLUMNS].fillna('missing')
    preprocessor = build_preprocessing_pipeline()
    features = preprocessor.fit_transform(df)
    targets = df[TARGET_COLUMNS].copy()
    return features, targets, preprocessor
