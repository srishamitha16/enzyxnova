import math
from typing import Dict

# Residue weights from average amino acid masses and hydrophobicity indices
AMINO_ACID_MASSES = {
    'A': 89.09, 'C': 121.16, 'D': 133.10, 'E': 147.13, 'F': 165.19,
    'G': 75.07, 'H': 155.16, 'I': 131.18, 'K': 146.19, 'L': 131.18,
    'M': 149.21, 'N': 132.12, 'P': 115.13, 'Q': 146.15, 'R': 174.20,
    'S': 105.09, 'T': 119.12, 'V': 117.15, 'W': 204.23, 'Y': 181.19,
}

HYDROPHOBICITY = {
    'A': 1.8, 'C': 2.5, 'D': -3.5, 'E': -3.5, 'F': 2.8,
    'G': -0.4, 'H': -3.2, 'I': 4.5, 'K': -3.9, 'L': 3.8,
    'M': 1.9, 'N': -3.5, 'P': -1.6, 'Q': -3.5, 'R': -4.5,
    'S': -0.8, 'T': -0.7, 'V': 4.2, 'W': -0.9, 'Y': -1.3,
}

CHARGE = {
    'D': -1, 'E': -1, 'H': 0.1, 'K': 1, 'R': 1,
}


def calculate_molecular_weight(sequence: str) -> float:
    weight = 0.0
    for aa in sequence.upper():
        weight += AMINO_ACID_MASSES.get(aa, 110.0)
    return round(weight / 1000.0, 2)


def calculate_hydrophobicity(sequence: str) -> float:
    if not sequence:
        return 0.0
    score = sum(HYDROPHOBICITY.get(aa, 0.0) for aa in sequence.upper())
    return round(score / max(1, len(sequence)), 2)


def calculate_isoelectric_point(sequence: str) -> float:
    if not sequence:
        return 6.8
    charge = sum(CHARGE.get(aa, 0.0) for aa in sequence.upper())
    pI = 7.0 + charge * 0.3
    return round(max(3.5, min(11.0, pI)), 2)


def calculate_secondary_structure_estimate(sequence: str) -> Dict[str, float]:
    if not sequence:
        return {'alpha': 0.35, 'beta': 0.20, 'coil': 0.45}
    length = len(sequence)
    alpha = min(0.5, 0.2 + sequence.upper().count('A') * 0.005)
    beta = min(0.4, 0.15 + sequence.upper().count('V') * 0.003)
    coil = max(0.2, 1.0 - alpha - beta)
    return {'alpha': round(alpha, 2), 'beta': round(beta, 2), 'coil': round(coil, 2)}


def build_sequence_features(sequence: str, temperature_C: float = 37.0, ph: float = 7.4, ligand_smiles: str = None) -> Dict[str, float]:
    sequence = sequence or ''
    features = {
        'sequence_length': len(sequence),
        'molecular_weight_kDa': calculate_molecular_weight(sequence),
        'hydrophobicity_index': calculate_hydrophobicity(sequence),
        'isoelectric_point': calculate_isoelectric_point(sequence),
        'pH': ph,
        'temperature_C': temperature_C,
        'pocket_volume_A3': round(max(120.0, len(sequence) * 1.2), 1),
    }
    if ligand_smiles:
        features['ligand_name'] = ligand_smiles[:64]
    else:
        features['ligand_name'] = 'None'
    return features
