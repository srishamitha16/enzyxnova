import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getModuleResult, generatePdfReport } from '../api/api';
import { ArrowLeft, Download, Sparkles } from 'lucide-react';

const moduleTitles: Record<string, string> = {
  'delta-g': 'ΔG Prediction',
  'delta-h': 'ΔH Prediction',
  'active-site': 'Active Site',
  mechanism: 'Catalytic Mechanism',
  binding: 'Binding Affinity',
  'substrate-specificity': 'Substrate Specificity',
  stability: 'Enzyme Stability',
  mutation: 'Mutation Effects',
  pathway: 'Reaction Pathway',
};

function ResultPage() {
  const { projectId, module } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportUrl, setReportUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !module) return;
    getModuleResult(projectId, module)
      .then((response) => setData(response))
      .catch((err) => {
        console.error(err);
        setError('Unable to fetch prediction from backend.');
      })
      .finally(() => setLoading(false));
  }, [projectId, module]);

  const handleGenerateReport = async () => {
    if (!projectId || !module) return;
    try {
      const result = await generatePdfReport(projectId, [module]);
      setReportUrl(`${window.location.origin}${result.download_url}`);
    } catch (err) {
      console.error(err);
      setError('Unable to generate PDF report.');
    }
  };

  const getKeyResult = () => {
    if (!data) return '—';
    const val = (
      data.delta_g ?? 
      data.delta_h ?? 
      data.stability_score ?? 
      data.docking_score ?? 
      data.feasibility_score ?? 
      (data.catalytic_residues ? `${data.catalytic_residues.length} Residues` : null) ??
      data.selectivity_index ??
      '—'
    );
    return typeof val === 'number' ? `${val}` : val;
  };
  
  const getInterpretationText = () => {
    if (!data) return 'Interpretation is currently loading...';
    return (
      data.stability_interpretation || 
      data.catalytic_heat_interpretation || 
      (data.catalytic_residues ? `Mapped active site pocket containing key catalytic residues.` : null) ||
      (data.mechanism_type ? `Classification: ${data.mechanism_type}` : null) ||
      (data.docking_score ? `Docking interaction score: ${data.docking_score} kcal/mol. Spontaneous binding is highly predicted.` : null) ||
      (data.selectivity_index ? `Selectivity rank index: ${data.selectivity_index}%. High substrate affinity.` : null) ||
      (data.activity_change ? `Predicted impact is: ${data.activity_change} and stability shift is ${data.stability_change}` : null) ||
      (data.feasibility_score ? `Reaction feasibility score: ${data.feasibility_score}/100.` : null) ||
      'AI interpretation is currently unavailable.'
    );
  };

  const renderModuleDetails = () => {
    if (!data) return null;
    
    switch (module) {
      case 'delta-g':
        return (
          <div className="space-y-4">
            <div className="rounded-3xl bg-cyan-50/80 p-5">
              <h4 className="font-bold text-slate-900 mb-2">Residue Free Energy Contributions</h4>
              <div className="space-y-2">
                {data.residue_contributions?.map((c: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs border-b border-cyan-100 pb-1">
                    <span>{c.residue} at pos {c.position} ({c.type})</span>
                    <span className="font-semibold text-slate-800">{c.energy} kcal/mol ({c.reliability})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'delta-h':
        return (
          <div className="space-y-4">
            <div className="rounded-3xl bg-cyan-50/80 p-5">
              <h4 className="font-bold text-slate-900 mb-2">Enthalpic Term Breakdown</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Electrostatic: <span className="font-semibold">{data.energy_map?.electrostatic} kcal/mol</span></div>
                <div>Polar Solvation: <span className="font-semibold">{data.energy_map?.polar_solvation} kcal/mol</span></div>
                <div>Nonpolar Solvation: <span className="font-semibold">{data.energy_map?.nonpolar_solvation} kcal/mol</span></div>
                <div>Van der Waals: <span className="font-semibold">{data.energy_map?.vdw} kcal/mol</span></div>
              </div>
            </div>
          </div>
        );
      case 'active-site':
        return (
          <div className="space-y-4">
            <div className="rounded-3xl bg-cyan-50/80 p-5">
              <h4 className="font-bold text-slate-900 mb-2">Catalytic Residues</h4>
              <div className="flex flex-wrap gap-2">
                {data.catalytic_residues?.map((res: string) => (
                  <span key={res} className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-mono font-semibold text-cyan-700">
                    {res} (Confidence: {data.residue_confidence?.[`${res.slice(0,3)}-${res.slice(3)}`] || '0.88'})
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      case 'mechanism':
        return (
          <div className="space-y-4">
            <div className="rounded-3xl bg-cyan-50/80 p-5">
              <h4 className="font-bold text-slate-900 mb-2">Catalytic Roles</h4>
              <div className="space-y-2">
                {data.residue_roles?.map((r: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs border-b border-cyan-100 pb-1">
                    <span>{r.residue} at pos {r.pos}</span>
                    <span className="font-semibold text-slate-800">{r.role}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'binding':
        return (
          <div className="space-y-4">
            <div className="rounded-3xl bg-cyan-50/80 p-5">
              <h4 className="font-bold text-slate-900 mb-2">Affinity Details</h4>
              <div className="text-xs space-y-1">
                <div>Binding Energy: <span className="font-semibold">{data.binding_energy} kcal/mol</span></div>
                <div>Interacting Residues: <span className="font-semibold">{data.interaction_residues?.join(', ')}</span></div>
              </div>
            </div>
          </div>
        );
      case 'substrate-specificity':
        return (
          <div className="space-y-4">
            <div className="rounded-3xl bg-cyan-50/80 p-5">
              <h4 className="font-bold text-slate-900 mb-2">Substrate Affinity Rankings</h4>
              <div className="space-y-2">
                {data.substrate_rankings?.map((s: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs border-b border-cyan-100 pb-1">
                    <span>{s.substrate}</span>
                    <span className="font-semibold text-slate-800">Score: {s.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'stability':
        return (
          <div className="space-y-4">
            <div className="rounded-3xl bg-cyan-50/80 p-5">
              <h4 className="font-bold text-slate-900 mb-2">Unstable Backbone Loops</h4>
              <ul className="list-disc pl-4 text-xs space-y-1">
                {data.unstable_regions?.map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        );
      case 'mutation':
        return (
          <div className="space-y-4">
            <div className="rounded-3xl bg-cyan-50/80 p-5">
              <h4 className="font-bold text-slate-900 mb-2">Mutational Recommendations</h4>
              <div className="space-y-2 text-xs">
                {data.beneficial_mutations?.map((m: any, i: number) => (
                  <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    <div className="font-semibold text-emerald-800">{m.mutation} ({m.region})</div>
                    <div className="mt-1 text-slate-600">{m.impact} | ddG: {m.ddg} kcal/mol</div>
                  </div>
                ))}
                {data.harmful_mutations?.map((m: any, i: number) => (
                  <div key={i} className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                    <div className="font-semibold text-rose-800">{m.mutation} ({m.region})</div>
                    <div className="mt-1 text-slate-600">{m.impact} | ddG: {m.ddg} kcal/mol</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'pathway':
        return (
          <div className="space-y-4">
            <div className="rounded-3xl bg-cyan-50/80 p-5">
              <h4 className="font-bold text-slate-900 mb-2">Reaction Intermediates</h4>
              <div className="flex flex-wrap gap-2">
                {data.intermediates?.map((item: string) => (
                  <span key={item} className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-700">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <main className="px-6 py-8 sm:px-10 lg:px-16">
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-teal-700 hover:text-teal-900">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </button>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900">{moduleTitles[module ?? ''] || 'Prediction Result'}</h1>
          <p className="mt-3 max-w-2xl text-slate-700">Scientific interpretation, confidence metrics, and result summaries for the selected module.</p>
        </div>
        <button
          onClick={handleGenerateReport}
          className="inline-flex items-center gap-2 rounded-full bg-teal-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-600"
        >
          <Download className="h-4 w-4" /> Export PDF
        </button>
      </div>

      <section className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-[2rem] border border-teal-200/80 bg-white/90 p-8 shadow-soft-glow">
          {loading ? (
            <div className="space-y-4 text-slate-700">
              <div className="h-3 w-2/5 rounded-full bg-teal-200" />
              <div className="h-4 w-full rounded-full bg-teal-200" />
              <div className="h-4 w-4/5 rounded-full bg-teal-200" />
            </div>
          ) : error ? (
            <p className="text-slate-700">{error}</p>
          ) : (
            <div className="space-y-6 text-slate-700">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-cyan-50/80 p-5">
                  <p className="text-sm uppercase tracking-[0.25em] text-slate-600">Confidence Score</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{(data?.confidence_score ?? 0.88).toString()}</p>
                </div>
                <div className="rounded-3xl bg-cyan-50/80 p-5">
                  <p className="text-sm uppercase tracking-[0.25em] text-slate-600">Key Result</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{getKeyResult()}</p>
                </div>
              </div>

              <div className="rounded-3xl bg-cyan-50/80 p-6">
                <p className="text-sm uppercase tracking-[0.25em] text-teal-700">AI Interpretation</p>
                <p className="mt-4 text-slate-700 whitespace-pre-line">{getInterpretationText()}</p>
              </div>

              {renderModuleDetails()}
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-teal-200/80 bg-white/90 p-6 shadow-soft-glow">
            <p className="text-sm uppercase tracking-[0.25em] text-teal-700/80">Model Dashboard</p>
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl bg-cyan-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-600">Module</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{moduleTitles[module ?? '']}</p>
              </div>
              <div className="rounded-3xl bg-cyan-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-600">Project</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{projectId}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-teal-200/80 bg-white/90 p-6 shadow-soft-glow">
            <p className="text-sm uppercase tracking-[0.25em] text-teal-700/80">Download Ready</p>
            <p className="mt-4 text-slate-700">Use the export panel to save results and PDF reports for publication or lab notebooks.</p>
            {reportUrl ? (
              <a href={reportUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-600">
                <span>Open Generated PDF</span>
              </a>
            ) : (
              <div className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-teal-200 bg-cyan-50 px-4 py-3 text-sm text-slate-600">
                Report URL not generated yet
              </div>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}


export default ResultPage;
