# EnzyXNova

AI-Powered Enzyme Intelligence Platform - Enzyme thermodynamics, catalytic mechanism prediction, and analysis.

🎯 **One-Click Startup** | 🖥️ **Desktop App** | ☁️ **Cloud Deployment** | 🚀 **Production Ready**

---

## ⚡ Quick Start (One-Click)

### Windows Users - Double-Click to Start

1. **Double-click** `start_enzyxnova.bat`
2. Wait for servers to initialize (~10 seconds)
3. Browser automatically opens at `http://localhost:5173`
4. Done! ✅

That's it! No terminal, no commands, no configuration needed.

---

## 🖥️ Desktop Application

### Build Windows Executable

1. **Double-click** `build.bat`
2. Wait for build to complete (~5 minutes)
3. Executable is created in `dist-electron/` folder
4. Share the `.exe` file - runs on any Windows computer!

### Run Desktop App
- Double-click the generated `.exe` file
- App runs standalone (no dependencies needed)
- Backend and frontend integrated

---

## 🛠️ Manual Setup

### Prerequisites
- Python 3.8+ ([Download](https://www.python.org))
- Node.js 16+ ([Download](https://nodejs.org))

### Development Setup

#### Option 1: Automated (Windows)
```bash
start_enzyxnova.bat
```

#### Option 2: Manual
```bash
# Terminal 1: Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# Terminal 2: Frontend
npm install
npm run dev
```

### Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 🚀 Production Deployment

### Cloud Deployment (Vercel + Render)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions:
- Backend → Render
- Frontend → Vercel
- Environment configuration
- CORS setup
- API URL routing

### Docker Deployment

```bash
docker-compose up --build
```

Access at: http://localhost

---

## 📦 Project Structure

```
enzyxnova/
├── start_enzyxnova.bat         # One-click startup
├── build.bat                    # Build desktop app
├── src/                         # Frontend (React + TypeScript)
│   ├── components/
│   ├── pages/
│   │   ├── HomePage.tsx        # Main UI (modals & buttons)
│   │   ├── DashboardPage.tsx
│   │   ├── ResultPage.tsx
│   │   └── DownloadPage.tsx
│   ├── api/
│   │   └── api.ts
│   ├── config/
│   │   └── api.config.ts       # API configuration
│   └── main.tsx
├── backend/                     # Backend (FastAPI + Python)
│   ├── app/
│   │   ├── main.py            # API routes
│   │   ├── models.py
│   │   ├── database.py
│   │   └── ...
│   └── requirements.txt
├── package.json                 # Frontend dependencies
├── vite.config.ts              # Frontend build config
├── tailwind.config.js          # Styling
├── DEPLOYMENT.md               # Deployment guide
└── README.md



---

## ✨ Features

### 🧬 Core Functionality
- **Protein Analysis**: Upload FASTA sequences and PDB structures
- **ΔG Analysis**: Gibbs free energy thermodynamics
- **ΔH Analysis**: Enthalpy calculations
- **Active Site**: Catalytic residue identification
- **Mechanism**: Catalytic mechanism prediction
- **Binding Affinity**: Ligand binding analysis
- **Specificity**: Substrate specificity prediction
- **Stability**: Thermal stability analysis
- **Mutations**: Mutation impact assessment
- **Pathways**: Metabolic pathway analysis

### 🎨 User Interface
- ✅ Clean white/teal/cyan color theme
- ✅ Interactive modal popups for all modules
- ✅ Editable contact form (localStorage)
- ✅ Professional glassmorphic design
- ✅ Smooth animations & transitions
- ✅ Responsive on all devices
- ✅ Dark mode ready

### 🔧 Technical Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Backend**: FastAPI, SQLAlchemy, Uvicorn
- **Desktop**: Electron (Windows executable)
- **Database**: SQLite (dev), PostgreSQL (production)
- **Styling**: Tailwind CSS with custom CSS variables

---

## 🎯 Build & Distribution

### Windows Users
1. **Development**: Double-click `start_enzyxnova.bat` → Auto-runs everything
2. **Desktop App**: Double-click `build.bat` → Generates `.exe` executable
3. **Production**: Deploy to Render (backend) + Vercel (frontend)

### For Distribution
```bash
# Build desktop app
build.bat

# Share the .exe file from dist-electron/
# Users just need to double-click to run
```

---

## 🌐 API Endpoints

### Module Analysis
- `POST /api/upload/protein-sequence` - Upload protein sequence
- `POST /api/upload/protein-structure` - Upload PDB structure
- `POST /api/upload/ligand` - Upload ligand file
- `POST /api/analysis/start` - Start analysis
- `GET /api/analysis/status` - Check status
- `GET /api/analysis/results` - Get results

### Modules
- `GET /api/modules/delta-g` - ΔG analysis
- `GET /api/modules/delta-h` - ΔH analysis
- `GET /api/modules/active-site` - Active site analysis
- `GET /api/modules/mechanism` - Mechanism prediction
- `GET /api/modules/binding` - Binding affinity
- `GET /api/modules/specificity` - Specificity prediction
- `GET /api/modules/stability` - Stability analysis
- `GET /api/modules/mutation` - Mutation analysis
- `GET /api/modules/pathway` - Pathway analysis

### Reports
- `POST /api/reports/generate` - Generate PDF report
- `GET /api/reports/download` - Download report

Full API documentation available at: http://localhost:8000/docs

---

## 🔑 Environment Variables

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:8000
```

### Backend (.env.local)
```
BACKEND_ALLOW_ORIGINS=*
DATABASE_URL=sqlite:///./enzyxnova.db
ENVIRONMENT=development
```

For production, see [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Backend port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Frontend port 5173
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Python Not Found
```bash
# Install Python 3.8+ from python.org
# Add to PATH during installation
# Restart terminal
```

### npm Packages Not Installing
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and package-lock.json
rm -r node_modules package-lock.json

# Reinstall
npm install
```

### Backend Connection Error
- Check if backend is running at http://localhost:8000
- Check browser DevTools Network tab
- Verify CORS settings in .env

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🤝 Support

- **Backend Docs**: http://localhost:8000/docs
- **Frontend Dev**: http://localhost:5173
- **Electron Dev**: `npm run electron-dev`
- **Report Issues**: Open an issue on GitHub

---

**Built with ❤️ for enzyme research and biocatalysis**


- `POST /predict/delta-g`
- `POST /predict/delta-h`
- `POST /predict/active-site`
- `POST /predict/mechanism`
- `POST /predict/binding-affinity`
- `POST /predict/substrate`
- `POST /predict/stability`
- `POST /predict/mutation`
- `POST /predict/pathway`

## Environment variables

Use `.env` to configure your deployment environment.

- `BACKEND_ALLOW_ORIGINS` — allowed frontend origins
- `DATABASE_URL` — Postgres database URL
- `API_KEY` — optional API key for protected access
- `API_KEY_HEADER_NAME` — header name used to pass the API key
- `CELERY_BROKER_URL` — Redis broker URL
- `CELERY_RESULT_BACKEND` — Redis result backend URL
- `ENVIRONMENT` — set to `production` in deployed environments
- `VITE_API_BASE_URL` — frontend API base URL

## Public website flow

The frontend is designed to work as a public website where the user provides enzyme inputs, uploads PDB/SMILES data, and receives module-specific predictions with report export support.

---

## Notes

This repository scaffolds a hosting-ready full-stack platform. To complete public deployment, connect the frontend to a static site host (Vercel/Netlify) and deploy the backend to Render/Railway/AWS/Google Cloud with a managed PostgreSQL database.
