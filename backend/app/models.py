import datetime
from sqlalchemy import Column, String, Float, DateTime, Integer, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from .database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, index=True) # UUID string
    owner_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name = Column(String, index=True, default="EZX-Project")
    
    # Inputs
    fasta_sequence = Column(Text, nullable=True)
    pdb_filename = Column(String, nullable=True)
    pdb_content = Column(Text, nullable=True) # Stored PDB text
    
    ligand_type = Column(String, default="smiles") # smiles or pdb
    ligand_smiles = Column(String, nullable=True)
    ligand_pdb_filename = Column(String, nullable=True)
    ligand_pdb_content = Column(Text, nullable=True)
    
    temperature = Column(Float, default=298.15)
    ph = Column(Float, default=7.4)
    mutation = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    owner = relationship("User", back_populates="projects")
    results = relationship("AnalysisResult", back_populates="project", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="project", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, nullable=False, default="researcher")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")


class ProteinSequence(Base):
    __tablename__ = "protein_sequences"

    id = Column(String, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    sequence = Column(Text, nullable=False)
    source = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class ProteinStructure(Base):
    __tablename__ = "protein_structures"

    id = Column(String, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    pdb_filename = Column(String, nullable=True)
    pdb_content = Column(Text, nullable=True)
    resolution = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Ligand(Base):
    __tablename__ = "ligands"

    id = Column(String, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    ligand_type = Column(String, nullable=False, default="smiles")
    smiles = Column(String, nullable=True)
    pdb_filename = Column(String, nullable=True)
    pdb_content = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Thermodynamic(Base):
    __tablename__ = "thermodynamics"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    delta_g = Column(Float, nullable=True)
    delta_h = Column(Float, nullable=True)
    delta_s = Column(Float, nullable=True)
    ph = Column(Float, nullable=True, default=7.4)
    temperature = Column(Float, nullable=True, default=298.15)
    source = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class ActiveSite(Base):
    __tablename__ = "active_sites"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    residue_index = Column(Integer, nullable=False)
    residue_name = Column(String, nullable=False)
    exposure = Column(Float, nullable=True)
    pocket_centroid_distance = Column(Float, nullable=True)
    is_catalytic = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Mechanism(Base):
    __tablename__ = "mechanisms"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    classification = Column(String, nullable=True)
    steps = Column(JSON, nullable=True)
    energy_barrier = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class DockingResult(Base):
    __tablename__ = "docking_results"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    docking_score = Column(Float, nullable=True)
    binding_energy = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Mutation(Base):
    __tablename__ = "mutations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    mutation_code = Column(String, nullable=False)
    delta_delta_g = Column(Float, nullable=True)
    stability_effect = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Setting(Base):
    __tablename__ = "settings"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    theme = Column(String, nullable=False, default="light")
    visualization_quality = Column(String, nullable=False, default="high")
    export_format = Column(String, nullable=False, default="pdf")
    notifications = Column(String, nullable=False, default="true")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    # Thermodynamics
    delta_g = Column(Float, nullable=True)
    delta_g_confidence = Column(Float, nullable=True)
    
    delta_h = Column(Float, nullable=True)
    delta_h_confidence = Column(Float, nullable=True)
    
    # Active Site & Mechanism
    active_site_residues = Column(JSON, nullable=True)  # List of dicts (residue, position, confidence)
    mechanism_type = Column(String, nullable=True)
    mechanism_steps = Column(JSON, nullable=True)       # List of strings/dicts
    
    # Docking & Affinity
    binding_docking_score = Column(Float, nullable=True)
    binding_interaction_residues = Column(JSON, nullable=True)
    
    # Folding & Stability
    stability_score = Column(Float, nullable=True)
    stability_tm = Column(Float, nullable=True)
    unstable_regions = Column(JSON, nullable=True)
    
    # Mutations
    mutation_predictions = Column(JSON, nullable=True)  # List of mutation predictions
    
    # Pathway
    pathway_feasibility_score = Column(Float, nullable=True)
    pathway_steps = Column(JSON, nullable=True)         # List of steps
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationship
    project = relationship("Project", back_populates="results")


class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, index=True) # UUID of report
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String, nullable=False)
    selected_modules = Column(JSON, nullable=False)   # List of compiled modules
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationship
    project = relationship("Project", back_populates="reports")
