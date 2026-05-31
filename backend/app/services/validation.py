import re
from typing import Optional

FASTA_PATTERN = re.compile(r'^>?.*\n?[A-Za-z\n]+$', re.MULTILINE)
SMILES_PATTERN = re.compile(r'^[A-Za-z0-9@+\-\[\]\(\)=#$]+$')


def validate_fasta(sequence: str) -> bool:
    if not sequence or len(sequence.strip()) < 10:
        return False
    cleaned = sequence.strip()
    if cleaned.startswith('>'):
        cleaned = '\n'.join(cleaned.split('\n')[1:])
    cleaned = cleaned.replace('\n', '').replace(' ', '')
    return bool(re.fullmatch(r'[ACDEFGHIKLMNPQRSTVWY]+', cleaned.upper()))


def validate_smiles(smiles: str) -> bool:
    if not smiles or len(smiles.strip()) < 3:
        return False
    return bool(SMILES_PATTERN.fullmatch(smiles.strip()))


def validate_pdb_text(pdb_text: str) -> bool:
    if not pdb_text or 'ATOM' not in pdb_text and 'HETATM' not in pdb_text:
        return False
    return True
