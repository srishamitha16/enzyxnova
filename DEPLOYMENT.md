# EnzyXNova Deployment Guide

## Local Development

### Quick Start (One-Click)
1. Double-click `start_enzyxnova.bat`
2. The app will automatically open in your browser at `http://localhost:5173`

### Detailed Setup Steps
1. **Install Python** (3.8 or higher)
2. **Install Node.js** (16 or higher)
3. Double-click `start_enzyxnova.bat`
   - Virtual environment auto-creates
   - Backend auto-installs dependencies
   - Frontend auto-installs dependencies
   - Both servers start automatically
   - Browser opens at http://localhost:5173

### Manual Commands (if needed)
```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# Frontend
npm install
npm run dev
```

---

## Desktop App (Electron)

### Build Windows Executable

1. Double-click `build.bat`
2. Wait for build to complete
3. Executable will be in `dist-electron/` folder
4. Share the `.exe` file - no installation required!

### Advanced Build
```bash
npm install
npm run build          # Build frontend assets
npm run electron-build # Build Electron app with installer
```

---

## Production Deployment

### Option 1: Render (Backend) + Vercel (Frontend)

#### Backend Deployment (Render)

1. Push your code to GitHub
2. Go to [render.com](https://render.com)
3. Create new Web Service
4. Connect your GitHub repository
5. Configure:
   - **Name**: enzyxnova-backend
   - **Region**: Choose nearest
   - **Runtime**: Python 3.11
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000`
6. Set Environment Variables in Render dashboard:
   ```
   BACKEND_ALLOW_ORIGINS=https://enzyxnova.vercel.app,https://www.enzyxnova.vercel.app
   DATABASE_URL=sqlite:///./enzyxnova.db
   ENVIRONMENT=production
   ```
7. Deploy

#### Frontend Deployment (Vercel)

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Set Environment Variables:
   ```
   VITE_API_URL=https://your-enzyxnova-backend.onrender.com
   ```
5. Deploy

#### Update Frontend After Deployment
```bash
# Update .env.local or environment variables
VITE_API_URL=https://your-backend-url.onrender.com

# Rebuild and push
npm run build
git push
```

### Option 2: Docker Compose (All-in-One)

1. Ensure Docker is installed
2. Use the provided `docker-compose.yml`:
```bash
docker-compose up --build
```

Access at: `http://localhost`

---

## Environment Variables

### Frontend (.env or .env.local)
```
VITE_API_URL=https://your-backend-url
```

### Backend (.env)
```
# CORS
BACKEND_ALLOW_ORIGINS=https://your-frontend-url

# Database (uses SQLite by default)
DATABASE_URL=sqlite:///./enzyxnova.db

# Optional: PostgreSQL for production
DATABASE_URL=postgresql://user:password@host:5432/enzyxnova

# Optional: API Key
API_KEY=your-secret-key
API_KEY_HEADER_NAME=X-API-KEY

# Environment
ENVIRONMENT=production
```

---

## Distribution

### Windows Users
1. Download the `.exe` file from `dist-electron/`
2. Double-click to run
3. No installation, configuration, or terminal needed!

### Web Deployment
- **Backend**: Deploy to Render, Heroku, AWS, or your server
- **Frontend**: Deploy to Vercel, Netlify, or any static host
- Update `VITE_API_URL` to point to your backend

---

## Troubleshooting

### Backend won't start
```
Error: Python not found
→ Install Python 3.8+ and add to PATH

Error: Port 8000 in use
→ Kill the process: netstat -ano | findstr :8000
→ taskkill /PID <PID> /F
```

### Frontend won't start
```
Error: npm not found
→ Install Node.js 16+

Error: Port 5173 in use
→ Change port in vite.config.ts
→ Or kill the process on that port
```

### API calls failing in production
```
→ Check CORS settings in backend .env
→ Verify API_URL in frontend .env
→ Check network tab in browser DevTools
```

---

## Performance Tips

1. **Database**: Use PostgreSQL in production (not SQLite)
2. **Caching**: Enable Redis for task queue (optional)
3. **Frontend**: Enable CDN (Vercel/Netlify handles this)
4. **Backend**: Use uvicorn with multiple workers:
   ```
   gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker
   ```

---

## Support & Resources

- **Backend API Docs**: http://localhost:8000/docs (Swagger)
- **Frontend Dev**: http://localhost:5173
- **Electron Dev**: `npm run electron-dev`

---

**Last Updated**: 2024
