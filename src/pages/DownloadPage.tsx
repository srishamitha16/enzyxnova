import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { exportJsonReport, generatePdfReport } from '../api/api';
import { Download, FileText, ArrowLeft } from 'lucide-react';

const modules = [
  { value: 'delta-g', label: 'ΔG' },
  { value: 'delta-h', label: 'ΔH' },
  { value: 'active-site', label: 'Active Site' },
  { value: 'mechanism', label: 'Catalytic Mechanism' },
  { value: 'binding', label: 'Binding Affinity' },
  { value: 'substrate-specificity', label: 'Substrate Specificity' },
  { value: 'stability', label: 'Enzyme Stability' },
  { value: 'mutation', label: 'Mutation Effects' },
  { value: 'pathway', label: 'Reaction Pathway' },
];

function DownloadPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>(['delta-g', 'delta-h', 'active-site']);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [jsonExport, setJsonExport] = useState<any>(null);
  const [message, setMessage] = useState('Choose the prediction modules to include in your report.');

  const toggleModule = (value: string) => {
    setSelected((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const handleGeneratePdf = async () => {
    if (!projectId || selected.length === 0) {
      setMessage('Select at least one module before exporting.');
      return;
    }
    setMessage('Building PDF report...');
    try {
      const response = await generatePdfReport(projectId, selected);
      setDownloadUrl(`${window.location.origin}${response.download_url}`);
      setMessage('PDF report generated successfully. Open the link below to download.');
    } catch (error) {
      console.error(error);
      setMessage('Unable to generate PDF report at this time.');
    }
  };

  const handleExportJson = async () => {
    if (!projectId || selected.length === 0) {
      setMessage('Select at least one module before exporting.');
      return;
    }
    setMessage('Exporting JSON payload...');
    try {
      const response = await exportJsonReport(projectId, selected);
      setJsonExport(response);
      setMessage('JSON export ready. Review or copy from the preview panel.');
    } catch (error) {
      console.error(error);
      setMessage('Unable to export JSON yet.');
    }
  };

  const summaryLabel = useMemo(
    () => selected.map((value) => modules.find((module) => module.value === value)?.label ?? value).join(', '),
    [selected],
  );

  return (
    <main className="px-6 py-8 sm:px-10 lg:px-16">
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-teal-700 hover:text-teal-900">
            <ArrowLeft className="h-4 w-4" /> Return
          </button>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900">Download & Export</h1>
          <p className="mt-3 text-slate-700">Select prediction outputs, then generate a PDF or JSON report automatically.</p>
        </div>
        <div className="rounded-3xl border border-teal-200/80 bg-white/90 p-6 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Project</p>
          <p className="mt-2 break-all">{projectId}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[0.95fr_0.9fr]">
        <section className="rounded-[2rem] border border-teal-200/80 bg-white/90 p-8 shadow-soft-glow">
          <p className="text-sm uppercase tracking-[0.28em] text-teal-700/80">Choose modules</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {modules.map((module) => (
              <button
                key={module.value}
                type="button"
                onClick={() => toggleModule(module.value)}
                className={`rounded-3xl border p-4 text-left transition ${selected.includes(module.value) ? 'border-teal-400 bg-teal-100/30 text-slate-900' : 'border-teal-200 bg-cyan-50 text-slate-700'}`}
              >
                <span className="block text-sm font-semibold">{module.label}</span>
                <span className="mt-2 block text-xs text-slate-600">Include in report</span>
              </button>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button onClick={handleGeneratePdf} className="inline-flex items-center gap-2 rounded-full bg-teal-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-600">
              <Download className="h-4 w-4" /> Generate PDF
            </button>
            <button onClick={handleExportJson} className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-cyan-50 px-6 py-3 text-sm text-slate-900 transition hover:border-teal-400">
              <FileText className="h-4 w-4 text-teal-700" /> Export JSON
            </button>
          </div>

          <div className="mt-8 rounded-3xl bg-cyan-50/80 p-6 text-slate-700">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-600">Selection summary</p>
            <p className="mt-3 text-sm leading-6">{summaryLabel || 'No module selected yet.'}</p>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-teal-200/80 bg-white/90 p-8 shadow-soft-glow">
            <p className="text-sm uppercase tracking-[0.28em] text-teal-700/80">Action status</p>
            <p className="mt-4 text-slate-700">{message}</p>
            {downloadUrl && (
              <a href={downloadUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-600">
                Download PDF Report
              </a>
            )}
          </div>
          <div className="rounded-[2rem] border border-teal-200/80 bg-white/90 p-6 shadow-soft-glow">
            <p className="text-sm uppercase tracking-[0.28em] text-teal-700/80">JSON Preview</p>
            <pre className="mt-4 max-h-80 overflow-auto rounded-3xl bg-cyan-50/80 p-4 text-xs leading-6 text-slate-700">{jsonExport ? JSON.stringify(jsonExport, null, 2) : 'Generate JSON to preview the module export payload.'}</pre>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default DownloadPage;
