import { AnimatePresence, motion } from 'framer-motion';
import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import ResultPage from './pages/ResultPage';
import DownloadPage from './pages/DownloadPage';

function App() {
  return (
    <div className="app-shell bg-white text-slate-900 min-h-screen">
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard/:projectId" element={<DashboardPage />} />
          <Route path="/result/:projectId/:module" element={<ResultPage />} />
          <Route path="/download/:projectId" element={<DownloadPage />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

export default App;
