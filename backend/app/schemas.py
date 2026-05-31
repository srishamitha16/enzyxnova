from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

# Project Schemas
class ProjectBase(BaseModel):
    fasta_sequence: Optional[str] = None
    pdb_filename: Optional[str] = None
    ligand_type: str = "smiles"
    ligand_smiles: Optional[str] = None
    ligand_pdb_filename: Optional[str] = None
    temperature: float = 298.15
    ph: float = 7.4
    mutation: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Modular Analysis Responses
class DeltaGResponse(BaseModel):
    delta_g: float
    confidence_score: float
    stability_interpretation: str
    thermodynamic_graphs: Dict[str, Any]
    residue_contributions: List[Dict[str, Any]]

class DeltaHResponse(BaseModel):
    delta_h: float
    reaction_type: str
    energy_map: Dict[str, Any]
    confidence_score: float
    catalytic_heat_interpretation: str

class ActiveSiteResponse(BaseModel):
    catalytic_residues: List[Dict[str, Any]]
    residue_confidence: Dict[str, float]
    pocket_coordinates: List[Dict[str, Any]]
    interaction_maps: Dict[str, Any]

class MechanismResponse(BaseModel):
    mechanism_type: str
    catalytic_steps: List[Dict[str, Any]]
    residue_roles: List[Dict[str, Any]]
    pathway_visualization: Dict[str, Any]
    confidence_score: float

class BindingResponse(BaseModel):
    docking_score: float
    binding_energy: float
    interaction_residues: List[str]
    docking_visualization: Dict[str, Any]

class SpecificityResponse(BaseModel):
    substrate_rankings: List[Dict[str, Any]]
    selectivity_index: float
    top_substrates: List[str]
    confidence_score: float

class StabilityResponse(BaseModel):
    stability_score: float
    thermal_tolerance: float
    unstable_regions: List[str]
    denaturation_probability: float

class MutationResponse(BaseModel):
    beneficial_mutations: List[Dict[str, Any]]
    harmful_mutations: List[Dict[str, Any]]
    activity_change: str
    stability_change: str

class PathwayResponse(BaseModel):
    pathway_steps: List[Dict[str, Any]]
    intermediates: List[str]
    feasibility_score: float
    pathway_diagram: Dict[str, Any]

# Combined Report Schemas
class ReportGenerateRequest(BaseModel):
    project_id: str
    selected_modules: List[str]

class ReportResponse(BaseModel):
    report_id: str
    download_url: str
    filename: str
