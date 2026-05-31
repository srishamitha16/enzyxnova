import os
import json
import math
import random

# Attempt to import PyTorch
try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


# ==========================================
# 1. PYTORCH MODEL DEFINITIONS (IF INSTALLED)
# ==========================================

if TORCH_AVAILABLE:
    class PyTorchThermodynamicsDNN(nn.Module):
        """
        PyTorch Deep Neural Network to predict ΔG and ΔH from protein sequence embeddings.
        """
        def __init__(self, input_dim: int = 320, hidden_dim: int = 128):
            super().__init__()
            self.net = nn.Sequential(
                nn.Linear(input_dim, hidden_dim),
                nn.ReLU(),
                nn.Dropout(0.2),
                nn.Linear(hidden_dim, hidden_dim // 2),
                nn.ReLU(),
                nn.Linear(hidden_dim // 2, 2) # Outputs: [delta_g, delta_h]
            )

        def forward(self, x):
            return self.net(x)

    class PyTorchActiveSiteGNN(nn.Module):
        """
        Simple Graph Neural Network for residue classification (Active Site pocket vs normal).
        Avoids torch_geometric by doing manual graph convolution using adjacency tensors.
        """
        def __init__(self, feature_dim: int = 320, hidden_dim: int = 64):
            super().__init__()
            self.w1 = nn.Linear(feature_dim, hidden_dim)
            self.w2 = nn.Linear(hidden_dim, 32)
            self.classifier = nn.Linear(32, 1) # Probability of being catalytic

        def forward(self, x, adj):
            # x shape: [num_residues, feature_dim]
            # adj shape: [num_residues, num_residues] (normalized adjacency matrix)
            h1 = F.relu(self.w1(torch.matmul(adj, x)))
            h2 = F.relu(self.w2(torch.matmul(adj, h1)))
            out = torch.sigmoid(self.classifier(h2))
            return out.squeeze(-1)

    class PyTorchMechanismTransformer(nn.Module):
        """
        Transformer Classifier for EC Catalytic Mechanism prediction.
        """
        def __init__(self, embed_dim: int = 320, num_heads: int = 4, num_classes: int = 6):
            super().__init__()
            self.transformer_layer = nn.TransformerEncoderLayer(
                d_model=embed_dim, nhead=num_heads, dim_feedforward=embed_dim*2, batch_first=True
            )
            self.transformer_encoder = nn.TransformerEncoder(self.transformer_layer, num_layers=2)
            self.fc = nn.Linear(embed_dim, num_classes)

        def forward(self, x):
            # x shape: [batch, seq_len, embed_dim]
            out = self.transformer_encoder(x)
            # Pool across sequence dimension
            pooled = out.mean(dim=1)
            logits = self.fc(pooled)
            return logits

    class PyTorchMutationRegressor(nn.Module):
        """
        Multi-task model to predict stability shifts (ΔΔG) and Tm changes.
        """
        def __init__(self, input_dim: int = 320, hidden_dim: int = 128):
            super().__init__()
            self.shared = nn.Sequential(
                nn.Linear(input_dim, hidden_dim),
                nn.ReLU(),
                nn.Linear(hidden_dim, hidden_dim // 2),
                nn.ReLU()
            )
            self.head_ddg = nn.Linear(hidden_dim // 2, 1)
            self.head_dtm = nn.Linear(hidden_dim // 2, 1)

        def forward(self, x):
            shared_out = self.shared(x)
            ddg = self.head_ddg(shared_out)
            dtm = self.head_dtm(shared_out)
            return ddg.squeeze(-1), dtm.squeeze(-1)


# ==========================================
# 2. PURE PYTHON FALLBACK MODELS (DEPENDENCY-FREE)
# ==========================================

class FallbackMLP:
    """
    Pure Python Multi-Layer Perceptron for regression and classification.
    Can be trained and serialized to/from JSON.
    """
    def __init__(self, input_dim: int = 320, hidden_dim: int = 64, output_dim: int = 2):
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.output_dim = output_dim
        
        # Initialize weights deterministically
        prng = random.Random(42)
        # Layer 1
        self.w1 = [[prng.normalvariate(0.0, 0.05) for _ in range(hidden_dim)] for _ in range(input_dim)]
        self.b1 = [0.0] * hidden_dim
        # Layer 2
        self.w2 = [[prng.normalvariate(0.0, 0.05) for _ in range(output_dim)] for _ in range(hidden_dim)]
        self.b2 = [0.0] * output_dim

    def forward(self, x: list) -> list:
        # x is a list of floats (size input_dim)
        # Hidden layer: h = ReLU(x * w1 + b1)
        h = [0.0] * self.hidden_dim
        for j in range(self.hidden_dim):
            val = sum(x[i] * self.w1[i][j] for i in range(self.input_dim)) + self.b1[j]
            h[j] = max(0.0, val) # ReLU
            
        # Output layer: out = h * w2 + b2
        out = [0.0] * self.output_dim
        for j in range(self.output_dim):
            out[j] = sum(h[i] * self.w2[i][j] for i in range(self.hidden_dim)) + self.b2[j]
        return out

    def save(self, filepath: str):
        data = {
            "input_dim": self.input_dim,
            "hidden_dim": self.hidden_dim,
            "output_dim": self.output_dim,
            "w1": self.w1,
            "b1": self.b1,
            "w2": self.w2,
            "b2": self.b2
        }
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w") as f:
            json.dump(data, f)

    def load(self, filepath: str):
        with open(filepath, "r") as f:
            data = json.load(f)
        self.input_dim = data["input_dim"]
        self.hidden_dim = data["hidden_dim"]
        self.output_dim = data["output_dim"]
        self.w1 = data["w1"]
        self.b1 = data["b1"]
        self.w2 = data["w2"]
        self.b2 = data["b2"]


class FallbackGCN:
    """
    Pure Python Graph Convolution Network for active site classification.
    """
    def __init__(self, feature_dim: int = 320, hidden_dim: int = 32):
        self.feature_dim = feature_dim
        self.hidden_dim = hidden_dim
        
        prng = random.Random(42)
        self.w = [[prng.normalvariate(0.0, 0.05) for _ in range(hidden_dim)] for _ in range(feature_dim)]
        self.b = [0.0] * hidden_dim
        self.classifier = [prng.normalvariate(0.0, 0.05) for _ in range(hidden_dim)]
        self.cb = 0.0

    def forward(self, features: list, adj: list) -> list:
        # features is a list of lists: [num_nodes, feature_dim]
        # adj is list of lists: [num_nodes, num_nodes] (normalized adjacency matrix)
        num_nodes = len(features)
        
        # 1. Message passing: H = adj * features
        msg = [[0.0] * self.feature_dim for _ in range(num_nodes)]
        for i in range(num_nodes):
            for j in range(self.feature_dim):
                msg[i][j] = sum(adj[i][k] * features[k][j] for k in range(num_nodes))
                
        # 2. Linear projection + ReLU: H' = ReLU(H * W + B)
        h_prime = [[0.0] * self.hidden_dim for _ in range(num_nodes)]
        for i in range(num_nodes):
            for j in range(self.hidden_dim):
                val = sum(msg[i][k] * self.w[k][j] for k in range(self.feature_dim)) + self.b[j]
                h_prime[i][j] = max(0.0, val)
                
        # 3. Classify node: Out = Sigmoid(H' * classifier + cb)
        outputs = []
        for i in range(num_nodes):
            val = sum(h_prime[i][j] * self.classifier[j] for j in range(self.hidden_dim)) + self.cb
            # Sigmoid
            prob = 1.0 / (1.0 + math.exp(-max(-10.0, min(10.0, val))))
            outputs.append(prob)
        return outputs

    def save(self, filepath: str):
        data = {
            "feature_dim": self.feature_dim,
            "hidden_dim": self.hidden_dim,
            "w": self.w,
            "b": self.b,
            "classifier": self.classifier,
            "cb": self.cb
        }
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w") as f:
            json.dump(data, f)

    def load(self, filepath: str):
        with open(filepath, "r") as f:
            data = json.load(f)
        self.feature_dim = data["feature_dim"]
        self.hidden_dim = data["hidden_dim"]
        self.w = data["w"]
        self.b = data["b"]
        self.classifier = data["classifier"]
        self.cb = data["cb"]
