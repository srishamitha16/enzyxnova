import os
import json
import hashlib
import random
import math
from sqlalchemy.orm import Session
from app.ai_engine.database_setup import Embedding

try:
    import torch
    from transformers import AutoTokenizer, AutoModel
    import numpy as np
    TORCH_TRANSFORMERS_AVAILABLE = True
except ImportError:
    TORCH_TRANSFORMERS_AVAILABLE = False

# Global cache for the loaded tokenizer and model
_tokenizer = None
_model = None

def load_esm2_model(model_name: str = "facebook/esm2_t6_8M_UR50D"):
    """
    Loads and caches tokenizer and ESM-2 model.
    """
    global _tokenizer, _model
    if not TORCH_TRANSFORMERS_AVAILABLE:
        raise ImportError("PyTorch and/or HuggingFace Transformers not installed in environment.")
    
    if _tokenizer is None or _model is None:
        print(f"[Info] Loading ESM-2 model checkpoint: {model_name}...")
        _tokenizer = AutoTokenizer.from_pretrained(model_name)
        _model = AutoModel.from_pretrained(model_name)
        
        # Use GPU if available
        device = "cuda" if torch.cuda.is_available() else "cpu"
        _model = _model.to(device)
        _model.eval()
        print(f"[Info] ESM-2 loaded successfully on device: {device}")
    
    return _tokenizer, _model

def generate_pseudo_embeddings(sequence: str, dimension: int = 320) -> dict:
    """
    Generates a deterministic, biologically inspired pseudo-embedding vector 
    when PyTorch/Transformers are unavailable, in pure Python.
    """
    # Deterministic seed based on the sequence
    seq_bytes = sequence.encode("utf-8")
    seed_int = int(hashlib.md5(seq_bytes).hexdigest(), 16) % (2**32)
    
    # 1. Generate mean embedding
    # Calculate amino acid composition vector
    aa_chars = "ACDEFGHIKLMNPQRSTVWY"
    composition = [0.0] * dimension
    
    for i, aa in enumerate(aa_chars):
        freq = sequence.count(aa) / len(sequence) if sequence else 0.0
        # Spread the frequency across the dimensions
        idx_start = i * (dimension // 20)
        idx_end = (i + 1) * (dimension // 20)
        for j in range(idx_start, idx_end):
            composition[j] = freq
            
    # Inject deterministic noise using the sequence seed
    prng = random.Random(seed_int)
    mean_vector = []
    for val in composition:
        noise = prng.normalvariate(0.0, 0.05)
        mean_vector.append(val + noise)
        
    # L2 normalize
    sq_sum = sum(v * v for v in mean_vector)
    norm = math.sqrt(sq_sum)
    if norm > 0:
        mean_vector = [v / norm for v in mean_vector]
        
    # 2. Generate per-residue embeddings
    # Each residue gets a standard vector based on its character type, plus position-specific noise
    aa_base_vectors = {}
    for aa in aa_chars:
        # deterministic vector per AA
        aa_hash = hashlib.md5(aa.encode("utf-8")).digest()
        aa_seed = int.from_bytes(aa_hash, "big") % (2**32)
        aa_prng = random.Random(aa_seed)
        aa_base_vectors[aa] = [aa_prng.normalvariate(0.1, 0.2) for _ in range(dimension)]
        
    per_residue = []
    for idx, aa in enumerate(sequence):
        base = aa_base_vectors.get(aa, [0.0] * dimension)
        # add position-based noise
        pos_seed = (seed_int + idx) % (2**32)
        pos_prng = random.Random(pos_seed)
        res_vec = []
        for v in base:
            noise = pos_prng.normalvariate(0.0, 0.02)
            res_vec.append(v + noise)
        res_norm = math.sqrt(sum(x*x for x in res_vec))
        if res_norm > 0:
            res_vec = [x / res_norm for x in res_vec]
        per_residue.append(res_vec)

    return {
        "mean_embedding": mean_vector,
        "per_residue_embeddings": per_residue,
        "embedding_type": f"Pseudo-ESM-2-{dimension}d"
    }

def get_esm2_embeddings(sequence: str, uniprot_id: str = None, db: Session = None, model_name: str = "facebook/esm2_t6_8M_UR50D") -> dict:
    """
    Retrieves ESM-2 embeddings for a sequence.
    Utilizes SQL database caching if a session and uniprot_id are supplied.
    """
    if not sequence:
        return {"mean_embedding": [], "per_residue_embeddings": [], "embedding_type": "None"}
        
    embedding_type = "ESM-2" if TORCH_TRANSFORMERS_AVAILABLE else "Pseudo-ESM-2"
    
    # 1. Check cache database if session is provided
    if db and uniprot_id:
        cached = db.query(Embedding).filter(
            Embedding.protein_id == uniprot_id,
            Embedding.embedding_type.like(f"{embedding_type}%")
        ).first()
        if cached:
            try:
                vectors = json.loads(cached.vector)
                return {
                    "mean_embedding": vectors["mean_embedding"],
                    "per_residue_embeddings": vectors["per_residue_embeddings"],
                    "embedding_type": cached.embedding_type
                }
            except Exception as e:
                print(f"[Warning] Failed parsing cached embedding for {uniprot_id}: {e}")
                
    # 2. Extract embedding using live model or fallback
    results = None
    if TORCH_TRANSFORMERS_AVAILABLE:
        try:
            tokenizer, model = load_esm2_model(model_name)
            device = next(model.parameters()).device
            
            # Prepare input
            inputs = tokenizer(sequence, return_tensors="pt", padding=True, truncation=True)
            inputs = {k: v.to(device) for k, v in inputs.items()}
            
            with torch.no_grad():
                outputs = model(**inputs)
                
            # Get last hidden state
            token_representations = outputs.last_hidden_state  # shape: [batch, seq_len, hidden_dim]
            
            # Compute mean representation (excluding special tokens)
            attention_mask = inputs["attention_mask"]
            seq_len = attention_mask.sum().item()
            
            # Slice actual sequence tokens, ignore BOS and EOS if tokenizer inserts them
            residue_vectors = token_representations[0, 1:seq_len-1, :].cpu().numpy()
            mean_vector = residue_vectors.mean(axis=0)
            
            results = {
                "mean_embedding": mean_vector.tolist(),
                "per_residue_embeddings": residue_vectors.tolist(),
                "embedding_type": embedding_type
            }
        except Exception as e:
            print(f"[Warning] ESM-2 live extraction failed: {e}. Falling back to pseudo-embeddings.")
            
    if results is None:
        # Fallback to pseudo embeddings
        dimension = 1280 if "650M" in model_name else 320
        results = generate_pseudo_embeddings(sequence, dimension=dimension)

    # 3. Store in database cache if session is provided
    if db and uniprot_id:
        try:
            # check if an entry exists to update or insert
            entry = db.query(Embedding).filter(Embedding.protein_id == uniprot_id).first()
            vector_data = json.dumps({
                "mean_embedding": results["mean_embedding"],
                "per_residue_embeddings": results["per_residue_embeddings"]
            })
            if entry:
                entry.embedding_type = results["embedding_type"]
                entry.vector = vector_data
            else:
                entry = Embedding(
                    protein_id=uniprot_id,
                    embedding_type=results["embedding_type"],
                    vector=vector_data
                )
                db.add(entry)
            db.commit()
        except Exception as e:
            print(f"[Warning] Failed caching embedding to database: {e}")
            db.rollback()
            
    return results
