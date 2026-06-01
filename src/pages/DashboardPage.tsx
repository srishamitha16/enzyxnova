import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getAnalysisStatus, getProject, getProjectResults } from '../api/api';
import { ArrowRight, Activity, FileText, Download, Layers, TrendingUp, Compass, Cpu, BarChart2 } from 'lucide-react';

const moduleList = [
  { key: 'delta-g', title: 'ΔG', description: 'Gibbs free energy evaluation.' },
  { key: 'delta-h', title: 'ΔH', description: 'Enthalpy change analysis.' },
  { key: 'active-site', title: 'Active Site', description: 'Identify catalytic residues.' },
  { key: 'mechanism', title: 'Catalytic Mechanism', description: 'Mechanism classification.' },
  { key: 'binding', title: 'Binding Affinity', description: 'Docking and affinity score.' },
  { key: 'substrate-specificity', title: 'Substrate Specificity', description: 'Substrate ranking model.' },
  { key: 'stability', title: 'Enzyme Stability', description: 'Thermal tolerance and fold stability.' },
  { key: 'mutation', title: 'Mutation Effects', description: 'Mutation impact predictions.' },
  { key: 'pathway', title: 'Reaction Pathway', description: 'Pathway feasibility and steps.' },
];

function DashboardPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState({ progress: 0, status: 'Loading project status...' });
  const [project, setProject] = useState<{ id: string; name?: string; created_at?: string } | null>(null);
  const [polling, setPolling] = useState(true);
  const [results, setResults] = useState<any | null>(null);
  const [loadingResults, setLoadingResults] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    getProject(projectId).then(setProject).catch(console.error);
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    let timer: number;

    const update = async () => {
      try {
        const next = await getAnalysisStatus(projectId);
        setStatus(next);

        // ✅ FIX: when completed → stop + navigate
        if (next.progress >= 100) {
          setPolling(false);

          setTimeout(() => {
            navigate(`/result/${projectId}`);
          }, 800);

          return;
        }
      } catch (err) {
        setStatus({ progress: 0, status: 'Unable to reach backend API.' });
        setPolling(false);
      }
    };

    update();

    if (polling) {
      timer = window.setInterval(update, 3000);
    }

    return () => window.clearInterval(timer);
  }, [projectId, polling, navigate]);

  useEffect(() => {
    if (!projectId || polling) return;

    setLoadingResults(true);
    getProjectResults(projectId)
      .then((data) => {
        setResults(data);
        setLoadingResults(false);
      })
      .catch((err) => {
        console.error("Failed to load results", err);
        setLoadingResults(false);
      });
  }, [projectId, polling]);

  const progress = useMemo(
    () => Math.min(100, Math.max(0, status.progress ?? 0)),
    [status.progress]
  );

  return (
    <main className="px-6 py-8 sm:px-10 lg:px-16">

      {/* HEADER */}
      <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sky-700/90">Prediction Dashboard</p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900">Module Results & Live Inference</h1>
        </div>

        <div className="flex flex-col gap-3 rounded-3xl border border-sky-200/80 bg-sky-50/90 p-6">
          <div className="flex justify-between text-sm">
            <span>Analysis Status</span>
            <span className="text-cyan-700">{status.status}</span>
          </div>

          <div className="h-3 rounded-full bg-sky-200">
            <div
              className="h-full rounded-full bg-cyan-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="text-right text-xs">{progress}% complete</div>
        </div>
      </div>

      {/* MODULE CARDS */}
      <div className="grid gap-6 xl:grid-cols-3">
        {moduleList.map((module) => (
          <motion.button
            key={module.key}
            whileHover={{ y: -4 }}
            onClick={() => navigate(`/result/${projectId}/${module.key}`)}
            className="rounded-3xl border bg-cyan-50/80 p-6 text-left"
          >
            <div className="flex justify-between">
              <span className="font-semibold">{module.title}</span>
              <ArrowRight />
            </div>
            <p className="mt-2 text-sm text-slate-600">{module.description}</p>
          </motion.button>
        ))}
      </div>

    </main>
  );
}

export default DashboardPage;
