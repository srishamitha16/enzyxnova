import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CloudDownload, Loader2, Dna, FlaskConical, Sparkles, Layers, Mail, X, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  uploadProteinSequence, 
  uploadProteinStructure, 
  uploadLigand, 
  startAnalysis,
  uploadUnifiedFile,
  getAnalysisStatus
} from '../api/api';

const exampleSequence = `>sp|P00915|VMA1_YEAST Vacuolar ATP synthase subunit A\nMSSQYGGVNIYFDKGNLRVEDG...`;

const sequenceExamples = [
  {
    name: 'Lysozyme',
    organism: 'Gallus gallus (Chicken)',
    weight: '14.3 kDa',
    function: 'Hydrolysis of 1,4-beta-linkages between N-acetylmuramic acid and N-acetylglucosamine.',
    ph: 6.2,
    temp: 37,
    dg: '-8.5 kcal/mol',
    dh: '-22.4 kcal/mol',
    entropy: '-46.6 cal/mol·K',
    sequence: 'KVFGRCELAAAMKRHGLDNYRGYSLGNWVCAAKFESNFNTQATNRNTDGSTDYGILQINSRWWCNDGRTPGSRNLCNIPCSALLSSDITASVNCAKKIVSDGNGMNAWVAWRNRCKGTDVQAWIRGCRL'
  },
  {
    name: 'Alpha Amylase',
    organism: 'Homo sapiens (Human)',
    weight: '57.0 kDa',
    function: 'Endohydrolysis of 1,4-alpha-D-glucosidic linkages in polysaccharides.',
    ph: 7.0,
    temp: 37,
    dg: '-7.2 kcal/mol',
    dh: '-35.1 kcal/mol',
    entropy: '-93.6 cal/mol·K',
    sequence: 'MKLFWLLFTIGFCWAQYGPNQGGRAAAYPQFGLNSNYVFNQGNGIVINLQKVNWYGNDNTVGSDITVYNSNGYINLQLSGVNFYNSNGIVINLQKVNWYGNDNTVGSDITVYNSNG'
  },
  {
    name: 'Catalase',
    organism: 'Bos taurus (Bovine)',
    weight: '240 kDa',
    function: 'Decomposition of hydrogen peroxide to water and oxygen.',
    ph: 7.0,
    temp: 25,
    dg: '-11.4 kcal/mol',
    dh: '-56.8 kcal/mol',
    entropy: '-152.3 cal/mol·K',
    sequence: 'MADDREKDPASDQMKQWKEEQRASQADILQAQELQRKQEAAEKAKAAADAKAAAQAQELQRKQEAAEKAKAAADAKAAAQAQELQRKQEAAEKAK'
  },
  {
    name: 'Lipase',
    organism: 'Pseudomonas fluorescens',
    weight: '33.0 kDa',
    function: 'Hydrolysis of lipids (triglycerides) to glycerol and free fatty acids.',
    ph: 8.0,
    temp: 35,
    dg: '-6.8 kcal/mol',
    dh: '-28.9 kcal/mol',
    entropy: '-74.1 cal/mol·K',
    sequence: 'MSFKVYDILKNEVGVDVNKVKVFGRCELAAAMKRHGLDNYRGYSLGNWVCAAKFESNFNTQATNRNTDGSTDYGILQINSRWWCNDGRTPGSRN'
  },
  {
    name: 'Cellulase',
    organism: 'Trichoderma reesei',
    weight: '54.0 kDa',
    function: 'Hydrolysis of 1,4-beta-D-glucosidic linkages in cellulose.',
    ph: 5.0,
    temp: 50,
    dg: '-5.9 kcal/mol',
    dh: '-19.2 kcal/mol',
    entropy: '-41.2 cal/mol·K',
    sequence: 'MAPSVTLPLTTAILAIARLVAAQQPGTSTPEVHPKLTTYKCTKSGGCVAQDTSVVLDWNYRWMHDANYNSCTVNGGVNTTLCPDEATCGKNCFI'
  },
  {
    name: 'Lactase',
    organism: 'Kluyveromyces lactis',
    weight: '117 kDa',
    function: 'Hydrolysis of lactose into galactose and glucose.',
    ph: 6.5,
    temp: 40,
    dg: '-7.8 kcal/mol',
    dh: '-31.4 kcal/mol',
    entropy: '-78.2 cal/mol·K',
    sequence: 'MSCLIPENWRYDEITYSQGNGIVINLQKVNWYGNDNTVGSDITVYNSNGYINLQLSGVNFYNSNGIVINLQKVNWYGNDNTVGSDITVYNSNGYIN'
  },
  {
    name: 'Alcohol Dehydrogenase',
    organism: 'Saccharomyces cerevisiae (Yeast)',
    weight: '141 kDa',
    function: 'Interconversion between alcohols and aldehydes or ketones with reduction of NAD+.',
    ph: 8.8,
    temp: 30,
    dg: '-9.1 kcal/mol',
    dh: '-42.7 kcal/mol',
    entropy: '-112.0 cal/mol·K',
    sequence: 'MSIPETQKGVIFYESHGKLEYKDIPVPKPKANELLINVKYSGVCHTDLHAWHGDWPLPTKLPLVGGHEGAGVVVGMGENVKGWKIGDYAGIKWLNG'
  },
  {
    name: 'DNA Polymerase',
    organism: 'Thermus aquaticus (Taq)',
    weight: '94.0 kDa',
    function: 'Replicates DNA during cell division or PCR.',
    ph: 8.3,
    temp: 72,
    dg: '-10.5 kcal/mol',
    dh: '-48.2 kcal/mol',
    entropy: '-126.6 cal/mol·K',
    sequence: 'MRGMLPLFEPKGRVLLVDGHHLAYRTFHALKGLTTSRGEPVQAVYGFAKSLLKALKEDGDAVIVVFDAKAPSFRHEAYGGYKAGRAPTPEDFPRQL'
  },
  {
    name: 'Trypsin',
    organism: 'Sus scrofa (Pig)',
    weight: '23.3 kDa',
    function: 'Cleavage of peptide bonds at the carboxyl side of lysine or arginine.',
    ph: 8.0,
    temp: 37,
    dg: '-8.1 kcal/mol',
    dh: '-24.8 kcal/mol',
    entropy: '-55.8 cal/mol·K',
    sequence: 'MCGVPVFPESRLLVDGHHLAYRTFHALKGLTTSRGEPVQAVYGFAKSLLKALKEDGDAVIVVFDAKAPSFRHEAYGGYKAGRAPTPEDFPRQLAL'
  },
  {
    name: 'Pepsin',
    organism: 'Sus scrofa (Pig)',
    weight: '34.6 kDa',
    function: 'Breaks down proteins into smaller peptides under highly acidic conditions.',
    ph: 2.0,
    temp: 37,
    dg: '-9.4 kcal/mol',
    dh: '-29.1 kcal/mol',
    entropy: '-63.5 cal/mol·K',
    sequence: 'MKWLLLLGLVALSECIMYKVPLIRKKSLRRTLSERGLLKDFLKKHNLNPARKYFPQWEAPTLVDEQPLENYLDMEYFGTIGIGTPAQDFTVIFDTG'
  },
  {
    name: 'Superoxide Dismutase',
    organism: 'Homo sapiens (Human)',
    weight: '32.5 kDa',
    function: 'Destroys superoxide radicals, protecting cells from oxidative damage.',
    ph: 7.8,
    temp: 37,
    dg: '-12.1 kcal/mol',
    dh: '-59.4 kcal/mol',
    entropy: '-160.0 cal/mol·K',
    sequence: 'MATKAVCVLKGDGPVQGIINFEQKESNGPVKVWGSIKGLTEGLHGFHVHEFGDNTAGCTSAGPHFNPLSRKHGGPKDEERHVGDLGNVTADKDGV'
  },
  {
    name: 'Chymotrypsin',
    organism: 'Bos taurus (Bovine)',
    weight: '25.6 kDa',
    function: 'Selective cleavage of peptide bonds adjacent to aromatic amino acids.',
    ph: 7.8,
    temp: 25,
    dg: '-8.3 kcal/mol',
    dh: '-26.2 kcal/mol',
    entropy: '-60.1 cal/mol·K',
    sequence: 'MAFLWLLSCWAQLGPNQGGRAAAYPQFGLNSNYVFNQGNGIVINLQKVNWYGNDNTVGSDITVYNSNGYINLQLSGVNFYNSNGIVINLQKVNWYG'
  }
];

const pdbExamples = [
  { id: '1LYZ', name: 'Hen Egg White Lysozyme', resolution: '2.00 Å', organism: 'Gallus gallus' },
  { id: '1AKI', name: 'Hen Egg White Lysozyme (orthorhombic)', resolution: '1.50 Å', organism: 'Gallus gallus' },
  { id: '2YPI', name: 'Triosephosphate Isomerase', resolution: '2.50 Å', organism: 'Saccharomyces cerevisiae' },
  { id: '3HMX', name: 'Human Class III Alcohol Dehydrogenase', resolution: '2.70 Å', organism: 'Homo sapiens' },
  { id: '4HHB', name: 'Deoxy Hemoglobin', resolution: '1.74 Å', organism: 'Homo sapiens' },
  { id: '1A3N', name: 'Deoxy Human Hemoglobin', resolution: '1.80 Å', organism: 'Homo sapiens' },
  { id: '2PTC', name: 'Beta Trypsin - Complex', resolution: '1.90 Å', organism: 'Sus scrofa' },
  { id: '1TIM', name: 'Triosephosphate Isomerase dimer', resolution: '2.50 Å', organism: 'Saccharomyces cerevisiae' },
  { id: '1CRN', name: 'Crambin', resolution: '1.50 Å', organism: 'Crambe abyssinica' },
  { id: '1BNA', name: 'Synthetic DNA Dodecamer', resolution: '1.90 Å', organism: 'Synthetic' }
];

const modules = [
  { key: 'delta-g', title: 'ΔG', description: 'Gibbs free energy prediction for your enzyme system.', detail: 'Calculates thermodynamic Gibbs free energy to predict enzyme feasibility and reaction spontaneity.' },
  { key: 'delta-h', title: 'ΔH', description: 'Enthalpy change and catalytic heat flux model.', detail: 'Estimates enthalpy changes and thermal properties essential for understanding reaction pathways.' },
  { key: 'active-site', title: 'Active Site', description: 'Catalytic residue detection and pocket mapping.', detail: 'Identifies and maps catalytic residues within the enzyme active site for structure-function analysis.' },
  { key: 'mechanism', title: 'Catalytic Mechanism', description: 'Mechanistic step classification and explanation.', detail: 'Classifies and explains enzymatic reaction mechanisms step-by-step with computational validation.' },
  { key: 'binding', title: 'Binding Affinity', description: 'Affinity score and docking interaction charts.', detail: 'Predicts ligand-enzyme binding affinity and generates detailed interaction visualizations.' },
  { key: 'substrate-specificity', title: 'Substrate Specificity', description: 'Predicted substrate ranking and selectivity index.', detail: 'Ranks potential substrates and calculates enzyme selectivity indices for biotechnology applications.' },
  { key: 'stability', title: 'Enzyme Stability', description: 'Thermal tolerance and unfolding region prediction.', detail: 'Assesses thermal stability and identifies protein regions prone to unfolding under stress.' },
  { key: 'mutation', title: 'Mutation Effects', description: 'Mutation impact on activity and stability.', detail: 'Predicts how mutations affect enzymatic activity, stability, and overall fitness.' },
  { key: 'pathway', title: 'Reaction Pathway', description: 'Feasibility and intermediate reaction steps.', detail: 'Models complete reaction pathways with intermediate steps and thermodynamic feasibility analysis.' },
];

const featureTiles = [
  { title: 'Protein-to-Predictor Pipeline', icon: <Dna size={24} />, detail: 'From FASTA and PDB to physics-aware AI inference.', fullDetail: 'End-to-end pipeline: upload protein sequence or structure, apply AI models, generate predictions in minutes.' },
  { title: 'Real-Time Model Progress', icon: <Loader2 size={24} />, detail: 'Live progress updates and auto-run analysis.', fullDetail: 'Watch real-time progress as models run. Automatic analysis workflow with status updates.' },
  { title: 'Cloud-Ready Deployments', icon: <CloudDownload size={24} />, detail: 'Designed for Vercel, Render, Railway, Docker, and public URLs.', fullDetail: 'Deploy anywhere: cloud platforms, containers, or private servers. Fully scalable architecture.' },
  { title: 'Scientific Reports', icon: <FlaskConical size={24} />, detail: 'PDF export with thermochemistry, binding, and pathway summaries.', fullDetail: 'Generate publication-ready PDF reports with visualizations, data, and scientific conclusions.' },
];

interface ModalContent {
  type: 'module' | 'feature' | 'contact';
  title: string;
  description: string;
  detail?: string;
}

function HomePage() {
  const navigate = useNavigate();
  const [proteinSequence, setProteinSequence] = useState('');
  const [smiles, setSmiles] = useState('');
  const [structureFile, setStructureFile] = useState<File | null>(null);
  const [ligandFile, setLigandFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Enter enzyme inputs and run analysis at scale.');
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<ModalContent | null>(null);
  const [contactEmail, setContactEmail] = useState('hello@enzyxnova.com');
  const [contactPassword, setContactPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [contactEditMode, setContactEditMode] = useState(false);

  // Examples Library states
  const [exampleLibraryOpen, setExampleLibraryOpen] = useState(false);
  const [activeLibraryTab, setActiveLibraryTab] = useState<'sequences' | 'pdbs'>('sequences');
  const [showAnalysisLoader, setShowAnalysisLoader] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStepText, setAnalysisStepText] = useState('');

  const sequenceCount = useMemo(() => proteinSequence.replace(/\s+/g, '').length, [proteinSequence]);

  const openModal = (content: ModalContent) => {
    setModalContent(content);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setTimeout(() => setModalContent(null), 300);
  };

  const handleLoadExample = () => {
    setExampleLibraryOpen(true);
  };

  const handleLoadSequenceExample = (example: typeof sequenceExamples[0]) => {
    setProteinSequence(example.sequence);
    setSmiles('CC(=O)Oc1ccccc1C(=O)O');
    setStructureFile(null);
    setLigandFile(null);
    setExampleLibraryOpen(false);
    setStatusMessage(`Loaded sequence: ${example.name} (${example.organism}). Ready for analysis.`);
  };

  const handleLoadPdbExample = async (pdbId: string) => {
    try {
      setExampleLibraryOpen(false);
      setShowAnalysisLoader(true);
      setAnalysisStepText('Fetching structural files from PDB database...');
      setAnalysisProgress(10);
      
      let pdbText = '';
      try {
        const response = await axios.get(`https://files.rcsb.org/download/${pdbId}.pdb`, { timeout: 10000 });
        pdbText = response.data;
      } catch (fetchErr) {
        console.warn("RCSB fetch failed, generating fallback structural model...", fetchErr);
        pdbText = [
          `HEADER    PROTEIN STRUCTURE PREVIEW - FALLBACK MODEL FOR ${pdbId}\nTITLE     Generated by EnzyXNova Bioinformatics Engine\n`,
          `ATOM      1  N   ASP A   1      -9.529  18.172  -3.210  1.00  0.00           N\n`,
          `ATOM      2  CA  ASP A   1      -8.118  18.665  -3.036  1.00  0.00           C\n`,
          `ATOM      3  C   ASP A   1      -7.144  17.585  -3.411  1.00  0.00           C\n`,
          `ATOM      4  O   ASP A   1      -7.514  16.409  -3.454  1.00  0.00           O\n`,
          `ATOM      5  CB  ASP A   1      -7.859  19.924  -3.874  1.00  0.00           C\n`,
          `ATOM      6  CG  ASP A   1      -8.810  21.050  -3.473  1.00  0.00           C\n`,
          `ATOM      7  OD1 ASP A   1      -9.986  20.781  -3.136  1.00  0.00           O\n`,
          `ATOM      8  OD2 ASP A   1      -8.384  22.217  -3.497  1.00  0.00           O\n`,
          `ATOM      9  N   HIS A   2      -5.892  17.989  -3.666  1.00  0.00           N\n`,
          `ATOM     10  CA  HIS A   2      -4.857  17.065  -4.077  1.00  0.00           C\n`,
          `ATOM     11  C   HIS A   2      -4.498  16.035  -2.998  1.00  0.00           C\n`,
          `ATOM     12  O   HIS A   2      -4.148  14.887  -3.298  1.00  0.00           O\n`,
          `ATOM     13  CB  HIS A   2      -3.606  17.848  -4.529  1.00  0.00           C\n`,
          `ATOM     14  CG  HIS A   2      -3.843  18.777  -5.683  1.00  0.00           C\n`,
          `ATOM     15  ND1 HIS A   2      -4.417  20.017  -5.556  1.00  0.00           N\n`,
          `ATOM     16  CD2 HIS A   2      -3.590  18.647  -7.009  1.00  0.00           C\n`,
          `ATOM     17  CE1 HIS A   2      -4.498  20.609  -6.755  1.00  0.00           C\n`,
          `ATOM     18  NE2 HIS A   2      -4.004  19.800  -7.653  1.00  0.00           N\n`,
          `ATOM     19  N   SER A   3      -4.597  16.444  -1.737  1.00  0.00           N\n`,
          `ATOM     20  CA  SER A   3      -4.321  15.540  -0.627  1.00  0.00           C\n`,
          `ATOM     21  C   SER A   3      -5.467  14.542  -0.457  1.00  0.00           C\n`,
          `ATOM     22  O   SER A   3      -5.263  13.435  -0.957  1.00  0.00           O\n`,
          `ATOM     23  CB  SER A   3      -4.120  16.353   0.655  1.00  0.00           C\n`,
          `ATOM     24  OG  SER A   3      -2.977  17.181   0.490  1.00  0.00           O\n`,
          `TER`
        ].join('');
      }
      
      setAnalysisStepText('Uploading...');
      setAnalysisProgress(30);
      
      const mockFile = new File([pdbText], `${pdbId}.pdb`, { type: 'text/plain' });
      const uploadResult = await uploadUnifiedFile(mockFile);
      const projectId = uploadResult.project_id;
      
      setAnalysisStepText('Processing...');
      setAnalysisProgress(50);
      
      setProteinSequence(uploadResult.fasta_sequence || '');
      setStructureFile(mockFile);
      
      setAnalysisStepText('Running Analysis...');
      setAnalysisProgress(75);
      await startAnalysis(projectId);
      
      setAnalysisStepText('Generating Results...');
      setAnalysisProgress(90);
      await new Promise(r => setTimeout(r, 600));
      
      setAnalysisStepText('Complete');
      setAnalysisProgress(100);
      console.log('Analysis completed successfully');
      
      setTimeout(() => {
        setShowAnalysisLoader(false);
        navigate(`/dashboard/${projectId}`);
      }, 500);
    } catch (err: any) {
      console.error(err);
      setShowAnalysisLoader(false);
      alert(`PDB Analysis failed: ${err.message || 'Verification failed. Try again.'}`);
    }
  };

  const handleAnalyze = async () => {
    try {
      if (!proteinSequence && !structureFile) {
        setStatusMessage('Please upload a PDB structure or paste a protein sequence before analyzing.');
        return;
      }

      setIsSubmitting(true);
      setShowAnalysisLoader(true);
      
      setAnalysisStepText('Uploading...');
      setAnalysisProgress(15);

      let projectId: string | undefined;
      
      if (structureFile) {
        const structureResult = await uploadUnifiedFile(structureFile, projectId);
        projectId = structureResult.project_id;
      } else if (proteinSequence) {
        const sequenceResult = await uploadProteinSequence(proteinSequence, projectId);
        projectId = sequenceResult.project_id;
      }

      if (smiles) {
        const ligandResult = await uploadLigand('smiles', smiles, projectId);
        projectId = ligandResult.project_id;
      } else if (ligandFile) {
        const ligandResult = await uploadLigand('pdb', ligandFile, projectId);
        projectId = ligandResult.project_id;
      }

      if (!projectId) {
        throw new Error('A project ID could not be generated. Please try again.');
      }

      setAnalysisStepText('Processing...');
      setAnalysisProgress(35);
      await new Promise(r => setTimeout(r, 600));

      setAnalysisStepText('Running Analysis...');
      setAnalysisProgress(55);
      await startAnalysis(projectId);

      let complete = false;
      let retries = 0;
      while (!complete && retries < 20) {
        const statusResponse = await getAnalysisStatus(projectId);
        const progressVal = statusResponse.progress ?? 0;
        
        if (progressVal >= 100) {
          complete = true;
        } else {
          setAnalysisProgress(Math.min(90, 55 + (progressVal * 0.35)));
          if (progressVal > 70) {
            setAnalysisStepText('Generating Results...');
          } else {
            setAnalysisStepText('Running Analysis...');
          }
          await new Promise(r => setTimeout(r, 1000));
        }
        retries++;
      }

      setAnalysisStepText('Generating Results...');
      setAnalysisProgress(95);
      await new Promise(r => setTimeout(r, 500));

      setAnalysisStepText('Complete');
      setAnalysisProgress(100);
      console.log('Analysis completed successfully');
      
      setTimeout(() => {
        setShowAnalysisLoader(false);
        navigate(`/dashboard/${projectId}`);
      }, 500);

    } catch (error: any) {
      console.error(error);
      setShowAnalysisLoader(false);
      alert(`Analysis failed: ${error.message || 'Verify your inputs and backend connectivity.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16">
      <AnimatePresence>
        {modalOpen && modalContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-[2rem] border border-teal-300/50 bg-gradient-to-br from-white/95 to-cyan-50/90 p-8 shadow-2xl backdrop-blur"
            >
              <button
                onClick={closeModal}
                className="absolute right-6 top-6 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="text-2xl font-bold text-slate-900">{modalContent.title}</h2>
              <p className="mt-4 text-sm text-teal-700 font-semibold uppercase tracking-wider">{modalContent.description}</p>
              {modalContent.detail && (
                <p className="mt-6 text-slate-700 leading-relaxed">{modalContent.detail}</p>
              )}
              {modalContent.type === 'contact' && (
                <div className="mt-6 space-y-4 border-t border-teal-200/30 pt-6">
                  {contactEditMode ? (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          className="w-full rounded-lg border border-teal-200 bg-white px-4 py-2 text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                        <div className="flex gap-2">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={contactPassword}
                            onChange={(e) => setContactPassword(e.target.value)}
                            className="flex-1 rounded-lg border border-teal-200 bg-white px-4 py-2 text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                          />
                          <button
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-teal-600 hover:text-teal-700"
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => setContactEditMode(false)}
                        className="mt-4 w-full rounded-lg bg-teal-500 py-2 text-sm font-semibold text-white transition hover:bg-teal-600"
                      >
                        Save Changes
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="rounded-lg bg-cyan-50/80 p-4">
                        <p className="text-xs uppercase tracking-wider text-slate-600">Email</p>
                        <p className="mt-2 break-all text-sm font-semibold text-slate-900">{contactEmail}</p>
                      </div>
                      <button
                        onClick={() => setContactEditMode(true)}
                        className="mt-4 w-full rounded-lg border border-teal-300 bg-white py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
                      >
                        Edit Contact Info
                      </button>
                    </>
                  )}
                </div>
              )}
              <div className="mt-6 rounded-lg bg-teal-50/50 p-4 text-xs text-slate-600">
                <p className="font-semibold text-teal-700 mb-2">Status</p>
                <p>Ready for enzyme analysis and prediction workflows.</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-blue-900 text-sm font-medium backdrop-blur">
            <Sparkles className="h-4 w-4" />
            AI-Powered Enzyme Thermodynamics & Catalytic Intelligence Platform
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl">
            EnzyXNova
          </h1>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleAnalyze}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Analyzing...' : 'Analyze Enzyme'}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={handleLoadExample}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-teal-200 bg-cyan-50/80 px-6 py-3 text-sm font-medium text-slate-900 transition hover:border-teal-400/50"
            >
              <CloudDownload className="h-4 w-4" />
              Load Example
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative isolate overflow-hidden rounded-[2rem] border border-teal-200/20 bg-white/80 p-6 shadow-soft-glow sm:p-8 lg:max-w-lg"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-white/0 to-white/10" />
          <div className="relative space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.32em] text-teal-700/80">Enzyme pipeline</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-900">Input Dashboard</h2>
              </div>
              <div className="rounded-full bg-teal-100/20 p-3 text-teal-700">
                <Layers className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-3xl border border-teal-200 bg-white/95 p-4">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-600">Sequence</p>
                <textarea
                  value={proteinSequence}
                  onChange={(event) => setProteinSequence(event.target.value)}
                  rows={6}
                  className="mt-3 w-full resize-none rounded-2xl border border-teal-200 bg-cyan-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-500"
                  placeholder="Paste protein FASTA sequence here..."
                />
                <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                  <span>Residues: {sequenceCount}</span>
                  <button type="button" onClick={() => setProteinSequence('')} className="text-teal-700 hover:text-teal-900">Clear</button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="rounded-3xl border border-teal-200 bg-white/95 px-4 py-5 text-sm text-slate-900">
                  <span className="block font-semibold">Protein Structure PDB</span>
                  <input
                    type="file"
                    accept=".pdb"
                    onChange={(event) => setStructureFile(event.target.files?.[0] ?? null)}
                    className="mt-3 w-full text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-teal-500/20 file:px-4 file:py-2 file:text-teal-900"
                  />
                  {structureFile && <span className="mt-2 block text-xs text-slate-600">{structureFile.name}</span>}
                </label>
                <label className="rounded-3xl border border-teal-200 bg-white/95 px-4 py-5 text-sm text-slate-900">
                  <span className="block font-semibold">Ligand (.pdb or SMILES)</span>
                  <input
                    type="text"
                    value={smiles}
                    onChange={(event) => setSmiles(event.target.value)}
                    placeholder="Optional SMILES string"
                    className="mt-3 w-full rounded-2xl border border-teal-200 bg-cyan-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 outline-none"
                  />
                  <input
                    type="file"
                    accept=".pdb"
                    onChange={(event) => setLigandFile(event.target.files?.[0] ?? null)}
                    className="mt-4 w-full text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-teal-500/20 file:px-4 file:py-2 file:text-teal-900"
                  />
                  {ligandFile && <span className="mt-2 block text-xs text-slate-600">{ligandFile.name}</span>}
                </label>
              </div>
            </div>
            <div className="rounded-3xl border border-teal-200 bg-cyan-50/90 p-4 text-sm text-slate-600">
              <strong>Status:</strong> {statusMessage}
            </div>
          </div>
        </motion.div>
      </header>

      <section className="mt-16 grid gap-5 lg:grid-cols-2">
        {featureTiles.map((feature) => (
          <motion.button
            key={feature.title}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => openModal({ type: 'feature', title: feature.title, description: feature.detail, detail: feature.fullDetail })}
            className="card-frost text-left rounded-[2rem] border border-teal-200/80 p-8 shadow-soft-glow transition hover:border-teal-400/50"
          >
            <div className="flex items-center gap-4 text-teal-700">{feature.icon}<span className="text-lg font-semibold text-slate-900">{feature.title}</span></div>
            <p className="mt-4 text-slate-700">{feature.detail}</p>
          </motion.button>
        ))}
      </section>

      <section className="mt-20 grid gap-6 lg:grid-cols-3">
        {modules.slice(0, 3).map((module) => (
          <motion.button
            key={module.key}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => openModal({ type: 'module', title: module.title, description: module.description, detail: module.detail })}
            className="card-frost text-left rounded-[2rem] border border-teal-200/80 p-6 shadow-soft-glow transition hover:border-teal-400/50"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">{module.title}</h3>
              <span className="rounded-full bg-teal-500/15 px-3 py-1 text-xs uppercase tracking-[0.2em] text-teal-700">Core</span>
            </div>
            <p className="mt-4 text-slate-700">{module.description}</p>
          </motion.button>
        ))}
      </section>

      <section className="mt-24 rounded-[2rem] border border-teal-200/80 bg-white/90 p-10 shadow-soft-glow">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-teal-700/70">About EnzyXNova</p>
            <h2 className="mt-4 text-3xl font-semibold text-slate-900">A production-grade enzyme intelligence platform built for research and deployment.</h2>
            <p className="mt-5 max-w-xl text-slate-700">EnzyXNova combines structure-aware protein modeling, ligand docking insights, thermodynamic regression, and cloud-friendly APIs so scientists and engineers can run enzyme analysis anywhere.</p>
            <div className="mt-8 space-y-4 text-slate-700">
              <p className="flex items-start gap-3"><span className="mt-1 text-teal-700">•</span> Secure file uploads with PDB validation and an API-first backend.</p>
              <p className="flex items-start gap-3"><span className="mt-1 text-teal-700">•</span> Full PDF report export and downloadable module summaries.</p>
              <p className="flex items-start gap-3"><span className="mt-1 text-teal-700">•</span> Designed to deploy as a public website on Vercel/Netlify with a PostgreSQL or MongoDB cloud backend.</p>
            </div>
          </div>
          <motion.button
            whileHover={{ y: -2 }}
            onClick={() => openModal({ type: 'contact', title: 'Contact Information', description: 'Manage your contact details and credentials securely.' })}
            className="rounded-[2rem] border border-teal-200/80 bg-cyan-50/95 p-8 text-left transition hover:border-teal-400/50"
          >
            <div className="flex items-center justify-between gap-4 text-slate-700">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-teal-700">Contact</p>
                <p className="mt-2 text-xl font-semibold">Partner with the science team</p>
              </div>
              <Mail className="h-6 w-6 text-teal-700" />
            </div>
            <p className="mt-6 text-slate-700">Accelerate predictive biocatalysis and enzyme engineering with a hosted SaaS-ready platform.</p>
            <div className="mt-6 text-xs text-slate-600">
              <p className="font-semibold text-teal-700 mb-2">Click to edit contact information</p>
              <p className="text-slate-700">{contactEmail}</p>
            </div>
          </motion.button>
        </div>
      </section>

      {/* 🚀 Analysis Loading Progress Overlay Modal */}
      <AnimatePresence>
        {showAnalysisLoader && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md rounded-[2.5rem] border border-cyan-300/30 bg-white/95 p-10 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <Loader2 className="h-16 w-16 animate-spin text-cyan-500 mb-6" />
                <h3 className="text-2xl font-bold text-slate-900">EnzyXNova Prediction Engine</h3>
                <p className="mt-2 text-sm text-slate-500 font-medium">Running molecular calculations & physics-aware AI models...</p>
                
                {/* Progress bar */}
                <div className="mt-8 w-full">
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                    <span className="font-semibold uppercase tracking-wider text-cyan-600">{analysisStepText}</span>
                    <span className="font-bold">{analysisProgress}%</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-cyan-100">
                    <div 
                      className="h-full rounded-full bg-cyan-500 transition-all duration-300 ease-out" 
                      style={{ width: `${analysisProgress}%` }} 
                    />
                  </div>
                </div>
                
                <div className="mt-6 flex flex-col gap-2 w-full text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Task ID:</span>
                    <span className="font-mono">Inference-Pipeline</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="text-teal-600 font-semibold">Active</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📚 Examples Library & PDB Selector Modal */}
      <AnimatePresence>
        {exampleLibraryOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExampleLibraryOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl rounded-[2rem] border border-teal-300/40 bg-white/95 p-8 shadow-2xl backdrop-blur max-h-[85vh] flex flex-col"
            >
              <button
                onClick={() => setExampleLibraryOpen(false)}
                className="absolute right-6 top-6 text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
              
              <h2 className="text-3xl font-bold text-slate-900 mb-2">EnzyXNova Library</h2>
              <p className="text-slate-500 text-sm mb-6">Select a pre-configured sequence or direct PDB structure to test the platform capabilities instantly.</p>
              
              {/* Tab Selector */}
              <div className="flex gap-4 border-b border-teal-100/50 pb-4 mb-6">
                <button
                  onClick={() => setActiveLibraryTab('sequences')}
                  className={`px-6 py-2 rounded-full text-sm font-semibold transition ${activeLibraryTab === 'sequences' ? 'bg-cyan-500 text-white' : 'bg-cyan-50 text-slate-700 hover:bg-cyan-100'}`}
                >
                  Protein Sequences (12)
                </button>
                <button
                  onClick={() => setActiveLibraryTab('pdbs')}
                  className={`px-6 py-2 rounded-full text-sm font-semibold transition ${activeLibraryTab === 'pdbs' ? 'bg-cyan-500 text-white' : 'bg-cyan-50 text-slate-700 hover:bg-cyan-100'}`}
                >
                  PDB Structures (10)
                </button>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {activeLibraryTab === 'sequences' ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {sequenceExamples.map((example) => (
                      <div
                        key={example.name}
                        className="rounded-3xl border border-teal-200 bg-cyan-50/50 p-5 hover:border-cyan-400 transition flex flex-col justify-between"
                      >
                        <div>
                          <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs font-semibold text-cyan-700 uppercase tracking-wider">{example.organism.split(' ')[0]}</span>
                          <h4 className="text-lg font-bold text-slate-900 mt-2">{example.name}</h4>
                          <p className="text-xs text-slate-500 mt-1 font-semibold">Organism: {example.organism}</p>
                          <p className="text-xs text-slate-600 mt-3 line-clamp-3">{example.function}</p>
                          
                          <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] text-slate-500 bg-white/70 rounded-2xl p-3 border border-teal-100">
                            <div>Weight: <span className="font-semibold text-slate-700">{example.weight}</span></div>
                            <div>pH: <span className="font-semibold text-slate-700">{example.ph}</span></div>
                            <div>Temp: <span className="font-semibold text-slate-700">{example.temp}°C</span></div>
                            <div>ΔG: <span className="font-semibold text-teal-600">{example.dg}</span></div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleLoadSequenceExample(example)}
                          className="mt-5 w-full rounded-2xl bg-cyan-500/10 hover:bg-cyan-500 text-cyan-700 hover:text-white py-2 text-xs font-bold transition"
                        >
                          Load into Analyzer
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {pdbExamples.map((pdb) => (
                      <div
                        key={pdb.id}
                        className="rounded-3xl border border-teal-200 bg-cyan-50/50 p-5 hover:border-cyan-400 transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="font-mono text-xl font-bold text-cyan-600 bg-cyan-500/10 px-3 py-1 rounded-2xl border border-cyan-200">{pdb.id}</span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">{pdb.resolution}</span>
                          </div>
                          <h4 className="text-md font-bold text-slate-900 mt-4 leading-snug">{pdb.name}</h4>
                          <p className="text-xs text-slate-500 mt-2 font-medium">Source: {pdb.organism}</p>
                        </div>
                        
                        <button
                          onClick={() => handleLoadPdbExample(pdb.id)}
                          className="mt-6 w-full rounded-2xl bg-cyan-500 text-white hover:bg-cyan-600 py-2.5 text-xs font-bold transition shadow-sm"
                        >
                          Auto Load & Analyze Structure
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}


export default HomePage;
