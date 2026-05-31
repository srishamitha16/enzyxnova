import axios from 'axios';
import API_CONFIG from '../config/api.config';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000,
});

const ensureProject = async (projectId?: string) => projectId;

export async function uploadProteinSequence(sequence: string, projectId?: string) {
  const form = new FormData();
  form.append('fasta_sequence', sequence);
  if (projectId) form.append('project_id', projectId);
  const response = await api.post('/api/upload/protein-sequence', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function uploadProteinStructure(file: File, projectId?: string) {
  const form = new FormData();
  form.append('file', file);
  if (projectId) form.append('project_id', projectId);
  const response = await api.post('/api/upload/protein-structure', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function uploadLigand(ligandType: 'smiles' | 'pdb', ligandValue: string | File, projectId?: string) {
  const form = new FormData();
  form.append('ligand_type', ligandType);
  if (projectId) form.append('project_id', projectId);
  if (ligandType === 'smiles') {
    form.append('ligand_smiles', ligandValue as string);
  } else {
    form.append('file', ligandValue as File);
  }
  const response = await api.post('/api/upload/ligand', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function startAnalysis(projectId: string, temperature = 298.15, ph = 7.4, mutation?: string) {
  const response = await api.post('/api/analyze/start', {
    project_id: projectId,
    temperature,
    ph,
    mutation,
  });
  return response.data;
}

export async function getAnalysisStatus(projectId: string) {
  const response = await api.get(`/api/analyze/status/${encodeURIComponent(projectId)}`);
  return response.data;
}

const moduleRouteMap: Record<string, string> = {
  'delta-g': 'delta-g',
  'delta-h': 'delta-h',
  'active-site': 'active-site',
  mechanism: 'mechanism',
  binding: 'binding-affinity',
  'substrate-specificity': 'substrate',
  stability: 'stability',
  mutation: 'mutation',
  pathway: 'pathway',
};

export async function getModuleResult(projectId: string, module: string) {
  const route = moduleRouteMap[module] || module;
  const response = await api.post(`/api/predict/${route}`, { project_id: projectId });
  return response.data;
}

export async function getProject(projectId: string) {
  const response = await api.get(`/api/projects/${encodeURIComponent(projectId)}`);
  return response.data;
}

export async function generatePdfReport(projectId: string, selectedModules: string[]) {
  const response = await api.post('/api/report/generate', {
    project_id: projectId,
    selected_modules: selectedModules,
  });
  return response.data;
}

export function getReportDownloadUrl(reportId: string) {
  const baseUrl = API_CONFIG.BASE_URL;
  const url = `${baseUrl}/api/report/download/${reportId}`;
  return url;
}

export async function exportJsonReport(projectId: string, selectedModules: string[]) {
  const response = await api.post('/api/report/export/json', {
    project_id: projectId,
    selected_modules: selectedModules,
  });
  return response.data;
}

export async function listReports(projectId: string) {
  const response = await api.get('/api/reports', { params: { project_id: projectId } });
  return response.data;
}

export async function uploadUnifiedFile(file: File, projectId?: string) {
  const form = new FormData();
  form.append('file', file);
  if (projectId) form.append('project_id', projectId);
  const response = await api.post('/api/upload/file', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function getProjectResults(projectId: string) {
  const response = await api.get(`/api/projects/${encodeURIComponent(projectId)}/results`);
  return response.data;
}

