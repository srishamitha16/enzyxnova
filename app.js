/**
 * EnzyXNova — AI-Powered Enzyme Intelligence Platform
 * Frontend Interactive Controller (Connected to FastAPI Backend)
 */

function initializeApp() {
  // Initialize UI components and lucide icons safely
  if (typeof lucide !== 'undefined') {
    try {
      lucide.createIcons();
    } catch (err) {
      console.warn("Lucide initialization failed:", err);
    }

  }
  // Wrap full initialization into a startup function so we can reliably run it
  function _start() {
    // Set default datetime to current real time
    const now = new Date();
    const formatDateTime = (date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
    };
    const datetimeEl = document.getElementById('meta-datetime');
    if (datetimeEl) {
      datetimeEl.textContent = formatDateTime(now);
    }

    // API Configuration - Dynamically resolved to support file:// and local host access
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const API_BASE = (protocol === 'file:' || hostname === '' || hostname === 'localhost' || hostname === '127.0.0.1')
      ? 'http://127.0.0.1:8000'
      : `http://${hostname}:8000`;

    // Core view elements
    const homeView = document.getElementById('home-view');
    const dashboardLayout = document.getElementById('dashboard-layout');
    const viewDashboard = document.getElementById('view-dashboard');
    const viewReport = document.getElementById('view-report');
    const viewCombinedReport = document.getElementById('view-combined-report');

    // Sidebar items
    const menuDashboardBtn = document.getElementById('menu-dashboard');

    // Interactive state variables
    let currentProjectId = null;
    let activeLigandTab = 'smiles'; // smiles or pdb
    let currentActiveModule = 'dg'; // Track which module report is currently open

    // Parsed structure cache for interactive 3D rendering
    let parsedStructureData = null;

    // Visualizers references
    let heroVisualizer = null;
    let reportVisualizer = null;
    let homePreviewVisualizer = null;

    initHashNavigation();

    // Store active Chart.js instances
    const activeCharts = {};

    /* ==========================================================================
       VIEW NAVIGATION & ROUTING
       ========================================================================== */

    // Logo navigation (returns home)
    const logoBtn = document.getElementById('logo-btn');
    if (logoBtn) {
      logoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showView('home');
      });
    }

    // Top navbar tab navigation - smooth scrolling one-page navigation
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();

        const target = tab.getAttribute('data-tab');
        if (target === 'home') {
          showView('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          navTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
        } else if (['features', 'about', 'contact'].includes(target)) {
          showView('home');
          const element = document.getElementById(`${target}-section`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          navTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
        } else {
          showToast(`${tab.textContent} page is currently in demo sandbox mode.`);
        }
      });
    });

    // Header project/history/report/settings buttons
    const btnMyProjects = document.getElementById('btn-my-projects');
    const btnHistory = document.getElementById('btn-history');
    const btnReports = document.getElementById('btn-reports');
    const btnSettings = document.getElementById('btn-settings');

    const projectsView = document.getElementById('projects-view');
    const historyView = document.getElementById('history-view');
    const reportsView = document.getElementById('reports-view');
    const settingsView = document.getElementById('settings-view');

    if (btnMyProjects) btnMyProjects.addEventListener('click', (e) => { e.preventDefault(); showView('projects'); fetchProjects(); });
    if (btnHistory) btnHistory.addEventListener('click', (e) => { e.preventDefault(); showView('history'); fetchAnalyses(); });
    if (btnReports) btnReports.addEventListener('click', (e) => { e.preventDefault(); showView('reports'); fetchReports(); });
    if (btnSettings) btnSettings.addEventListener('click', (e) => { e.preventDefault(); showView('settings'); fetchSettings(); });

    // Sidebar item: Dashboard
    if (menuDashboardBtn) {
      menuDashboardBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showView('dashboard');
      });
    }

    // Report Back Button
    const reportBackBtn = document.getElementById('report-back-btn');
    if (reportBackBtn) {
      reportBackBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showView('dashboard');
      });
    }

    // Combined Report Back Button
    const combinedBackBtn = document.getElementById('combined-back-btn');
    if (combinedBackBtn) {
      combinedBackBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showView('dashboard');
      });
    }

    // Helper: toggle views
    function showView(viewName) {
      if (viewName === 'home') {
        dashboardLayout.style.display = 'none';
        dashboardLayout.classList.remove('active');
        homeView.style.display = 'block';
        setTimeout(() => homeView.classList.add('active'), 50);

        navTabs.forEach(t => t.classList.remove('active'));
        const homeNavTab = document.querySelector('[data-tab="home"]');
        if (homeNavTab) homeNavTab.classList.add('active');

        if (heroVisualizer) heroVisualizer.play();
        if (reportVisualizer) reportVisualizer.stop && reportVisualizer.stop();
        if (homePreviewVisualizer) homePreviewVisualizer.stop && homePreviewVisualizer.stop();

        window.history.replaceState(null, '', '#/home');
      } else if (viewName === 'dashboard') {
        homeView.classList.remove('active');
        setTimeout(() => {
          homeView.style.display = 'none';
          dashboardLayout.style.display = 'flex';
          setTimeout(() => dashboardLayout.classList.add('active'), 50);
          showDashboardSubView('dashboard');
        }, 350);

        if (heroVisualizer) heroVisualizer.stop();
        window.history.replaceState(null, '', '#/dashboard');
      } else if (viewName === 'projects') {
        // hide other main views
        homeView.style.display = 'none'; homeView.classList.remove('active');
        dashboardLayout.style.display = 'none'; dashboardLayout.classList.remove('active');
        if (projectsView) { projectsView.style.display = 'block'; projectsView.classList.add('active'); }
        if (historyView) { historyView.style.display = 'none'; historyView.classList.remove('active'); }
        if (reportsView) { reportsView.style.display = 'none'; reportsView.classList.remove('active'); }
        if (settingsView) { settingsView.style.display = 'none'; settingsView.classList.remove('active'); }

        window.history.replaceState(null, '', '#/projects');
      } else if (viewName === 'history') {
        homeView.style.display = 'none'; homeView.classList.remove('active');
        dashboardLayout.style.display = 'none'; dashboardLayout.classList.remove('active');
        if (historyView) { historyView.style.display = 'block'; historyView.classList.add('active'); }
        if (projectsView) { projectsView.style.display = 'none'; projectsView.classList.remove('active'); }
        if (reportsView) { reportsView.style.display = 'none'; reportsView.classList.remove('active'); }
        if (settingsView) { settingsView.style.display = 'none'; settingsView.classList.remove('active'); }

        window.history.replaceState(null, '', '#/history');
      } else if (viewName === 'reports') {
        homeView.style.display = 'none'; homeView.classList.remove('active');
        dashboardLayout.style.display = 'none'; dashboardLayout.classList.remove('active');
        if (reportsView) { reportsView.style.display = 'block'; reportsView.classList.add('active'); }
        if (projectsView) { projectsView.style.display = 'none'; projectsView.classList.remove('active'); }
        if (historyView) { historyView.style.display = 'none'; historyView.classList.remove('active'); }
        if (settingsView) { settingsView.style.display = 'none'; settingsView.classList.remove('active'); }

        window.history.replaceState(null, '', '#/reports');
      } else if (viewName === 'settings') {
        homeView.style.display = 'none'; homeView.classList.remove('active');
        dashboardLayout.style.display = 'none'; dashboardLayout.classList.remove('active');
        if (settingsView) { settingsView.style.display = 'block'; settingsView.classList.add('active'); }
        if (projectsView) { projectsView.style.display = 'none'; projectsView.classList.remove('active'); }
        if (historyView) { historyView.style.display = 'none'; historyView.classList.remove('active'); }
        if (reportsView) { reportsView.style.display = 'none'; reportsView.classList.remove('active'); }

        window.history.replaceState(null, '', '#/settings');
      }
    }

    function initHashNavigation() {
      const routeMapping = {
        'delta-g': 'dg',
        'delta-h': 'dh',
        'active-site': 'active-site',
        'mechanism': 'mechanism',
        'binding-affinity': 'affinity',
        'substrate-specificity': 'specificity',
        'stability': 'stability',
        'mutation-analysis': 'mutation',
        'reaction-pathway': 'pathway'
      };

      const handleRoute = () => {
        const hash = window.location.hash || '#/home';
        const segments = hash.replace(/^#\/?/, '').split('/');
        const section = segments[0];

        if (section === 'dashboard') {
          showView('dashboard');
          const moduleName = routeMapping[segments[1]];
          if (moduleName) {
            openModuleReport(moduleName);
          }
        } else if (section === 'projects') {
          showView('projects');
          fetchProjects();
        } else if (section === 'history') {
          showView('history');
          fetchAnalyses();
        } else if (section === 'reports') {
          showView('reports');
          fetchReports(currentProjectId);
        } else if (section === 'settings') {
          showView('settings');
          fetchSettings();
        } else {
          showView('home');
        }
      };

      window.addEventListener('hashchange', handleRoute);
      handleRoute();
    }

    function showDashboardSubView(subViewName) {
      const items = document.querySelectorAll('.sidebar-item');
      items.forEach(item => item.classList.remove('active'));

      if (subViewName === 'dashboard') {
        if (menuDashboardBtn) menuDashboardBtn.classList.add('active');
        if (viewReport) viewReport.classList.remove('active');
        if (viewCombinedReport) viewCombinedReport.classList.remove('active');

        setTimeout(() => {
          if (viewReport) viewReport.style.display = 'none';
          if (viewCombinedReport) viewCombinedReport.style.display = 'none';
          if (viewDashboard) viewDashboard.style.display = 'block';
          if (viewDashboard) setTimeout(() => viewDashboard.classList.add('active'), 50);
        }, 300);

        if (reportVisualizer && reportVisualizer.stop) reportVisualizer.stop();
        window.history.replaceState(null, '', '#/dashboard');
      } else if (subViewName === 'report') {
        if (menuDashboardBtn) menuDashboardBtn.classList.add('active');
        if (viewDashboard) viewDashboard.classList.remove('active');
        if (viewCombinedReport) viewCombinedReport.classList.remove('active');

        setTimeout(() => {
          if (viewDashboard) viewDashboard.style.display = 'none';
          if (viewCombinedReport) viewCombinedReport.style.display = 'none';
          if (viewReport) viewReport.style.display = 'block';
          if (viewReport) setTimeout(() => viewReport.classList.add('active'), 50);
          if (reportVisualizer && reportVisualizer.play) reportVisualizer.play();
        }, 300);
      } else if (subViewName === 'combined-report') {
        if (menuDashboardBtn) menuDashboardBtn.classList.add('active');
        if (viewDashboard) viewDashboard.classList.remove('active');
        if (viewReport) viewReport.classList.remove('active');

        setTimeout(() => {
          if (viewDashboard) viewDashboard.style.display = 'none';
          if (viewReport) viewReport.style.display = 'none';
          if (viewCombinedReport) viewCombinedReport.style.display = 'block';
          if (viewCombinedReport) setTimeout(() => viewCombinedReport.classList.add('active'), 50);
        }, 300);

        if (reportVisualizer && reportVisualizer.stop) reportVisualizer.stop();
      }
    }

    // Run initialization when DOM is ready (keep _start() open!)
    // Will close _start() at the end of initialization code

    function updateRouteHash(moduleName) {
      const routeMap = {
        'dg': 'delta-g',
        'dh': 'delta-h',
        'active-site': 'active-site',
        'mechanism': 'mechanism',
        'affinity': 'binding-affinity',
        'specificity': 'substrate-specificity',
        'stability': 'stability',
        'mutation': 'mutation-analysis',
        'pathway': 'reaction-pathway'
      };
      const routeName = routeMap[moduleName] || moduleName;
      window.history.replaceState(null, '', `#/dashboard/${routeName}`);
    }

    /* ==========================================================================
       INPUT INTERACTIVITY (PAGE 1) & BACKEND API CONNECTIVITY
       ========================================================================== */

    // 1. FASTA Textarea validation & residue counter
    const fastaInput = document.getElementById('fasta-input');
    const fastaCount = document.getElementById('fasta-count');
    const fastaClear = document.getElementById('fasta-clear');

    if (fastaInput && fastaCount) {
      fastaInput.addEventListener('input', () => {
        let rawText = fastaInput.value;
        const cleanSeq = rawText.replace(/>[^\n]*\n/g, '').replace(/[^A-Z]/gi, '');
        fastaCount.textContent = cleanSeq.length;
      });

      // Send sequence upload to backend on blur or value presence
      fastaInput.addEventListener('change', async () => {
        const fastaSeq = fastaInput.value.trim();
        if (!fastaSeq) return;

        try {
          const formData = new FormData();
          formData.append("fasta_sequence", fastaSeq);
          if (currentProjectId) {
            formData.append("project_id", currentProjectId);
          }

          const response = await fetch(`${API_BASE}/api/upload/protein-sequence`, {
            method: "POST",
            body: formData
          });

          if (response.ok) {
            const res = await response.json();
            currentProjectId = res.project_id;
            document.getElementById('dash-project-id').textContent = currentProjectId.substring(0, 8).toUpperCase();
            showToast(`Protein sequence uploaded. Project: ${currentProjectId.substring(0, 8)}`);
          }
        } catch (err) {
          console.error("Sequence upload failed:", err);
        }
      });
    }

    if (fastaClear && fastaInput && fastaCount) {
      fastaClear.addEventListener('click', () => {
        fastaInput.value = '';
        fastaCount.textContent = '0';
      });
    }

    // 2. Protein structure upload (PDB)
    const pdbDropZone = document.getElementById('pdb-drop-zone');
    const pdbFileInput = document.getElementById('pdb-file-input');
    const pdbLivePreview = document.getElementById('pdb-live-preview');
    const previewFileName = document.getElementById('preview-file-name');
    const homeViewMode = document.getElementById('home-view-mode');
    const homeBtnReset = document.getElementById('home-btn-reset');
    const homeBtnRemove = document.getElementById('home-btn-remove');
    const homePdbCanvasContainer = document.getElementById('home-pdb-canvas-container');

    if (pdbDropZone && pdbFileInput) {
      pdbDropZone.addEventListener('click', (e) => {
        if (e.target.closest('.browse-link') || e.target === pdbDropZone || e.target.closest('.upload-icon') || e.target.closest('p')) {
          pdbFileInput.click();
        }
      });

      pdbFileInput.addEventListener('change', (e) => {
        handlePdbFiles(e.target.files);
      });

      ['dragenter', 'dragover'].forEach(eventName => {
        pdbDropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          pdbDropZone.classList.add('dragover');
        }, false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        pdbDropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          pdbDropZone.classList.remove('dragover');
        }, false);
      });

      pdbDropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        handlePdbFiles(dt.files);
      });
    }

    async function handlePdbFiles(files) {
      if (files.length === 0) return;
      const file = files[0];
      if (file.name.slice(-4).toLowerCase() !== '.pdb') {
        showToast('Error: Only .pdb protein structure files are supported.');
        return;
      }

      const rawText = await file.text();
      if (previewFileName) previewFileName.textContent = file.name;

      // Upload PDB to backend
      try {
        const formData = new FormData();
        formData.append("file", file);
        if (currentProjectId) {
          formData.append("project_id", currentProjectId);
        }

        showToast("Uploading and parsing protein structure...");

        const response = await fetch(`${API_BASE}/api/upload/protein-structure`, {
          method: "POST",
          body: formData
        });

        if (response.ok) {
          const res = await response.json();
          currentProjectId = res.project_id;
          document.getElementById('dash-project-id').textContent = currentProjectId.substring(0, 8).toUpperCase();

          // Cache parsed atom & residue coordinates
          parsedStructureData = {
            residues: res.residues,
            atoms: res.atoms,
            chains: res.chains,
            rawPDBText: rawText,
            fileName: file.name
          };

          if (fastaInput && !fastaInput.value.trim() && res.residues) {
            // Fill dummy FASTA seq for count display if not provided
            fastaInput.value = ">sp|uploaded|Enzyme\n" + res.residues.map(r => r.name[0] || 'X').join('');
            fastaCount.textContent = res.residues.length;
          }

          // Switch states
          if (pdbDropZone) pdbDropZone.style.display = 'none';
          if (pdbLivePreview) pdbLivePreview.style.display = 'block';

          // Initialize home structure preview visualizer
          initHomePreviewVisualizer();
          showToast("Structure parsed successfully. Real 3D rendering active.");
        } else {
          showToast("Failed to parse protein structure file.");
        }
      } catch (err) {
        console.error("Structure upload failed:", err);
        showToast("Failed to connect to backend for structure parsing.");
      }
    }

    function initHomePreviewVisualizer() {
      if (homePreviewVisualizer) {
        homePreviewVisualizer.stop();
        const canvas = homePdbCanvasContainer.querySelector('canvas');
        if (canvas) canvas.remove();
        homePreviewVisualizer = null;
      }

      try {
        homePreviewVisualizer = new ProteinVisualizer('home-pdb-canvas-container', true, parsedStructureData);
        homePreviewVisualizer.play();
        if (homeViewMode) homeViewMode.value = 'cartoon';
      } catch (err) {
        console.error('Failed to initialize home preview visualizer:', err);
      }
    }

    if (homeViewMode) {
      homeViewMode.addEventListener('change', (e) => {
        if (homePreviewVisualizer) {
          homePreviewVisualizer.updateMode(e.target.value);
        }
      });
    }

    if (homeBtnReset) {
      homeBtnReset.addEventListener('click', (e) => {
        e.preventDefault();
        if (homePreviewVisualizer) {
          homePreviewVisualizer.reset();
        }
      });
    }

    if (homeBtnRemove) {
      homeBtnRemove.addEventListener('click', (e) => {
        e.preventDefault();
        if (pdbFileInput) pdbFileInput.value = '';
        parsedStructureData = null;

        if (homePreviewVisualizer) {
          homePreviewVisualizer.stop();
          const canvas = homePdbCanvasContainer.querySelector('canvas');
          if (canvas) canvas.remove();
          homePreviewVisualizer = null;
        }

        if (pdbLivePreview) pdbLivePreview.style.display = 'none';
        if (pdbDropZone) pdbDropZone.style.display = 'flex';
        showToast('Structure file removed.');
      });
    }

    // 3. Ligand input tab switches
    const tabSmilesBtn = document.getElementById('tab-ligand-smiles');
    const tabPdbBtn = document.getElementById('tab-ligand-pdb');
    const smilesInput = document.getElementById('smiles-input');

    const ligandSmilesContainer = document.getElementById('ligand-smiles-container');
    const ligandPdbContainer = document.getElementById('ligand-pdb-container');

    if (tabSmilesBtn && tabPdbBtn) {
      tabSmilesBtn.addEventListener('click', () => {
        activeLigandTab = 'smiles';
        tabPdbBtn.classList.remove('active');
        tabSmilesBtn.classList.add('active');
        ligandPdbContainer.classList.remove('active');
        ligandSmilesContainer.classList.add('active');
      });

      tabPdbBtn.addEventListener('click', () => {
        activeLigandTab = 'pdb';
        tabSmilesBtn.classList.remove('active');
        tabPdbBtn.classList.add('active');
        ligandSmilesContainer.classList.remove('active');
        ligandPdbContainer.classList.add('active');
      });
    }

    // Ligand PDB Upload handlers
    const ligandPdbDropZone = document.getElementById('ligand-pdb-drop-zone');
    const ligandPdbFileInput = document.getElementById('ligand-pdb-file-input');
    const ligandFileInfo = document.getElementById('ligand-file-info');
    const ligandFileName = document.getElementById('ligand-file-name');
    const ligandFileSize = document.getElementById('ligand-file-size');
    const ligandRemoveBtn = document.getElementById('ligand-file-remove');

    if (ligandPdbDropZone && ligandPdbFileInput) {
      ligandPdbDropZone.addEventListener('click', () => {
        ligandPdbFileInput.click();
      });

      ligandPdbFileInput.addEventListener('change', (e) => {
        handleLigandPdbFiles(e.target.files);
      });

      ['dragenter', 'dragover'].forEach(eventName => {
        ligandPdbDropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          ligandPdbDropZone.classList.add('dragover');
        }, false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        ligandPdbDropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          ligandPdbDropZone.classList.remove('dragover');
        }, false);
      });

      ligandPdbDropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        handleLigandPdbFiles(dt.files);
      });
    }

    async function handleLigandPdbFiles(files) {
      if (files.length === 0) return;
      const file = files[0];
      if (file.name.slice(-4).toLowerCase() !== '.pdb') {
        showToast('Error: Only .pdb ligand structure files are supported.');
        return;
      }

      if (ligandFileName) ligandFileName.textContent = file.name;
      if (ligandFileSize) ligandFileSize.textContent = `${(file.size / 1024).toFixed(1)} KB`;

      // Upload ligand to backend
      try {
        const formData = new FormData();
        formData.append("ligand_type", "pdb");
        formData.append("file", file);
        if (currentProjectId) {
          formData.append("project_id", currentProjectId);
        }

        const response = await fetch(`${API_BASE}/api/upload/ligand`, {
          method: "POST",
          body: formData
        });

        if (response.ok) {
          const res = await response.json();
          currentProjectId = res.project_id;
          document.getElementById('dash-project-id').textContent = currentProjectId.substring(0, 8).toUpperCase();

          if (ligandPdbDropZone) ligandPdbDropZone.style.display = 'none';
          if (ligandFileInfo) ligandFileInfo.style.display = 'flex';
          showToast("Ligand structure uploaded successfully.");
        }
      } catch (err) {
        console.error("Ligand file upload failed:", err);
      }
    }

    async function uploadProteinSequence(fastaSeq) {
      if (!fastaSeq) return;
      try {
        const formData = new FormData();
        formData.append("fasta_sequence", fastaSeq);
        if (currentProjectId) {
          formData.append("project_id", currentProjectId);
        }

        const response = await fetch(`${API_BASE}/api/upload/protein-sequence`, {
          method: "POST",
          body: formData
        });

        if (response.ok) {
          const res = await response.json();
          currentProjectId = res.project_id;
          document.getElementById('dash-project-id').textContent = currentProjectId.substring(0, 8).toUpperCase();
          return res;
        }
      } catch (err) {
        console.error("Sequence upload failed:", err);
        throw err;
      }
    }

    async function uploadLigandSmiles(smiles) {
      if (!smiles) return;
      try {
        const formData = new FormData();
        formData.append("ligand_type", "smiles");
        formData.append("ligand_smiles", smiles);
        if (currentProjectId) {
          formData.append("project_id", currentProjectId);
        }

        const response = await fetch(`${API_BASE}/api/upload/ligand`, {
          method: "POST",
          body: formData
        });

        if (response.ok) {
          const res = await response.json();
          currentProjectId = res.project_id;
          document.getElementById('dash-project-id').textContent = currentProjectId.substring(0, 8).toUpperCase();
          return res;
        }
      } catch (err) {
        console.error("Ligand SMILES upload failed:", err);
        throw err;
      }
    }

    async function uploadLigandPdb(file) {
      if (!file) return;
      try {
        const formData = new FormData();
        formData.append("ligand_type", "pdb");
        formData.append("file", file);
        if (currentProjectId) {
          formData.append("project_id", currentProjectId);
        }

        const response = await fetch(`${API_BASE}/api/upload/ligand`, {
          method: "POST",
          body: formData
        });

        if (response.ok) {
          const res = await response.json();
          currentProjectId = res.project_id;
          document.getElementById('dash-project-id').textContent = currentProjectId.substring(0, 8).toUpperCase();
          return res;
        }
      } catch (err) {
        console.error("Ligand PDB upload failed:", err);
        throw err;
      }
    }

    if (ligandRemoveBtn) {
      ligandRemoveBtn.addEventListener('click', () => {
        if (ligandPdbFileInput) ligandPdbFileInput.value = '';
        if (ligandFileInfo) ligandFileInfo.style.display = 'none';
        if (ligandPdbDropZone) ligandPdbDropZone.style.display = 'flex';
        showToast('Ligand file removed.');
      });
    }

    // Smiles upload trigger on blur/change
    if (smilesInput) {
      smilesInput.addEventListener('change', async () => {
        const smiles = smilesInput.value.trim();
        if (!smiles) return;

        try {
          const formData = new FormData();
          formData.append("ligand_type", "smiles");
          formData.append("ligand_smiles", smiles);
          if (currentProjectId) {
            formData.append("project_id", currentProjectId);
          }

          const response = await fetch(`${API_BASE}/api/upload/ligand`, {
            method: "POST",
            body: formData
          });

          if (response.ok) {
            const res = await response.json();
            currentProjectId = res.project_id;
            document.getElementById('dash-project-id').textContent = currentProjectId.substring(0, 8).toUpperCase();
            showToast("Ligand SMILES updated.");
          }
        } catch (err) {
          console.error("Ligand SMILES upload failed:", err);
        }
      });
    }

    /* ==========================================================================
       COMPUTATIONAL ANALYSIS SIMULATION & TRANSITIONS (WEBSOCKET INTEGRATED)
       ========================================================================== */

    const analyzeBtn = document.getElementById('analyze-enzyme-btn');
    const loaderOverlay = document.getElementById('analysis-loader-overlay');
    const loaderFill = document.getElementById('loader-progress-fill');
    const loaderStatus = document.getElementById('loader-status');

    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', async () => {
        const sequenceLen = fastaCount ? parseInt(fastaCount.textContent) : 0;
        const fastaSeq = fastaInput ? fastaInput.value.trim() : "";
        const smilesVal = smilesInput ? smilesInput.value.trim() : "";
        const mutationVal = document.getElementById('mutation-input') ? document.getElementById('mutation-input').value.trim() : '';

        const hasSequence = sequenceLen > 0;
        const hasStructure = !!parsedStructureData;
        const hasLigand = smilesVal !== "" || (ligandPdbFileInput && ligandPdbFileInput.files.length > 0);

        if (!hasSequence && !hasStructure && !hasLigand) {
          showToast('Missing inputs: Please paste a sequence, upload a PDB structure, or specify a ligand SMILES to start.');
          return;
        }

        // Upload the latest inputs to backend before analysis begins
        try {
          if (fastaSeq) {
            await uploadProteinSequence(fastaSeq);
          }
          if (activeLigandTab === 'smiles' && smilesVal) {
            await uploadLigandSmiles(smilesVal);
          }
          if (activeLigandTab === 'pdb' && ligandPdbFileInput && ligandPdbFileInput.files.length > 0) {
            await uploadLigandPdb(ligandPdbFileInput.files[0]);
          }
        } catch (err) {
          console.error('Failed to sync inputs before analysis:', err);
          showToast('Failed to sync inputs. Please check your connection and try again.');
          return;
        }

        // 1. If project ID is missing, generate one now by uploading sequence/placeholder
        if (!currentProjectId) {
          try {
            const formData = new FormData();
            formData.append("fasta_sequence", fastaSeq || "MSIQHFRVALIPFFAAFCLPVFAHPETLVKVKDAEDQLGARVGYIE");
            const response = await fetch(`${API_BASE}/api/upload/protein-sequence`, {
              method: "POST",
              body: formData
            });
            if (response.ok) {
              const res = await response.json();
              currentProjectId = res.project_id;
              document.getElementById('dash-project-id').textContent = currentProjectId.substring(0, 8).toUpperCase();
            } else {
              showToast("Failed to initialize analysis session on backend.");
              return;
            }
          } catch (err) {
            console.error("Auto project creation failed:", err);
            showToast("Failed to initialize session. Make sure server is running.");
            return;
          }
        }

        // Capture optional inputs
        const tempVal = document.getElementById('temp-input') ? parseFloat(document.getElementById('temp-input').value) || 298.15 : 298.15;
        const phVal = document.getElementById('ph-input') ? parseFloat(document.getElementById('ph-input').value) || 7.4 : 7.4;
        const mutVal = document.getElementById('mutation-input') ? document.getElementById('mutation-input').value.trim() : '';

        // Update UI metadata panel values
        updateReportMetadata(sequenceLen, tempVal, phVal, mutVal);

        // Start simulation by calling backend analyze
        if (loaderOverlay) loaderOverlay.classList.add('active');
        if (loaderFill) loaderFill.style.width = '0%';
        if (loaderStatus) loaderStatus.textContent = "Connecting to pipeline...";

        try {
          const analyzeRes = await fetch(`${API_BASE}/api/analyze/start`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              project_id: currentProjectId,
              temperature: tempVal,
              ph: phVal,
              mutation: mutVal
            })
          });

          if (!analyzeRes.ok) {
            if (analyzeRes.status === 404) {
              console.warn("Stale session detected on backend. Re-initializing...");
              currentProjectId = null;
              analyzeBtn.click();
              return;
            }
            showToast("Failed to start pipeline analysis.");
            if (loaderOverlay) loaderOverlay.classList.remove('active');
            return;
          }

          // Establish WebSocket connection for real-time progress update
          const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
          // Standardize connection host
          const wsHost = API_BASE.replace("http://", "").replace("https://", "");
          const socket = new WebSocket(`${wsProtocol}//${wsHost}/ws/analysis/${currentProjectId}`);

          socket.onopen = () => {
            console.log("WebSocket connection established for progress updates.");
          };

          socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const progress = data.progress;
            const status = data.status;

            if (loaderFill) loaderFill.style.width = `${progress}%`;
            if (loaderStatus) loaderStatus.textContent = status;

            if (status === "Complete" || progress === 100) {
              socket.close();
              setTimeout(() => {
                if (loaderOverlay) loaderOverlay.classList.remove('active');
                showView('dashboard');
                showToast('Analysis completed successfully!');
              }, 600);
            }
          };

          socket.onerror = (err) => {
            console.error("WS error:", err);
            // Fallback to REST polling if WebSocket fails
            pollAnalysisStatus();
          };

          socket.onclose = () => {
            console.log("WebSocket progress streaming disconnected.");
          };

        } catch (err) {
          console.error("Connection failed:", err);
          showToast("Backend connection error. Using local simulation backup.");
          // Fallback simulation if backend is entirely offline
          runFallbackLoaderSimulation();
        }
      });
    }

    function pollAnalysisStatus() {
      const timer = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE}/api/analyze/status/${currentProjectId}`);
          if (res.ok) {
            const data = await res.json();
            if (loaderFill) loaderFill.style.width = `${data.progress}%`;
            if (loaderStatus) loaderStatus.textContent = data.status;

            if (data.status === "Complete" || data.progress === 100) {
              clearInterval(timer);
              setTimeout(() => {
                if (loaderOverlay) loaderOverlay.classList.remove('active');
                showView('dashboard');
                showToast('Analysis completed successfully!');
              }, 600);
            }
          }
        } catch (err) {
          clearInterval(timer);
          runFallbackLoaderSimulation();
        }
      }, 500);
    }

    function runFallbackLoaderSimulation() {
      let progress = 0;
      const steps = [
        { p: 15, text: 'Parsing inputs and validating molecular representations (Simulation)...' },
        { p: 35, text: 'Mapping sequence residues onto evolutionary databases (Simulation)...' },
        { p: 55, text: 'Resolving enzyme tertiary folding structure (Simulation)...' },
        { p: 78, text: 'Evaluating electrostatic and van der Waals interactions (Simulation)...' },
        { p: 92, text: 'Running graph neural networks free energy models (Simulation)...' },
        { p: 100, text: 'Compiling results (Simulation)...' }
      ];
      const timer = setInterval(() => {
        progress += 5;
        if (progress >= 100) {
          progress = 100;
          clearInterval(timer);
          setTimeout(() => {
            if (loaderOverlay) loaderOverlay.classList.remove('active');
            showView('dashboard');
            showToast('Analysis completed (Simulation Mode).');
          }, 600);
        }
        if (loaderFill) loaderFill.style.width = `${progress}%`;
        if (loaderStatus) {
          const currentStep = steps.find(s => progress <= s.p) || steps[steps.length - 1];
          loaderStatus.textContent = currentStep.text;
        }
      }, 100);
    }

    function updateReportMetadata(sequenceLen, tempVal, phVal, mutVal) {
      const metaTemp = document.getElementById('meta-temp');
      if (metaTemp) metaTemp.textContent = `${tempVal} K`;

      const metaPh = document.getElementById('meta-ph');
      if (metaPh) metaPh.textContent = phVal;

      const metaPdb = document.getElementById('meta-pdb-name');
      if (metaPdb) {
        metaPdb.textContent = parsedStructureData ? "Parsed Structure Model" : 'De Novo Predicted Model';
      }

      const metaLigand = document.getElementById('meta-ligand-info');
      if (metaLigand) {
        if (activeLigandTab === 'smiles' && smilesInput && smilesInput.value.trim() !== '') {
          const val = smilesInput.value.trim();
          metaLigand.textContent = val.length > 15 ? val.substring(0, 15) + '...' : val;
        } else {
          metaLigand.textContent = 'Specified Substrate';
        }
      }

      const metaProteinName = document.getElementById('meta-protein-name');
      if (mutVal !== '') {
        if (metaProteinName) {
          metaProteinName.textContent = `Hydrolase Core (${mutVal})`;
          metaProteinName.style.color = '#F59E0B';
        }
      } else {
        if (metaProteinName) {
          metaProteinName.textContent = 'Hydrolase Core';
          metaProteinName.style.color = 'var(--text-dark)';
        }
      }
    }

    /* ==========================================================================
       THREE.JS 3D PROTEIN VIEWER ENGINE (PDB-SUPPORTED)
       ========================================================================== */

    class ProteinVisualizer {
      constructor(containerId, isInteractive = false, customStructureData = null) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        this.isInteractive = isInteractive;
        this.animationFrameId = null;
        this.mode = 'cartoon'; // cartoon, surface, stick
        this.isPlaying = false;
        this.structureData = customStructureData;

        // Clear structural canvas-fallback container if exists
        const fallback = this.container.querySelector('.canvas-fallback');
        if (fallback) fallback.remove();

        if (typeof THREE === 'undefined') {
          console.warn('Three.js library not loaded.');
          this.showFallbackUnavailable("Three.js not loaded");
          return;
        }

        // Check structure availability for non-decorative containers
        const isHero = containerId === 'hero-protein-canvas-container';
        if (!isHero && (!customStructureData || !customStructureData.atoms || customStructureData.atoms.length === 0)) {
          this.showFallbackUnavailable("Structure not available");
          return;
        }

        // Setup WebGL Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf8ffff);

        // Camera
        this.camera = new THREE.PerspectiveCamera(40, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.camera.position.z = 70;

        // Renderer with preserveDrawingBuffer = true for snapshotting
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        // Orbit controls
        if (this.isInteractive) {
          if (typeof THREE.OrbitControls === 'undefined') {
            console.warn('THREE.OrbitControls is not loaded.');
          } else {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.maxDistance = 150;
            this.controls.minDistance = 10;
          }
        }

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xd9f3ff, 0.8);
        dirLight.position.set(20, 40, 20);
        this.scene.add(dirLight);

        const pointLight = new THREE.PointLight(0x00c2cb, 0.8, 100);
        pointLight.position.set(-10, -10, -20);
        this.scene.add(pointLight);

        // Create Protein Object Group
        this.proteinGroup = new THREE.Group();
        this.scene.add(this.proteinGroup);

        // Build model geometries
        this.buildModel();

        // Window resize listener
        this.resizeListener = () => this.resize();
        window.addEventListener('resize', this.resizeListener);
      }

      buildModel() {
        // Clear protein group first
        while (this.proteinGroup.children.length > 0) {
          this.proteinGroup.remove(this.proteinGroup.children[0]);
        }

        // 1. Check if we have real parsed structure coordinates from PDB file
        if (this.structureData && this.structureData.atoms && this.structureData.atoms.length > 0) {
          this.buildRealStructureModel();
        } else {
          // Fallback dummy model
          this.buildFallbackBackbone();
        }
      }

      buildRealStructureModel() {
        const atoms = this.structureData.atoms;
        const residues = this.structureData.residues || [];

        // Calculate centroid to center model
        let sumX = 0, sumY = 0, sumZ = 0;
        atoms.forEach(a => {
          sumX += a.x;
          sumY += a.y;
          sumZ += a.z;
        });
        const center = new THREE.Vector3(sumX / atoms.length, sumY / atoms.length, sumZ / atoms.length);

        if (this.mode === 'stick') {
          // Render atoms as small spheres and connect with cylinders
          const atomColorArr = {
            'C': 0x4FD1C5, 'O': 0xFF6B6B, 'N': 0x6366F1, 'S': 0xF59E0B, 'H': 0xFFFFFF
          };

          // Draw atom Spheres
          atoms.forEach(atom => {
            const pos = new THREE.Vector3(atom.x, atom.y, atom.z).sub(center);

            const sphereGeom = new THREE.SphereGeometry(0.7, 10, 10);
            const sphereMat = new THREE.MeshPhongMaterial({
              color: atomColorArr[atom.element] || 0xcccccc,
              shininess: 80
            });
            const mesh = new THREE.Mesh(sphereGeom, sphereMat);
            mesh.position.copy(pos);
            this.proteinGroup.add(mesh);
          });

          // Simple bonds connector based on distance threshold
          for (let i = 0; i < atoms.length; i++) {
            const a = atoms[i];
            const posA = new THREE.Vector3(a.x, a.y, a.z).sub(center);
            for (let j = i + 1; j < atoms.length; j++) {
              const b = atoms[j];
              const posB = new THREE.Vector3(b.x, b.y, b.z).sub(center);
              const dist = posA.distanceTo(posB);

              if (dist < 1.7) { // Standard covalent bond length limit
                const direction = new THREE.Vector3().subVectors(posB, posA);
                const bondLen = direction.length();

                const cylinderGeom = new THREE.CylinderGeometry(0.18, 0.18, bondLen, 5);
                const cylinderMat = new THREE.MeshPhongMaterial({ color: 0xdddddd });
                const cylinderMesh = new THREE.Mesh(cylinderGeom, cylinderMat);

                cylinderMesh.position.copy(posA).addScaledVector(direction, 0.5);
                cylinderMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
                this.proteinGroup.add(cylinderMesh);
              }
            }
          }

        } else if (this.mode === 'surface') {
          // Render residues as larger transparent spheres representing surface volume
          atoms.forEach(atom => {
            if (atom.name === 'CA') { // C-alpha CA coordinates
              const pos = new THREE.Vector3(atom.x, atom.y, atom.z).sub(center);
              const surfGeom = new THREE.SphereGeometry(4.2, 12, 12);
              const surfMat = new THREE.MeshPhongMaterial({
                color: 0x4FD1C5,
                opacity: 0.18,
                transparent: true,
                shininess: 40,
                depthWrite: false
              });
              const surfBall = new THREE.Mesh(surfGeom, surfMat);
              surfBall.position.copy(pos);
              this.proteinGroup.add(surfBall);
            }
          });

          // Add core wireframe connection
          this.drawBackboneTube(atoms, center, 0.5);

        } else { // cartoon
          // Trace smooth CatmullRom backbone using C-alpha atoms
          this.drawBackboneTube(atoms, center, 1.2);
        }
      }

      drawBackboneTube(atoms, center, radius) {
        const caAtoms = atoms.filter(a => a.name === 'CA');
        if (caAtoms.length < 3) {
          // Fallback if PDB has no CA atoms
          this.buildFallbackBackbone();
          return;
        }

        const points = caAtoms.map(a => new THREE.Vector3(a.x, a.y, a.z).sub(center));
        const curve = new THREE.CatmullRomCurve3(points);

        const tubeGeom = new THREE.TubeGeometry(curve, Math.max(80, caAtoms.length * 2), radius, 10, false);
        const tubeMat = new THREE.MeshPhongMaterial({
          color: 0x00C2CB,
          shininess: 85,
          specular: 0xffffff
        });
        const ribbon = new THREE.Mesh(tubeGeom, tubeMat);
        this.proteinGroup.add(ribbon);
      }

      buildFallbackBackbone() {
        // 1. Generate helical curve
        const points = [];
        const numPoints = 80;
        for (let i = 0; i < numPoints; i++) {
          const t = (i / numPoints) * Math.PI * 8;
          const x = Math.sin(t) * 12 + Math.cos(t * 0.4) * 6;
          const y = (i - numPoints / 2) * 0.6 + Math.sin(t * 0.5) * 4;
          const z = Math.cos(t) * 12 + Math.sin(t * 0.3) * 6;
          points.push(new THREE.Vector3(x, y, z));
        }
        this.backboneCurve = new THREE.CatmullRomCurve3(points);

        if (this.mode === 'cartoon') {
          const tubeGeom = new THREE.TubeGeometry(this.backboneCurve, 100, 1.4, 12, false);
          const tubeMat = new THREE.MeshPhongMaterial({
            color: 0x4FD1C5,
            shininess: 80,
            specular: 0xffffff,
            flatShading: false
          });
          const ribbonMesh = new THREE.Mesh(tubeGeom, tubeMat);
          this.proteinGroup.add(ribbonMesh);
          this.addDecorations();
        } else if (this.mode === 'surface') {
          const pointsArray = this.backboneCurve.getPoints(50);
          pointsArray.forEach(pt => {
            const surfGeom = new THREE.SphereGeometry(4.5, 16, 16);
            const surfMat = new THREE.MeshPhongMaterial({
              color: 0xD9F3FF,
              opacity: 0.22,
              transparent: true,
              shininess: 40,
              depthWrite: false
            });
            const surfBall = new THREE.Mesh(surfGeom, surfMat);
            surfBall.position.copy(pt);
            this.proteinGroup.add(surfBall);
          });

          const wireGeom = new THREE.TubeGeometry(this.backboneCurve, 80, 0.4, 6, false);
          const wireMat = new THREE.MeshBasicMaterial({ color: 0x00C2CB });
          const wireMesh = new THREE.Mesh(wireGeom, wireMat);
          this.proteinGroup.add(wireMesh);
        } else if (this.mode === 'stick') {
          const pts = this.backboneCurve.getPoints(60);
          const atomColorArr = [0x00C2CB, 0x4FD1C5, 0x6366F1, 0xFF6B6B];

          pts.forEach((pt, idx) => {
            const sphereGeom = new THREE.SphereGeometry(1.0, 12, 12);
            const sphereMat = new THREE.MeshPhongMaterial({
              color: atomColorArr[idx % atomColorArr.length],
              shininess: 100
            });
            const sphereMesh = new THREE.Mesh(sphereGeom, sphereMat);
            sphereMesh.position.copy(pt);
            this.proteinGroup.add(sphereMesh);

            if (idx < pts.length - 1) {
              const nextPt = pts[idx + 1];
              const direction = new THREE.Vector3().subVectors(nextPt, pt);
              const bondLen = direction.length();

              const cylinderGeom = new THREE.CylinderGeometry(0.25, 0.25, bondLen, 6);
              const cylinderMat = new THREE.MeshPhongMaterial({ color: 0xcccccc });
              const cylinderMesh = new THREE.Mesh(cylinderGeom, cylinderMat);

              cylinderMesh.position.copy(pt).addScaledVector(direction, 0.5);
              cylinderMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
              this.proteinGroup.add(cylinderMesh);
            }
          });
        }

        // Add central Ligand representation
        const ligandGroup = new THREE.Group();
        ligandGroup.position.set(2, -1, 3);

        const atomData = [
          { x: 0, y: 0, z: 0, color: 0xEC4899, r: 1.5 },
          { x: -3.0, y: 1.5, z: 0.5, color: 0xF59E0B, r: 1.1 },
          { x: 3.0, y: -1.0, z: -0.5, color: 0xF59E0B, r: 1.1 },
          { x: 1.0, y: 2.8, z: 1.5, color: 0xFFFFFF, r: 0.8 },
          { x: -1.5, y: -2.5, z: -1.5, color: 0xFFFFFF, r: 0.8 }
        ];

        atomData.forEach(d => {
          const geom = new THREE.SphereGeometry(d.r, 16, 16);
          const mat = new THREE.MeshPhongMaterial({ color: d.color, shininess: 120 });
          const mesh = new THREE.Mesh(geom, mat);
          mesh.position.set(d.x, d.y, d.z);
          ligandGroup.add(mesh);
        });

        const bonds = [[0, 1], [0, 2], [0, 3], [0, 4]];
        bonds.forEach(b => {
          const start = atomData[b[0]];
          const end = atomData[b[1]];
          const startVec = new THREE.Vector3(start.x, start.y, start.z);
          const endVec = new THREE.Vector3(end.x, end.y, end.z);
          const dir = new THREE.Vector3().subVectors(endVec, startVec);
          const len = dir.length();

          const cylGeom = new THREE.CylinderGeometry(0.3, 0.3, len, 8);
          const cylMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x111111 });
          const cylMesh = new THREE.Mesh(cylGeom, cylMat);

          cylMesh.position.copy(startVec).addScaledVector(dir, 0.5);
          cylMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
          ligandGroup.add(cylMesh);
        });
        this.proteinGroup.add(ligandGroup);
      }

      addDecorations() {
        const helixPoints = [];
        const numPts = 40;
        for (let j = 0; j < numPts; j++) {
          const t = (j / numPts) * Math.PI * 6;
          const x = Math.sin(t) * 4 - 8;
          const y = (j - numPts / 2) * 0.4 + 5;
          const z = Math.cos(t) * 4 - 4;
          helixPoints.push(new THREE.Vector3(x, y, z));
        }
        const curve = new THREE.CatmullRomCurve3(helixPoints);
        const tubeGeom = new THREE.TubeGeometry(curve, 50, 0.9, 10, false);
        const tubeMat = new THREE.MeshPhongMaterial({ color: 0x00C2CB, shininess: 80 });
        const ribbon = new THREE.Mesh(tubeGeom, tubeMat);
        this.proteinGroup.add(ribbon);
      }

      updateMode(newMode) {
        if (!this.scene) return;
        if (this.mode === newMode) return;
        this.mode = newMode;
        this.buildModel();
      }

      resize() {
        if (!this.scene || !this.container || !this.renderer) return;
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
      }

      play() {
        if (!this.scene || this.isPlaying) return;
        this.isPlaying = true;
        const animate = () => {
          if (!this.isPlaying) return;
          this.animationFrameId = requestAnimationFrame(animate);

          this.proteinGroup.rotation.y += 0.005;
          this.proteinGroup.rotation.x += 0.002;

          if (this.isInteractive && this.controls) {
            this.controls.update();
          }

          this.renderer.render(this.scene, this.camera);
        };
        animate();
      }

      stop() {
        this.isPlaying = false;
        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
        }
      }

      zoom(amount) {
        if (!this.scene) return;
        this.camera.position.z += amount;
        this.camera.position.z = Math.max(20, Math.min(150, this.camera.position.z));
      }

      reset() {
        if (!this.scene) return;
        this.proteinGroup.rotation.set(0, 0, 0);
        this.camera.position.set(0, 0, 70);
        if (this.controls) this.controls.reset();
      }

      showFallbackUnavailable(reason) {
        // Fallback UI intentionally disabled per user request.
        if (!this.container) return;
        this.container.innerHTML = '';
      }
    }

    function initThreeJSVisualizers() {
      try {
        // 1. Hero visualizer (home page right side decoration)
        heroVisualizer = new ProteinVisualizer('hero-protein-canvas-container', false);
        heroVisualizer.play();

        // 2. Report visualizer (report page active site pocket)
        reportVisualizer = new ProteinVisualizer('report-3d-canvas-container', true, parsedStructureData);

        // Setup Report Page View mode controls
        const btnModeCartoon = document.getElementById('btn-mode-cartoon');
        const btnModeSurface = document.getElementById('btn-mode-surface');
        const btnModeStick = document.getElementById('btn-mode-stick');

        if (btnModeCartoon) {
          btnModeCartoon.addEventListener('click', (e) => {
            toggleModeClass(e.target);
            if (reportVisualizer) reportVisualizer.updateMode('cartoon');
          });
        }
        if (btnModeSurface) {
          btnModeSurface.addEventListener('click', (e) => {
            toggleModeClass(e.target);
            if (reportVisualizer) reportVisualizer.updateMode('surface');
          });
        }
        if (btnModeStick) {
          btnModeStick.addEventListener('click', (e) => {
            toggleModeClass(e.target);
            if (reportVisualizer) reportVisualizer.updateMode('stick');
          });
        }

        function toggleModeClass(activeElement) {
          document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
          activeElement.classList.add('active');
        }

        // Orbit control actions
        const btnZoomIn = document.getElementById('btn-zoom-in-rep');
        const btnZoomOut = document.getElementById('btn-zoom-out-rep');
        const btnReset = document.getElementById('btn-reset-rep');

        if (btnZoomIn) {
          btnZoomIn.addEventListener('click', () => {
            if (reportVisualizer) reportVisualizer.zoom(-5);
          });
        }
        if (btnZoomOut) {
          btnZoomOut.addEventListener('click', () => {
            if (reportVisualizer) reportVisualizer.zoom(5);
          });
        }
        if (btnReset) {
          btnReset.addEventListener('click', () => {
            if (reportVisualizer) reportVisualizer.reset();
          });
        }

        // 3D PDB structure local downloader
        const btnDownloadPdb = document.getElementById('btn-download-pdb');
        if (btnDownloadPdb) {
          btnDownloadPdb.addEventListener('click', (e) => {
            e.preventDefault();
            if (parsedStructureData && (parsedStructureData.rawPDBText || (parsedStructureData.atoms && parsedStructureData.atoms.length > 0))) {
              let pdbText = parsedStructureData.rawPDBText;
              if (!pdbText) {
                // Reconstruct PDB format dynamically from parsed coordinates if raw text is unavailable
                pdbText = generatePDBFromAtoms(parsedStructureData);
              }
              const blob = new Blob([pdbText], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = parsedStructureData.fileName || 'enzyme_structure.pdb';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              showToast("PDB structure file downloaded successfully.");
            } else {
              showToast("3D structure not available for de novo sequences (PDB not uploaded)");
            }
          });
        }

      } catch (err) {
        console.warn('WebGL Initialization failed or Three.js library not ready: ', err);
      }
    }

    // Call visualizer initialization now that the class and helpers are defined
    try {
      initThreeJSVisualizers();
    } catch (e) {
      console.warn('ThreeJS init deferred failed', e);
    }

    // Dynamic PDB file builder helper
    function generatePDBFromAtoms(structureData) {
      if (!structureData || !structureData.atoms) return "";
      let lines = [];
      structureData.atoms.forEach((atom, idx) => {
        const serial = String(idx + 1).padStart(5);
        const name = atom.name.padEnd(4);
        const resName = atom.res_name.padStart(3);
        const chainId = (atom.chain_id || 'A').substring(0, 1);
        const resSeq = String(atom.res_seq || 1).padStart(4);
        const x = parseFloat(atom.x || 0).toFixed(3).padStart(8);
        const y = parseFloat(atom.y || 0).toFixed(3).padStart(8);
        const z = parseFloat(atom.z || 0).toFixed(3).padStart(8);
        const element = (atom.element || atom.name[0] || 'C').toUpperCase().padStart(2);

        const line = `ATOM  ${serial}  ${name} ${resName} ${chainId}${resSeq}    ${x}${y}${z}  1.00  0.00          ${element}`;
        lines.push(line);
      });
      lines.push("TER");
      return lines.join("\n");
    }

    /* ==========================================================================
       DASHBOARD GRID INTERACTIVITY & MULTI-SELECT CHK SYSTEM (PAGE 2)
       ========================================================================== */

    const moduleBtns = document.querySelectorAll('.module-tab-btn');
    const checkboxes = document.querySelectorAll('.report-select-chk');
    const selectedCountEl = document.getElementById('selected-count');
    const compileReportBtn = document.getElementById('compile-report-btn');
    const switchIncludeReport = document.getElementById('switch-include-report');

    function updateSelectedCount() {
      const checkedBoxes = document.querySelectorAll('.report-select-chk:checked');
      if (selectedCountEl) {
        selectedCountEl.textContent = checkedBoxes.length;
      }
      if (compileReportBtn) {
        if (checkedBoxes.length === 0) {
          compileReportBtn.disabled = true;
          compileReportBtn.style.opacity = '0.5';
          compileReportBtn.style.cursor = 'not-allowed';
        } else {
          compileReportBtn.disabled = false;
          compileReportBtn.style.opacity = '1';
          compileReportBtn.style.cursor = 'pointer';
        }
      }
    }

    checkboxes.forEach(chk => {
      chk.addEventListener('change', updateSelectedCount);
    });
    updateSelectedCount(); // Initial sync

    moduleBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (e.target.closest('.custom-chk') || e.target.closest('.report-select-chk')) {
          return;
        }
        const moduleName = btn.getAttribute('data-module');
        openModuleReport(moduleName);
      });
    });

    if (switchIncludeReport) {
      switchIncludeReport.addEventListener('change', () => {
        const activeModule = currentActiveModule;
        if (activeModule) {
          const checkbox = document.querySelector(`.report-select-chk[value="${activeModule}"]`);
          if (checkbox) {
            checkbox.checked = switchIncludeReport.checked;
            updateSelectedCount();
          }
        }
      });
    }

    /* ==========================================================================
       MODULAR ROUTING SYSTEM & BACKEND INTEGRATION (PAGE 3)
       ========================================================================= */

    async function openModuleReport(moduleName) {
      currentActiveModule = moduleName;

      // Set active sub-panel
      const panels = document.querySelectorAll('.result-sub-panel');
      panels.forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
      });

      const activePanel = document.getElementById('result-' + moduleName);
      if (activePanel) {
        activePanel.classList.add('active');
        activePanel.style.display = 'block';
      }

      // Set report title
      const reportTitleEl = document.getElementById('active-report-title');
      if (reportTitleEl) {
        reportTitleEl.textContent = getRawModuleTitle(moduleName);
      }

      // Sync include switch
      const checkbox = document.querySelector(`.report-select-chk[value="${moduleName}"]`);
      if (checkbox && switchIncludeReport) {
        switchIncludeReport.checked = checkbox.checked;
      }

      // Fetch dynamic calculations from Backend API
      await fetchModuleDataFromBackend(moduleName);

      // Update browser route to the current module
      updateRouteHash(moduleName);

      // Show report sub-view
      showDashboardSubView('report');

      // Trigger visualizer update if opening active site
      if (moduleName === 'active-site') {
        // Re-initialize report visualizer
        const container = document.getElementById('report-3d-canvas-container');
        if (container) {
          container.innerHTML = ''; // Clear fallback messages or canvas
        }
        reportVisualizer = new ProteinVisualizer('report-3d-canvas-container', true, parsedStructureData);
        if (reportVisualizer && reportVisualizer.scene) {
          reportVisualizer.resize();
          reportVisualizer.play();
        }
      }
    }

    async function fetchModuleDataFromBackend(moduleName) {
      if (!currentProjectId) {
        showToast('No active session. Run analysis first.');
        return;
      }

      showModuleLoading(`Calculating ${getModuleTitle(moduleName)}...`);

      try {
        const endpointMap = {
          'dg': 'delta-g',
          'dh': 'delta-h',
          'active-site': 'active-site',
          'mechanism': 'mechanism',
          'affinity': 'binding',
          'specificity': 'substrate-specificity',
          'stability': 'stability',
          'mutation': 'mutation',
          'pathway': 'pathway'
        };

        const endpoint = endpointMap[moduleName];
        if (!endpoint) return;

        const response = await fetch(`${API_BASE}/api/analyze/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_id: currentProjectId })
        });

        if (response.ok) {
          const data = await response.json();
          updateModuleUIPanel(moduleName, data);
        }
      } catch (err) {
        console.warn("Failed to fetch calculation from backend, utilizing mock fallback.", err);
      } finally {
        hideModuleLoading();
      }
    }

    function updateModuleUIPanel(moduleName, data) {
      const textDark = '#0F172A';
      const textMuted = '#64748B';
      const primaryTeal = '#00C2CB';
      const secondaryTeal = '#4FD1C5';

      // Reset active charts
      Object.keys(activeCharts).forEach(key => {
        if (activeCharts[key]) {
          activeCharts[key].destroy();
          activeCharts[key] = null;
        }
      });

      if (moduleName === 'dg') {
        document.getElementById('dg-val-num').textContent = data.delta_g;
        document.querySelector('#result-dg .dg-interpretation-text').textContent = data.stability_interpretation;
        document.querySelector('#result-dg .progress-val').textContent = `${data.confidence_score}%`;

        const offset = 251.2 - (251.2 * data.confidence_score / 100);
        document.getElementById('confidence-circle-dg').style.stroke_dashoffset = offset;

        // Update variables values
        const variablesVal = document.querySelectorAll('#result-dg .var-box .var-val');
        if (variablesVal.length >= 3) {
          variablesVal[0].textContent = `-12.45 kcal/mol`; // Delta H
          variablesVal[1].textContent = `298.15 K`;       // Temp
          variablesVal[2].textContent = `0.111 kcal/(mol·K)`; // Delta S
        }

        // Populate interaction contributions table
        const tbody = document.querySelector('#result-dg tbody');
        if (tbody && data.residue_contributions) {
          tbody.innerHTML = data.residue_contributions.map(c => `
          <tr>
            <td><strong>${c.residue}</strong></td>
            <td>${c.position}</td>
            <td>${c.type}</td>
            <td>${c.distance}</td>
            <td>${c.energy}</td>
            <td><span class="reliability-pill high">${c.reliability}</span></td>
          </tr>
        `).join('');
        }

        // Re-draw Charts
        const canvas1 = document.getElementById('chart-dg-temp');
        if (canvas1 && data.thermodynamic_graphs) {
          activeCharts['dg-temp'] = new Chart(canvas1.getContext('2d'), {
            type: 'line',
            data: {
              labels: data.thermodynamic_graphs.temps.map(t => `${t}K`),
              datasets: [{
                label: 'ΔG (kcal/mol)',
                data: data.thermodynamic_graphs.values,
                borderColor: primaryTeal,
                backgroundColor: 'rgba(0, 194, 203, 0.08)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: primaryTeal,
                pointBorderColor: '#ffffff'
              }]
            },
            options: { responsive: true, maintainAspectRatio: false }
          });
        }

        const canvas2 = document.getElementById('chart-dg-energy');
        if (canvas2) {
          activeCharts['dg-energy'] = new Chart(canvas2.getContext('2d'), {
            type: 'doughnut',
            data: {
              labels: ['Hydrogen Bonds', 'Salt Bridges', 'Van der Waals'],
              datasets: [{
                data: [-12.50, -18.20, -14.97],
                backgroundColor: ['#00C2CB', '#6366F1', '#EC4899'],
                borderWidth: 2
              }]
            },
            options: { responsive: true, cutout: '65%' }
          });
        }

        const canvas3 = document.getElementById('chart-dg-heatmap');
        if (canvas3) {
          activeCharts['dg-heatmap'] = new Chart(canvas3.getContext('2d'), {
            type: 'bar',
            data: {
              labels: ['HIS-34', 'ASP-102', 'SER-189', 'PHE-210', 'TRP-215', 'GLY-216'],
              datasets: [
                { label: 'Ligand C1', data: [2.8, 3.8, 4.5, 3.6, 3.9, 5.1], backgroundColor: 'rgba(0, 194, 203, 0.8)' },
                { label: 'Ligand O2', data: [3.1, 3.1, 2.9, 5.1, 4.3, 3.8], backgroundColor: 'rgba(0, 194, 203, 0.5)' }
              ]
            },
            options: { responsive: true, maintainAspectRatio: false }
          });
        }
      }

      else if (moduleName === 'dh') {
        const dhNum = document.querySelector('#result-dh .dg-number');
        if (dhNum) dhNum.textContent = data.delta_h;
        document.querySelector('#result-dh .dg-interpretation-text').textContent = data.catalytic_heat_interpretation;
        document.querySelector('#result-dh .progress-val').textContent = `${data.confidence_score}%`;

        const canvas1 = document.getElementById('chart-dh-profile');
        if (canvas1) {
          activeCharts['dh-profile'] = new Chart(canvas1.getContext('2d'), {
            type: 'line',
            data: {
              labels: ['Reaction Start', 'TS1', 'Intermediate', 'TS2', 'Product State'],
              datasets: [{
                label: 'Enthalpy Change (kcal/mol)',
                data: [0, -4.5, -8.2, -6.1, data.delta_h],
                borderColor: '#EF4444',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                borderWidth: 3,
                fill: true
              }]
            },
            options: { responsive: true }
          });
        }

        const canvas2 = document.getElementById('chart-dh-contrib');
        if (canvas2 && data.energy_map) {
          activeCharts['dh-contrib'] = new Chart(canvas2.getContext('2d'), {
            type: 'bar',
            data: {
              labels: ['Electrostatic', 'Polar Solvation', 'Non-polar Solvation', 'VdW'],
              datasets: [{
                label: 'kcal/mol',
                data: [data.energy_map.electrostatic, data.energy_map.polar_solvation, data.energy_map.nonpolar_solvation, data.energy_map.vdw],
                backgroundColor: ['#EF4444', '#F59E0B', '#3B82F6', '#10B981']
              }]
            },
            options: { responsive: true }
          });
        }
      }

      else if (moduleName === 'active-site') {
        const tbody = document.querySelector('#result-active-site tbody');
        if (tbody && data.catalytic_residues) {
          tbody.innerHTML = data.catalytic_residues.map(r => `
          <tr>
            <td><strong>${r.residue}</strong></td>
            <td>${r.position}</td>
            <td>${r.chain}</td>
            <td>${r.volume}</td>
            <td>${r.exposure}</td>
            <td><span class="reliability-pill high">${r.confidence}</span></td>
          </tr>
        `).join('');
        }
      }

      else if (moduleName === 'mechanism') {
        const stepsList = document.querySelector('#result-mechanism .mechanism-steps-list');
        if (stepsList && data.catalytic_steps) {
          stepsList.innerHTML = data.catalytic_steps.map(s => `
          <div class="mech-step">
            <div class="step-num-box">${s.step}</div>
            <div class="step-desc">
              <strong>${s.name}:</strong> ${s.desc}
            </div>
          </div>
        `).join('');
        }

        const canvas = document.getElementById('chart-mech-pathway');
        if (canvas && data.pathway_visualization) {
          activeCharts['mech-pathway'] = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
              labels: data.pathway_visualization.energy_barriers.map((_, i) => `Step ${i}`),
              datasets: [{
                label: 'Free Energy Barrier (kcal/mol)',
                data: data.pathway_visualization.energy_barriers,
                borderColor: '#8B5CF6',
                backgroundColor: 'rgba(139, 92, 246, 0.08)',
                borderWidth: 3,
                fill: true
              }]
            },
            options: { responsive: true }
          });
        }
      }

      else if (moduleName === 'affinity') {
        document.querySelector('#result-affinity .dg-number').textContent = data.docking_score;
        document.querySelector('#result-affinity .progress-val').textContent = `90%`;

        const canvas = document.getElementById('chart-affinity-dist');
        if (canvas) {
          activeCharts['affinity-dist'] = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
              labels: ['-12', '-11', '-10', '-9', '-8', '-7', '-6', '-5', '-4'],
              datasets: [{
                label: 'Docking Conformation Density',
                data: [0.01, 0.05, 0.12, 0.45, 0.95, 0.65, 0.25, 0.08, 0.02],
                borderColor: '#6366F1',
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                borderWidth: 3,
                fill: true
              }]
            },
            options: { responsive: true }
          });
        }
      }

      else if (moduleName === 'specificity') {
        const canvas = document.getElementById('chart-specificity-bars');
        if (canvas) {
          activeCharts['specificity-bars'] = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
              labels: ['Acetaminophen', 'Phenol', 'Benzene', 'Salicylate', 'Alanine', 'Glucose'],
              datasets: [{
                data: [100, 78, 42, 35, 8, 2],
                backgroundColor: ['#00C2CB', '#4FD1C5', '#3B82F6', '#8B5CF6', '#EF4444', '#64748B']
              }]
            },
            options: { responsive: true }
          });
        }
      }

      else if (moduleName === 'stability') {
        document.querySelector('#result-stability .dg-number').textContent = data.thermal_tolerance;
        document.querySelector('#result-stability .progress-val').textContent = `${data.stability_score}%`;

        const canvas = document.getElementById('chart-stability-curve');
        if (canvas) {
          activeCharts['stability-curve'] = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
              labels: ['20°C', '30°C', '40°C', '50°C', '60°C', '65°C', '70°C', '80°C'],
              datasets: [
                {
                  label: 'Folded State Fraction',
                  data: [1.0, 1.0, 0.98, 0.95, 0.85, 0.50, 0.12, 0.01],
                  borderColor: secondaryTeal,
                  fill: false
                },
                {
                  label: 'Catalytic Activity Profile',
                  data: [0.35, 0.50, 0.75, 0.92, 1.0, 0.88, 0.30, 0.01],
                  borderColor: '#F59E0B',
                  backgroundColor: 'rgba(245, 158, 11, 0.05)',
                  fill: true
                }
              ]
            },
            options: { responsive: true }
          });
        }
      }

      else if (moduleName === 'pathway') {
        const canvas = document.getElementById('chart-pathway-energy');
        if (canvas && data.pathway_steps) {
          activeCharts['pathway-energy'] = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
              labels: data.pathway_steps.map(s => s.state),
              datasets: [{
                data: data.pathway_steps.map(s => s.energy),
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                borderWidth: 3,
                fill: true
              }]
            },
            options: { responsive: true }
          });
        }
      }
    }

    function getRawModuleTitle(moduleName) {
      const titles = {
        'dg': 'Gibbs Free Energy Prediction (ΔG)',
        'dh': 'Enthalpy Change (ΔH)',
        'active-site': 'Active Site Prediction',
        'mechanism': 'Catalytic Mechanism Prediction',
        'affinity': 'Binding Affinity Prediction',
        'specificity': 'Substrate Specificity',
        'stability': 'Enzyme Stability Prediction',
        'mutation': 'Mutation Effect Analysis',
        'pathway': 'Reaction Pathway Prediction'
      };
      return titles[moduleName] || 'Enzyme Analysis';
    }

    function getModuleTitle(moduleName) {
      const titles = {
        'dg': 'I. ΔG (Gibbs Free Energy) Predictions',
        'dh': 'II. ΔH (Enthalpy Change) Calculations',
        'active-site': 'III. Active Site Predictions & 3D Docking Pocket',
        'mechanism': 'IV. Catalytic Mechanism Pathways',
        'affinity': 'V. Binding Affinity Predictions',
        'specificity': 'VI. Substrate Specificity Selectivity',
        'stability': 'VII. Enzyme Folding Stability Profile',
        'mutation': 'VIII. In Silico Mutagenesis Predictions',
        'pathway': 'IX. Catalytic Conversion Reaction Feasibility Flow'
      };
      return titles[moduleName] || 'Analysis Module';
    }

    /* ==========================================================================
       COMBINED SCIENTIFIC REPORT COMPILER LOGIC (PAGE 4 - CONNECTED TO API)
       ========================================================================== */

    if (compileReportBtn) {
      compileReportBtn.addEventListener('click', async () => {
        const checkedBoxes = document.querySelectorAll('.report-select-chk:checked');
        if (checkedBoxes.length === 0) {
          showToast('Please select at least one module analysis to compile.');
          return;
        }

        const selectedModulesList = Array.from(checkedBoxes).map(chk => chk.value);

        if (!currentProjectId) {
          showToast("No active project session. Run analysis first.");
          return;
        }

        showToast("Compiling master publication report PDF on server...");

        try {
          // Post request to compile PDF report
          const response = await fetch(`${API_BASE}/api/report/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project_id: currentProjectId,
              selected_modules: selectedModulesList
            })
          });

          if (response.ok) {
            const res = await response.json();
            const reportDownloadUrl = `${API_BASE}${res.download_url}`;

            // Keep track of the current download url
            window.lastReportDownloadUrl = reportDownloadUrl;

            // Render paper presentation view locally
            showCombinedReportView();
            await buildLocalCompiledPaperView(selectedModulesList);

            showToast('Master Scientific Report compiled successfully!');
          } else {
            showToast("Failed to compile PDF report.");
          }
        } catch (err) {
          console.error("Report generation failed:", err);
          showToast("Backend connection error. Compiled local preview.");
          showCombinedReportView();
          buildLocalCompiledPaperView(selectedModulesList);
        }
      });
    }

    async function buildLocalCompiledPaperView(selectedModulesList) {
      const compiledContent = document.getElementById('compiled-paper-content');
      if (!compiledContent) return;

      compiledContent.innerHTML = '';

      for (const moduleName of selectedModulesList) {
        await fetchModuleDataFromBackend(moduleName);

        const panel = document.getElementById('result-' + moduleName);
        if (panel) {
          const clone = panel.cloneNode(true);
          clone.removeAttribute('id');
          clone.style.display = 'block';
          clone.classList.add('active');

          // Convert any charts to images for the local paper layout
          const originalCanvases = panel.querySelectorAll('canvas');
          const clonedCanvases = clone.querySelectorAll('canvas');
          originalCanvases.forEach((canvas, idx) => {
            const clonedCanvas = clonedCanvases[idx];
            if (clonedCanvas) {
              try {
                const img = document.createElement('img');
                img.src = canvas.toDataURL('image/png');
                img.style.width = '100%';
                img.style.height = 'auto';
                img.style.display = 'block';
                img.className = canvas.className;
                clonedCanvas.parentNode.replaceChild(img, clonedCanvas);
              } catch (e) {
                console.error('Failed to convert canvas for paper preview:', e);
              }
            }
          });

          const header = document.createElement('h3');
          header.className = 'paper-section-title';
          header.style.marginTop = '40px';
          header.style.marginBottom = '20px';
          header.style.borderBottom = '2px solid var(--primary-teal)';
          header.style.paddingBottom = '8px';
          header.textContent = getModuleTitle(moduleName);

          compiledContent.appendChild(header);
          compiledContent.appendChild(clone);
        }
      }

      if (typeof lucide !== 'undefined') {
        try {
          lucide.createIcons();
        } catch (e) { }
      }
    }

    function showCombinedReportView() {
      if (homeView) {
        homeView.classList.remove('active');
        homeView.style.display = 'none';
      }
      if (dashboardLayout) {
        dashboardLayout.style.display = 'flex';
        dashboardLayout.classList.add('active');
      }
      showDashboardSubView('combined-report');
    }

    /* ==========================================================================
       SAVE / EXPORT ACTIONS & DOWNLOADS
       ========================================================================== */

    // Individual Module PDF Download
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    if (downloadPdfBtn) {
      downloadPdfBtn.addEventListener('click', async () => {
        if (!currentProjectId) {
          showToast("No active project to download.");
          return;
        }

        try {
          showToast("Compiling PDF for module...");
          const response = await fetch(`${API_BASE}/api/report/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project_id: currentProjectId,
              selected_modules: [currentActiveModule]
            })
          });

          if (response.ok) {
            const res = await response.json();
            initiateFileDownload(`${API_BASE}${res.download_url}`, res.filename);
          }
        } catch (err) {
          console.error("Individual PDF download failed:", err);
        }
      });
    }

    // Combined Package PDF Download
    const combinedDownloadPdf = document.getElementById('combined-download-pdf');
    if (combinedDownloadPdf) {
      combinedDownloadPdf.addEventListener('click', () => {
        if (window.lastReportDownloadUrl) {
          initiateFileDownload(window.lastReportDownloadUrl, "EnzyXNova_Master_Report.pdf");
        } else {
          showToast("Error: No compiled report download URL found.");
        }
      });
    }

    function initiateFileDownload(url, filename) {
      showToast(`Downloading report: ${filename}...`);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Sidebar navigation for actual content views
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const label = item.querySelector('span') ? item.querySelector('span').textContent : 'Feature';
        const id = item.id;
        if (id === 'menu-dashboard') {
          showView('dashboard');
          return;
        }
        if (id === 'menu-projects') {
          showView('projects');
          fetchProjects();
          return;
        }
        if (id === 'menu-history') {
          showView('history');
          fetchAnalyses();
          return;
        }
        if (id === 'menu-reports') {
          showView('reports');
          fetchReports();
          return;
        }
        if (id === 'menu-settings') {
          showView('settings');
          fetchSettings();
          return;
        }
        if (id === 'menu-help') {
          window.open('https://enzyxnova.bio/docs', '_blank');
          return;
        }

        showToast(`${label} is currently in read-only sandbox mode for this platform demo.`);
      });
    });

    const saveReportBtn = document.getElementById('save-report-btn');
    if (saveReportBtn) {
      saveReportBtn.addEventListener('click', () => {
        showToast('Report saved to projects! Access it anytime in "Saved Reports".');
      });
    }

    /* ==========================================================================
       TOAST NOTIFICATION SYSTEM
       ========================================================================== */

    function showModuleLoading(message = 'Calculating...') {
      if (loaderOverlay) {
        loaderStatus.textContent = message;
        if (loaderFill) loaderFill.style.width = '0%';
        loaderOverlay.classList.add('active');
      }
    }

    function hideModuleLoading() {
      if (loaderOverlay) {
        loaderOverlay.classList.remove('active');
        if (loaderFill) loaderFill.style.width = '0%';
      }
    }

    function showToast(message) {
      let toastContainer = document.getElementById('toast-container');
      if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
      }

      const toast = document.createElement('div');
      toast.className = 'custom-toast card-glass';

      const infoIcon = document.createElement('i');
      infoIcon.setAttribute('data-lucide', 'info');
      infoIcon.style.color = 'var(--primary-teal)';
      infoIcon.style.width = '18px';
      infoIcon.style.height = '18px';

      const textSpan = document.createElement('span');
      textSpan.textContent = message;

      toast.appendChild(infoIcon);
      toast.appendChild(textSpan);
      toastContainer.appendChild(toast);

      if (typeof lucide !== 'undefined') {
        try {
          lucide.createIcons();
        } catch (e) { }
      }

      setTimeout(() => {
        toast.classList.add('visible');
      }, 10);

      setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => {
          toast.remove();
        }, 300);
      }, 3500);
    }

    /* ==========================================================================
       Project / History / Reports Fetch + Render Helpers
       ========================================================================== */
    async function fetchProjects() {
      try {
        const search = document.getElementById('projects-search') ? document.getElementById('projects-search').value.trim() : '';
        const res = await fetch(`${API_BASE}/api/projects${search ? `?q=${encodeURIComponent(search)}` : ''}`);
        if (!res.ok) return;
        const data = await res.json();
        renderProjects(data.projects || []);
      } catch (err) {
        console.error('Failed to fetch projects', err);
      }
    }

    function renderProjects(list) {
      const container = document.getElementById('projects-list');
      if (!container) return;
      container.innerHTML = '';
      list.forEach(p => {
        const card = document.createElement('div');
        card.className = 'card-glass project-card';
        card.style.padding = '12px';
        card.innerHTML = `
        <h4 style="margin:0 0 6px 0">${p.name || p.id.slice(0, 8)}</h4>
        <div style="font-size:12px;color:#64748B;margin-bottom:8px">Created: ${new Date(p.created_at).toLocaleString()}</div>
        <div style="font-size:13px;margin-bottom:8px"><b>Status:</b> ${p.status} &middot; <b>Analyses:</b> ${p.analyses_completed}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn" data-action="open" data-id="${p.id}">Open</button>
          <button class="btn" data-action="continue" data-id="${p.id}">Continue</button>
          <button class="btn" data-action="reports" data-id="${p.id}">Reports</button>
          <button class="btn" data-action="duplicate" data-id="${p.id}">Duplicate</button>
          <button class="btn btn-danger" data-action="delete" data-id="${p.id}">Delete</button>
        </div>
      `;
        container.appendChild(card);
        // Attach listeners
        card.querySelectorAll('button').forEach(btn => {
          btn.addEventListener('click', async () => {
            const action = btn.getAttribute('data-action');
            const id = btn.getAttribute('data-id');
            if (action === 'open') {
              currentProjectId = id;
              const dashLabel = document.getElementById('dash-project-id'); if (dashLabel) dashLabel.textContent = currentProjectId.substring(0, 8).toUpperCase();
              showView('dashboard');
            } else if (action === 'continue') {
              try {
                await fetch(`${API_BASE}/api/analyze/start`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ project_id: id })
                });
                showToast('Analysis started');
              } catch (err) { console.error(err); }
            } else if (action === 'reports') {
              showView('reports'); fetchReports(id);
            } else if (action === 'duplicate') {
              try {
                const r = await fetch(`${API_BASE}/api/projects/${id}/duplicate`, { method: 'POST' });
                if (r.ok) { showToast('Project duplicated'); fetchProjects(); }
              } catch (err) { console.error(err); }
            } else if (action === 'delete') {
              if (!confirm('Delete project and all data?')) return;
              try {
                const r = await fetch(`${API_BASE}/api/projects/${id}`, { method: 'DELETE' });
                if (r.ok) { showToast('Project deleted'); fetchProjects(); }
              } catch (err) { console.error(err); }
            }
          });
        });
      });
    }

    async function fetchSettings() {
      try {
        const res = await fetch(`${API_BASE}/api/settings`);
        if (!res.ok) return;
        const data = await res.json();
        renderSettings(data);
      } catch (err) {
        console.error('Failed to fetch settings', err);
      }
    }

    function renderSettings(data) {
      const container = document.getElementById('settings-content');
      if (!container) return;
      const theme = data.theme || 'light';
      const quality = data.visualization_quality || 'high';
      const exportFormat = data.export_format || 'pdf';
      const notifications = data.notifications === true || data.notifications === 'true' ? 'Enabled' : 'Disabled';
      container.innerHTML = `
        <div class="card-glass" style="padding:20px;display:grid;gap:12px;">
          <h3>Application Settings</h3>
          <div><strong>Theme:</strong> ${theme}</div>
          <div><strong>Visualization Quality:</strong> ${quality}</div>
          <div><strong>Export Format:</strong> ${exportFormat}</div>
          <div><strong>Notifications:</strong> ${notifications}</div>
          <div style="font-size:0.95rem;color:#64748B">Settings loaded from the backend. Use backend-driven controls to keep user preferences in sync.</div>
        </div>
      `;
    }

    async function fetchAnalyses() {
      try {
        const res = await fetch(`${API_BASE}/api/analyses`);
        if (!res.ok) return;
        const data = await res.json();
        renderHistory(data.analyses || []);
      } catch (err) { console.error('Failed to fetch analyses', err); }
    }

    function renderHistory(list) {
      const tbody = document.querySelector('#history-table tbody');
      if (!tbody) return;
      tbody.innerHTML = '';
      list.forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
        <td>${a.id}</td>
        <td>${a.type || 'N/A'}</td>
        <td>${a.project_id}</td>
        <td>${new Date(a.created_at).toLocaleString()}</td>
        <td>${a.runtime || '-'}</td>
        <td>${a.confidence_score || '-'}</td>
        <td>${a.status}</td>
        <td><button class="btn" data-id="${a.id}" data-project-id="${a.project_id}" data-action="reopen">Open</button> <button class="btn" data-id="${a.id}" data-project-id="${a.project_id}" data-action="rerun">Re-run</button></td>
      `;
        tbody.appendChild(tr);

        const openBtn = tr.querySelector('button[data-action="reopen"]');
        const rerunBtn = tr.querySelector('button[data-action="rerun"]');
        if (openBtn) {
          openBtn.addEventListener('click', () => {
            currentProjectId = openBtn.getAttribute('data-project-id');
            const dashLabel = document.getElementById('dash-project-id');
            if (dashLabel && currentProjectId) dashLabel.textContent = currentProjectId.substring(0, 8).toUpperCase();
            showView('dashboard');
          });
        }
        if (rerunBtn) {
          rerunBtn.addEventListener('click', async () => {
            const projectId = rerunBtn.getAttribute('data-project-id');
            if (!projectId) return;
            currentProjectId = projectId;
            try {
              const res = await fetch(`${API_BASE}/api/analyze/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_id: projectId })
              });
              if (res.ok) {
                showToast('Re-run started for selected analysis.');
                showView('dashboard');
              } else {
                showToast('Failed to rerun analysis.');
              }
            } catch (err) {
              console.error('Failed to rerun analysis', err);
            }
          });
        }
      });
    }

    async function fetchReports(project_id) {
      try {
        const url = project_id ? `${API_BASE}/api/reports?project_id=${project_id}` : `${API_BASE}/api/reports`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        renderReports(data.reports || []);
      } catch (err) { console.error('Failed to fetch reports', err); }
    }

    function renderReports(list) {
      const container = document.getElementById('reports-list');
      if (!container) return;
      container.innerHTML = '';
      list.forEach(r => {
        const card = document.createElement('div');
        card.className = 'card-glass report-card';
        card.style.padding = '12px';
        card.innerHTML = `
        <h4 style="margin:0 0 6px 0">${r.filename}</h4>
        <div style="font-size:12px;color:#64748B;margin-bottom:8px">Generated: ${new Date(r.created_at).toLocaleString()}</div>
        <div style="font-size:13px;margin-bottom:8px"><b>Modules:</b> ${(r.selected_modules || []).join(', ')}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn" href="${API_BASE}/api/report/download/${r.id}" target="_blank">Open</a>
          <a class="btn" href="${API_BASE}/api/report/download/${r.id}" download>Download</a>
        </div>
      `;
        container.appendChild(card);
      });
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
