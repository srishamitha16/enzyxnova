import datetime
from sqlalchemy import Column, String, Float, DateTime, Integer, ForeignKey, JSON, Text, Boolean
from sqlalchemy.orm import declarative_base, relationship
from app.database import engine

Base = declarative_base()

class Protein(Base):
    __tablename__ = "proteins"

    id = Column(String, primary_key=True, index=True) # UUID or UniProt ID
    uniprot_id = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, nullable=True)
    fasta_sequence = Column(Text, nullable=False)
    ec_number = Column(String, nullable=True)
    organism = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    structures = relationship("Structure", back_populates="protein", cascade="all, delete-orphan")
    thermodynamics = relationship("Thermodynamic", back_populates="protein", cascade="all, delete-orphan")
    active_sites = relationship("ActiveSite", back_populates="protein", cascade="all, delete-orphan")
    docking_results = relationship("DockingResult", back_populates="protein", cascade="all, delete-orphan")
    mechanisms = relationship("Mechanism", back_populates="protein", cascade="all, delete-orphan")
    mutations = relationship("Mutation", back_populates="protein", cascade="all, delete-orphan")
    reaction_pathways = relationship("ReactionPathway", back_populates="protein", cascade="all, delete-orphan")
    embedding = relationship("Embedding", back_populates="protein", uselist=False, cascade="all, delete-orphan")
    predictions = relationship("ModelPrediction", back_populates="protein", cascade="all, delete-orphan")


class Structure(Base):
    __tablename__ = "structures"

    id = Column(String, primary_key=True, index=True) # PDB ID or UUID
    protein_id = Column(String, ForeignKey("proteins.id", ondelete="CASCADE"), nullable=False)
    pdb_filename = Column(String, nullable=True)
    pdb_content = Column(Text, nullable=True)
    resolution = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationship
    protein = relationship("Protein", back_populates="structures")


class Thermodynamic(Base):
    __tablename__ = "thermodynamics"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    protein_id = Column(String, ForeignKey("proteins.id", ondelete="CASCADE"), nullable=False)
    delta_g = Column(Float, nullable=True)
    delta_h = Column(Float, nullable=True)
    delta_s = Column(Float, nullable=True)
    ph = Column(Float, nullable=True, default=7.4)
    temperature = Column(Float, nullable=True, default=298.15)
    experimental_source = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationship
    protein = relationship("Protein", back_populates="thermodynamics")


class ActiveSite(Base):
    __tablename__ = "active_sites"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    protein_id = Column(String, ForeignKey("proteins.id", ondelete="CASCADE"), nullable=False)
    residue_index = Column(Integer, nullable=False)
    residue_name = Column(String, nullable=False)
    exposure = Column(Float, nullable=True)
    pocket_centroid_distance = Column(Float, nullable=True)
    is_catalytic = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationship
    protein = relationship("Protein", back_populates="active_sites")


class Ligand(Base):
    __tablename__ = "ligands"

    id = Column(String, primary_key=True, index=True) # CID or SMILES hash or UUID
    smiles = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    molecular_weight = Column(Float, nullable=True)
    logp = Column(Float, nullable=True)
    psa = Column(Float, nullable=True)
    morgan_fingerprint = Column(Text, nullable=True) # Serialized Morgan fingerprint list/string
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    docking_results = relationship("DockingResult", back_populates="ligand", cascade="all, delete-orphan")


class DockingResult(Base):
    __tablename__ = "docking_results"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    protein_id = Column(String, ForeignKey("proteins.id", ondelete="CASCADE"), nullable=False)
    ligand_id = Column(String, ForeignKey("ligands.id", ondelete="CASCADE"), nullable=False)
    docking_score = Column(Float, nullable=True)
    conformation_index = Column(Integer, default=0)
    ligand_atom_contacts = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    protein = relationship("Protein", back_populates="docking_results")
    ligand = relationship("Ligand", back_populates="docking_results")


class Mechanism(Base):
    __tablename__ = "mechanisms"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    protein_id = Column(String, ForeignKey("proteins.id", ondelete="CASCADE"), nullable=False)
    classification = Column(String, nullable=True)
    steps = Column(JSON, nullable=True)
    energy_barrier = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationship
    protein = relationship("Protein", back_populates="mechanisms")


class Mutation(Base):
    __tablename__ = "mutations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    protein_id = Column(String, ForeignKey("proteins.id", ondelete="CASCADE"), nullable=False)
    mutant_sequence = Column(Text, nullable=False)
    mutation_code = Column(String, nullable=False)
    delta_delta_g = Column(Float, nullable=True)
    delta_tm = Column(Float, nullable=True)
    source_paper = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationship
    protein = relationship("Protein", back_populates="mutations")


class ReactionPathway(Base):
    __tablename__ = "reaction_pathways"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    protein_id = Column(String, ForeignKey("proteins.id", ondelete="CASCADE"), nullable=False)
    feasibility_score = Column(Float, nullable=True)
    intermediates = Column(JSON, nullable=True)
    thermodynamic_states = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationship
    protein = relationship("Protein", back_populates="reaction_pathways")


class Embedding(Base):
    __tablename__ = "embeddings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    protein_id = Column(String, ForeignKey("proteins.id", ondelete="CASCADE"), unique=True, nullable=False)
    embedding_type = Column(String, nullable=False) # "ESM-2", "ProtBERT", etc.
    vector = Column(JSON, nullable=False) # Stored float list
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationship
    protein = relationship("Protein", back_populates="embedding")


class ModelPrediction(Base):
    __tablename__ = "model_predictions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    protein_id = Column(String, ForeignKey("proteins.id", ondelete="CASCADE"), nullable=False)
    predicted_attribute = Column(String, nullable=False)
    predicted_value = Column(JSON, nullable=False)
    confidence_score = Column(Float, nullable=True)
    uncertainty_bounds = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationship
    protein = relationship("Protein", back_populates="predictions")


def create_all_tables():
    Base.metadata.create_all(bind=engine)
    print("All scientific databases and relation tables initialized successfully.")
