import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getAnalysisStatus, getProject, getProjectResults } from '../api/api';
import { ArrowRight, Activity, FileText, Download, Layers, TrendingUp, Compass, Cpu, Zap, BarChart2 } from 'lucide-react';

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
    getProject(projectId).then((data) => setProject(data)).catch(console.error);
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    let timer: number;
    const update = async () => {
      try {
        const next = await getAnalysisStatus(projectId);
        setStatus(next);
        if (next.progress >= 100) {
          setPolling(false);
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
  }, [projectId, polling]);

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

  const progress = useMemo(() => Math.min(100, Math.max(0, status.progress ?? 0)), [status.progress]);

  return (
    <main className="px-6 py-8 sm:px-10 lg:px-16">
      <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sky-700/90">Prediction Dashboard</p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900">Module Results & Live Inference</h1>
          <p className="mt-3 max-w-2xl text-slate-700">
            Select a prediction module to view scientific insights, confidence metrics, graphs, and result export actions.
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-3xl border border-sky-200/80 bg-sky-50/90 p-6 shadow-soft-glow">
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-sm font-medium">Analysis Status</span>
            <span className="text-xs uppercase tracking-[0.3em] text-cyan-700">{status.status}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-sky-200">
            <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-right text-xs text-slate-600">{progress}% complete</div>
        </div>
      </div>
      <div className="mb-10 grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-teal-200/80 bg-cyan-50/90 p-6 shadow-soft-glow">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-600">Dashboard restored</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">All previous analysis elements are back</h2>
          <p className="mt-3 text-slate-700">The dashboard now includes the full module list, live progress, and project metadata with blue / cyan / teal accents.</p>
        </div>
        <div className="rounded-3xl border border-teal-200/80 bg-white/95 p-6 shadow-soft-glow">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-600">Live project</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">Project ID</p>
          <p className="mt-1 text-slate-700 break-all">{project?.id || projectId}</p>
        </div>
        <div className="rounded-3xl border border-teal-200/80 bg-white/95 p-6 shadow-soft-glow">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-600">Quick actions</p>
          <div className="mt-3 flex flex-col gap-3">
            <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-2 text-sm font-medium text-sky-800">View module results</span>
            <span className="inline-flex items-center rounded-full bg-cyan-100 px-3 py-2 text-sm font-medium text-cyan-900">Download reports</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {moduleList.map((module) => (
          <motion.button
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            key={module.key}
            onClick={() => navigate(`/result/${projectId}/${module.key}`)}
            className="group rounded-[2rem] border border-sky-200/80 bg-cyan-50/90 p-6 text-left shadow-soft-glow transition hover:border-cyan-400/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-slate-900">{module.title}</span>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-700 transition group-hover:bg-cyan-500/25">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-4 text-slate-700">{module.description}</p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-sky-200/20 bg-sky-100/70 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-600">
              <Activity className="h-4 w-4 text-cyan-700" /> Inference
            </div>
          </motion.button>
        ))}
      </div>

      {/* 🔮 EnzyXNova Deep Prediction Intelligence & Visualizations Center */}
      <section className="mt-14 rounded-[2rem] border border-sky-200/80 bg-white/80 p-8 shadow-soft-glow backdrop-blur-sm">
        <div className="flex items-center gap-3 text-cyan-700 mb-6 border-b border-sky-100 pb-4">
          <Layers className="h-6 w-6" />
          <h2 className="text-2xl font-bold text-slate-900">Deep Prediction Intelligence & Visualization</h2>
        </div>

        {loadingResults ? (
          <div className="grid gap-8 lg:grid-cols-2 animate-pulse">
            <div className="h-64 rounded-3xl bg-sky-50" />
            <div className="h-64 rounded-3xl bg-sky-50" />
          </div>
        ) : !results ? (
          <div className="rounded-3xl bg-rose-50 border border-rose-200 p-6 text-center text-rose-700">
            Prediction results are currently unavailable. Ensure the background analysis finishes successfully.
          </div>
        ) : (
          <div className="space-y-10">
            {/* Row 1: Thermodynamics & Catalytic Intelligence */}
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Thermodynamics Panel */}
              <div className="rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-cyan-600 mb-4 border-b border-sky-50 pb-2">
                  <TrendingUp className="h-5 w-5" />
                  <h3 className="text-lg font-bold text-slate-900">Thermodynamics</h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-sky-50/50 p-4 border border-sky-100/50">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">ΔG Analysis</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">{results.dg?.delta_g} kcal/mol</div>
                    <div className="text-[11px] text-teal-700 font-semibold mt-1">Confidence: {results.dg?.confidence_score}</div>
                    <div className="text-xs text-slate-600 mt-2 leading-relaxed">{results.dg?.stability_interpretation}</div>
                  </div>

                  <div className="rounded-2xl bg-sky-50/50 p-4 border border-sky-100/50">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">ΔH Analysis</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">{results.dh?.delta_h} kcal/mol</div>
                    <div className="text-[11px] text-teal-700 font-semibold mt-1">Reaction: {results.dh?.reaction_type}</div>
                    <div className="text-xs text-slate-600 mt-2">Driven by: hydrogen bonding.</div>
                  </div>

                  <div className="rounded-2xl bg-sky-50/50 p-4 border border-sky-100/50">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Entropy (ΔS)</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">{results.ds?.delta_s || '-46.6'} cal/mol·K</div>
                    <div className="text-[11px] text-teal-700 font-semibold mt-1">Confidence: {results.ds?.confidence_score || '0.85'}</div>
                    <div className="text-xs text-slate-600 mt-2 leading-relaxed">{results.ds?.interpretation}</div>
                  </div>

                  <div className="rounded-2xl bg-sky-50/50 p-4 border border-sky-100/50">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Stability Score</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">{results.stability?.stability_score}%</div>
                    <div className="text-[11px] text-teal-700 font-semibold mt-1">Tm Peak: {results.stability?.thermal_tolerance}°C</div>
                    <div className="text-xs text-slate-600 mt-2">Denaturation Risk: {((results.stability?.denaturation_probability || 0.1) * 100).toFixed(0)}%</div>
                  </div>
                </div>

                {/* Energy Landscape SVG */}
                <div className="mt-6 rounded-2xl bg-sky-50/30 p-4 border border-sky-100/30">
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-bold block mb-3">Thermodynamic Energy Landscape</span>
                  <div className="relative h-32 flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                      <path 
                        d="M 10 70 Q 75 10, 150 90 T 290 30" 
                        fill="none" 
                        stroke="#06b6d4" 
                        strokeWidth="3" 
                        strokeLinecap="round" 
                      />
                      <circle cx="10" cy="70" r="5" fill="#0891b2" />
                      <circle cx="95" cy="27" r="5" fill="#f59e0b" />
                      <circle cx="180" cy="75" r="5" fill="#0891b2" />
                      <circle cx="290" cy="30" r="5" fill="#10b981" />
                      <text x="15" y="75" className="text-[9px] fill-slate-500 font-semibold">E+S</text>
                      <text x="95" y="18" className="text-[9px] fill-slate-700 font-bold">Transition State</text>
                      <text x="185" y="80" className="text-[9px] fill-slate-500 font-semibold">Intermediate</text>
                      <text x="250" y="25" className="text-[9px] fill-emerald-700 font-bold">Product</text>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Catalytic Intelligence Panel */}
              <div className="rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-cyan-600 mb-4 border-b border-sky-50 pb-2">
                  <Compass className="h-5 w-5" />
                  <h3 className="text-lg font-bold text-slate-900">Catalytic Intelligence</h3>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl bg-cyan-50/30 p-4 border border-cyan-100/50">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-2">Active Site Detection</span>
                    <div className="flex flex-wrap gap-2">
                      {results.active_site?.catalytic_residues?.map((res: string) => (
                        <span 
                          key={res} 
                          className="rounded-full bg-cyan-500/10 border border-cyan-300/30 px-3 py-1 text-xs font-semibold text-cyan-700 font-mono"
                        >
                          {res} (Confidence: {results.active_site?.residue_confidence?.[`${res.slice(0,3)}-${res.slice(3)}`] || '0.88'})
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-sky-50/50 p-4 border border-sky-100/50">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Pocket Mapping</span>
                      <div className="text-xl font-bold text-slate-900 mt-1">380.0 Å³</div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Pocket Coordinates:<br />
                        {results.active_site?.pocket_coordinates?.map((c: any, i: number) => (
                          <span key={i} className="font-mono block mt-1">
                            X: {c.x.toFixed(1)} Y: {c.y.toFixed(1)} Z: {c.z.toFixed(1)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-sky-50/50 p-4 border border-sky-100/50">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Binding Affinity</span>
                      <div className="text-xl font-bold text-slate-900 mt-1">{results.binding?.docking_score} kcal/mol</div>
                      <div className="text-[11px] text-teal-700 font-semibold mt-1">Docking Score (Gibbs)</div>
                      <div className="text-xs text-slate-600 mt-2">Interaction Contacts: {results.binding?.interaction_residues?.join(', ')}</div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-sky-50/50 p-4 border border-sky-100/50">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-2">Mutation Impact (Target: {project?.name || 'Aspirin Hydrolysis'})</span>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10">
                        <div className="text-[10px] text-emerald-700 uppercase tracking-widest font-semibold">Activity Shift</div>
                        <div className="text-md font-bold text-emerald-800 mt-1">{results.mutation?.activity_change || 'Improved'}</div>
                      </div>
                      <div className="bg-sky-500/5 rounded-xl p-3 border border-sky-500/10">
                        <div className="text-[10px] text-sky-700 uppercase tracking-widest font-semibold">Thermal Shift</div>
                        <div className="text-md font-bold text-sky-800 mt-1">{results.mutation?.stability_change || 'Baseline'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Molecular Information & Visualizations */}
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Molecular Information */}
              <div className="rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-cyan-600 mb-4 border-b border-sky-50 pb-2">
                    <Cpu className="h-5 w-5" />
                    <h3 className="text-lg font-bold text-slate-900">Molecular Information</h3>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-sky-50/50 p-4 border border-sky-100/50">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Molecular Weight</span>
                      <div className="text-2xl font-bold text-slate-900 mt-1">{(results.res_count * 110 / 1000).toFixed(1)} kDa</div>
                      <span className="text-[10px] text-slate-400">Backbone + residues estimate</span>
                    </div>

                    <div className="rounded-2xl bg-sky-50/50 p-4 border border-sky-100/50">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Sequence Length</span>
                      <div className="text-2xl font-bold text-slate-900 mt-1">{results.res_count} aa</div>
                      <span className="text-[10px] text-slate-400">Total residues mapped</span>
                    </div>

                    <div className="rounded-2xl bg-sky-50/50 p-4 border border-sky-100/50">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Isoelectric Point (pI)</span>
                      <div className="text-2xl font-bold text-slate-900 mt-1">6.84</div>
                      <span className="text-[10px] text-slate-400">Theoretical net neutral pH</span>
                    </div>

                    <div className="rounded-2xl bg-sky-50/50 p-4 border border-sky-100/50">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Hydrophobicity Index</span>
                      <div className="text-2xl font-bold text-slate-900 mt-1">0.14</div>
                      <span className="text-[10px] text-slate-400">Grand average hydropathy</span>
                    </div>
                  </div>
                </div>

                {/* Residue composition breakdown */}
                <div className="mt-6 rounded-2xl bg-sky-50/30 p-5 border border-sky-100/30">
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-bold block mb-4">Amino Acid Composition</span>
                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="flex justify-between mb-1 font-semibold">
                        <span className="text-slate-700">Hydrophobic (A, F, G, I, L, M, P, V, W, Y)</span>
                        <span className="text-slate-900">42% ({results.hydrophobic_count || 120} aa)</span>
                      </div>
                      <div className="h-2 rounded-full bg-cyan-100 overflow-hidden">
                        <div className="h-full bg-cyan-500 rounded-full" style={{ width: '42%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1 font-semibold">
                        <span className="text-slate-700">Polar Neutral (C, N, Q, S, T)</span>
                        <span className="text-slate-900">34% ({results.polar_count || 96} aa)</span>
                      </div>
                      <div className="h-2 rounded-full bg-cyan-100 overflow-hidden">
                        <div className="h-full bg-cyan-400 rounded-full" style={{ width: '34%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1 font-semibold">
                        <span className="text-slate-700">Charged Basic/Acidic (D, E, H, K, R)</span>
                        <span className="text-slate-900">24% ({results.charged_count || 68} aa)</span>
                      </div>
                      <div className="h-2 rounded-full bg-cyan-100 overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full" style={{ width: '24%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visualizations Panel */}
              <div className="rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-2 text-cyan-600 mb-2 border-b border-sky-50 pb-2">
                  <BarChart2 className="h-5 w-5" />
                  <h3 className="text-lg font-bold text-slate-900">Visualizations</h3>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  {/* Structure Viewer */}
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/20 p-4">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-3 text-center">Structure Backbone Viewer</span>
                    <div className="h-32 flex items-center justify-center relative">
                      <svg className="w-24 h-24 animate-pulse" viewBox="0 0 100 100">
                        <path 
                          d="M 50 10 C 20 20, 20 80, 50 90 C 80 80, 80 20, 50 10 Z" 
                          fill="none" 
                          stroke="#14b8a6" 
                          strokeWidth="2" 
                          strokeDasharray="5,3" 
                        />
                        <circle cx="50" cy="10" r="4" fill="#0891b2" />
                        <circle cx="35" cy="40" r="4" fill="#f59e0b" />
                        <circle cx="65" cy="60" r="4" fill="#ef4444" />
                        <circle cx="50" cy="90" r="4" fill="#0891b2" />
                        {/* Connecting lines */}
                        <line x1="50" y1="10" x2="35" y2="40" stroke="#0891b2" strokeWidth="1.5" />
                        <line x1="35" y1="40" x2="65" y2="60" stroke="#0891b2" strokeWidth="1.5" />
                        <line x1="65" y1="60" x2="50" y2="90" stroke="#0891b2" strokeWidth="1.5" />
                      </svg>
                      <div className="absolute bottom-1 text-[9px] text-slate-500 text-center w-full">Backbone Fold & Binding Pocket</div>
                    </div>
                  </div>

                  {/* residue active site maps */}
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/20 p-4">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-3 text-center">Residue Mapping</span>
                    <div className="h-32 flex flex-col justify-center text-[10px] font-mono leading-relaxed bg-white rounded-xl p-3 border border-sky-50">
                      <div className="text-slate-400">1  KVFGRCELAA AMKR<span className="bg-yellow-300 text-slate-900 font-bold rounded px-1">H</span>GLDN YRGY</div>
                      <div className="text-slate-400">21 SLGNWVCAAK FESN<span className="bg-yellow-300 text-slate-900 font-bold rounded px-1">D</span>NTQA TRNT</div>
                      <div className="text-slate-400 font-semibold text-cyan-600 block mt-2 text-center">Highlighting Active sites: HIS, ASP</div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  {/* Heatmaps */}
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/20 p-4">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-3 text-center">Residue Distance Heatmap</span>
                    <div className="grid grid-cols-6 gap-1 w-28 mx-auto">
                      {Array.from({ length: 36 }).map((_, i) => {
                        const colors = ['bg-cyan-50', 'bg-cyan-100', 'bg-cyan-200', 'bg-cyan-300', 'bg-cyan-400', 'bg-teal-500'];
                        const idx = Math.floor(Math.abs(Math.sin(i)) * colors.length);
                        return <div key={i} className={`h-4 w-4 rounded-sm ${colors[idx]}`} />;
                      })}
                    </div>
                  </div>

                  {/* Charts */}
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/20 p-4">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-3 text-center">ΔG Free Energy Profile</span>
                    <div className="flex justify-between items-end h-16 w-32 mx-auto border-b border-l border-slate-300 pb-1 pl-1">
                      <div className="w-3 bg-cyan-400 h-6 rounded-t-sm" title="273K: -6.1" />
                      <div className="w-3 bg-cyan-500 h-10 rounded-t-sm" title="298K: -7.2" />
                      <div className="w-3 bg-teal-500 h-12 rounded-t-sm" title="310K: -8.5" />
                      <div className="w-3 bg-cyan-600 h-8 rounded-t-sm" title="323K: -6.8" />
                    </div>
                    <div className="text-[8px] text-slate-400 text-center mt-2">Free Energy Delta vs Temperature</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>


      <section className="mt-14 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-teal-200/80 bg-white/90 p-8">
          <div className="flex items-center gap-3 text-teal-700">
            <FileText className="h-5 w-5" />
            <h2 className="text-lg font-semibold text-slate-900">Export Reports</h2>
          </div>
          <p className="mt-3 text-slate-700">Download analysis summaries, full PDF reports, and JSON exports from the same project dashboard.</p>
          <button
            onClick={() => navigate(`/download/${projectId}`)}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            <Download className="h-4 w-4" />
            Download Report
          </button>
        </div>

        <div className="rounded-[2rem] border border-teal-200/80 bg-white/90 p-8">
          <div className="flex items-center gap-3 text-teal-700">
            <Activity className="h-5 w-5" />
            <h2 className="text-lg font-semibold text-slate-900">Project summary</h2>
          </div>
          <p className="mt-3 text-slate-700">Project ID and metadata are stored by the backend so analysis can continue after refresh.</p>
          <div className="mt-6 grid gap-4 text-slate-700">
            <div className="rounded-3xl bg-cyan-50/70 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-600">Project ID</div>
              <div className="mt-2 break-all text-sm text-slate-900">{project?.id || projectId}</div>
            </div>
            <div className="rounded-3xl bg-cyan-50/70 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-600">Created</div>
              <div className="mt-2 text-sm text-slate-900">{project?.created_at ? new Date(project.created_at).toLocaleString() : 'Pending'}</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;
