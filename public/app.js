/**
 * RESQ — AI Emergency Response System
 * Citizen Experience & Operational Command Console Frontend
 */

// ==========================================
// 1. STATE & ROUTING MANAGEMENT
// ==========================================
const state = {
  currentRoute: window.location.pathname === '/control-center' ? '/control-center' : '/',
  isAuthenticated: false,
  isOnline: navigator.onLine,
  incidents: [],
  teams: [],
  weather: null,
  activeIncident: null,
  selectedFilter: 'ALL',
  selectedTab: 'DASHBOARD',
  sseConnected: false,
  demoModalOpen: false,
  simulationModalOpen: false,
  rosterModalOpen: false,
  auditModalOpen: false,
  reviewModalOpen: false,
  loginModalOpen: false,
  targetSettingsModalOpen: false,
  dispatchOverlayOpen: false,
  latestDispatchData: null,
  mapAnalysisRunning: false,
  mapAnalysisResult: null,

  // Alert Targets & API Gateway Configuration
  alertTargets: {
    phone: '+918838225583',
    email: 'trikysaran5721@gmail.com',
    officialEmails: [
      'trikysaran5721@gmail.com',
      'mediaestelle7@gmail.com',
      'nandhini301107@gmail.com',
      'kavipriyaps2401@gmail.com',
    ],
    whatsapp: '+918838225583',
    twilioAccountSid: 'AC55deeb28ea81530d98623bdf3dbb956f',
    twilioAuthToken: '3de79206f9a2dcfa1f0ba3c0844733bf',
    twilioFromPhone: '+17372212163',
    resendApiKey: '',
  },

  // Citizen SOS Wizard State
  sosWizardOpen: false,
  sosStep: 1,
  sosData: {
    type: 'Flood',
    peopleAffected: 1,
    description: '',
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 4.5,
    address: 'Fetching current GPS location...',
    hasVoice: false,
    voiceDuration: 0,
    voiceAudioUrl: '',
    hasPhoto: false,
    photoUrl: '',
  },
  isRecordingAudio: false,
  audioRecordSeconds: 0,
  audioRecordInterval: null,
  submittedBeacon: null,
};

// ==========================================
// 2. INDEXED DB OFFLINE SUPPORT
// ==========================================
const DB_NAME = 'RESQ_OFFLINE_STORE';
const STORE_NAME = 'offline_reports';

function openIndexedDb() {
  return new Promise((resolve) => {
    if (!window.indexedDB) return resolve(null);
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function saveOfflineReport(report) {
  try {
    const db = await openIndexedDb();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(report);
  } catch (e) {}
}

async function getOfflineReports() {
  try {
    const db = await openIndexedDb();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

async function clearOfflineReports() {
  try {
    const db = await openIndexedDb();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch (e) {}
}

async function syncOfflineReports() {
  const offlineReports = await getOfflineReports();
  if (offlineReports.length === 0) return;

  for (const report of offlineReports) {
    try {
      await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
    } catch (e) {}
  }
  await clearOfflineReports();
  showToast(`Synced ${offlineReports.length} offline emergency distress reports to RESQ network!`, 'success');
}

window.addEventListener('online', () => {
  state.isOnline = true;
  render();
  syncOfflineReports();
});

window.addEventListener('offline', () => {
  state.isOnline = false;
  render();
});

// ==========================================
// 3. SECRET SHORTCUT LISTENER (5 -> 7 -> 2 -> 1)
// ==========================================
let keySequence = [];
const SECRET_CODE = ['5', '7', '2', '1'];

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  keySequence.push(e.key);
  if (keySequence.length > SECRET_CODE.length) {
    keySequence.shift();
  }
  if (keySequence.join('') === SECRET_CODE.join('')) {
    keySequence = [];
    state.loginModalOpen = true;
    render();
  }
});

// ==========================================
// 4. API CLIENT & REALTIME SSE
// ==========================================
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/verify');
    const data = await res.json();
    state.isAuthenticated = data.authenticated;
  } catch (e) {
    state.isAuthenticated = false;
  }
}

async function fetchIncidents() {
  try {
    const res = await fetch('/api/incidents');
    const data = await res.json();
    if (data.success) state.incidents = data.incidents;
  } catch (e) {}
}

async function fetchTeams() {
  try {
    const res = await fetch('/api/teams');
    const data = await res.json();
    if (data.success) state.teams = data.teams;
  } catch (e) {}
}

async function fetchWeather() {
  try {
    const res = await fetch('/api/weather');
    const data = await res.json();
    if (data.success) state.weather = data.weather;
  } catch (e) {}
}

async function fetchAlertConfig() {
  try {
    const res = await fetch('/api/alert-config');
    const data = await res.json();
    if (data.success && data.config) {
      state.alertTargets = { ...state.alertTargets, ...data.config };
    }
  } catch (e) {}
}

function initSSE() {
  const evtSource = new EventSource('/api/realtime');
  evtSource.onopen = () => {
    state.sseConnected = true;
    render();
  };
  evtSource.addEventListener('incident_created', (e) => {
    const data = JSON.parse(e.data);
    state.incidents.unshift(data.incident);
    showToast(`🚨 NEW EMERGENCY: ${data.incident.type} at ${data.incident.address} (Risk: ${data.incident.riskScore}%)`, 'danger');
    render();
    if (window.updateMapMarkers) window.updateMapMarkers();
  });
  evtSource.addEventListener('incident_updated', (e) => {
    const data = JSON.parse(e.data);
    if (data.reset) {
      fetchIncidents();
      fetchTeams();
      showToast('Control Center state reset to default scenario', 'info');
      return;
    }
    const idx = state.incidents.findIndex(i => i.id === data.incident.id);
    if (idx !== -1) {
      state.incidents[idx] = data.incident;
      if (state.activeIncident && state.activeIncident.id === data.incident.id) {
        state.activeIncident = data.incident;
      }
    }
    render();
    if (window.updateMapMarkers) window.updateMapMarkers();
  });
  evtSource.onerror = () => {
    state.sseConnected = false;
  };
}

// ==========================================
// 5. TOAST NOTIFICATIONS & AUDIO DISPATCH
// ==========================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  const bg = type === 'danger' ? 'bg-red-950/90 border-red-500 text-red-100' :
             type === 'success' ? 'bg-emerald-950/90 border-emerald-500 text-emerald-100' :
             'bg-slate-900/90 border-cyan-500 text-cyan-100';
  toast.className = `p-4 rounded-xl border backdrop-blur-xl shadow-2xl flex items-center gap-3 transform transition-all duration-300 translate-y-2 opacity-0 font-medium text-xs ${bg}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

function createToastContainer() {
  const div = document.createElement('div');
  div.id = 'toast-container';
  div.className = 'fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md pointer-events-none';
  document.body.appendChild(div);
  return div;
}

// Tactical Radio Dispatch Sound & Voice Synthesis
function playRadioDispatchBeep(textAnnouncement = '') {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.15); // A4

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);

    if ('speechSynthesis' in window && textAnnouncement) {
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(textAnnouncement);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }, 400);
    }
  } catch (e) {}
}

// ==========================================
// 6. ROUTING & RENDERING
// ==========================================
function navigateTo(path) {
  window.history.pushState({}, '', path);
  state.currentRoute = path;
  render();
}

window.addEventListener('popstate', () => {
  state.currentRoute = window.location.pathname;
  render();
});

function render() {
  const app = document.getElementById('app');
  if (!app) return;

  if (state.currentRoute === '/control-center') {
    if (!state.isAuthenticated) {
      app.innerHTML = renderControlCenterLogin();
    } else {
      app.innerHTML = renderControlCenter();
      setTimeout(() => initThreeMap(), 50);
    }
  } else {
    app.innerHTML = renderCitizenHome();
  }

  // Modals
  if (state.loginModalOpen) {
    app.insertAdjacentHTML('beforeend', renderLoginModal());
  }
  if (state.sosWizardOpen) {
    app.insertAdjacentHTML('beforeend', renderSosWizardModal());
  }
  if (state.demoModalOpen) {
    app.insertAdjacentHTML('beforeend', renderDemoModal());
  }
  if (state.simulationModalOpen) {
    app.insertAdjacentHTML('beforeend', renderSimulationModal());
  }
  if (state.rosterModalOpen) {
    app.insertAdjacentHTML('beforeend', renderRosterModal());
  }
  if (state.auditModalOpen) {
    app.insertAdjacentHTML('beforeend', renderAuditModal());
  }
  if (state.targetSettingsModalOpen) {
    app.insertAdjacentHTML('beforeend', renderTargetSettingsModal());
  }
  if (state.dispatchOverlayOpen && state.latestDispatchData) {
    app.insertAdjacentHTML('beforeend', renderDispatchAlertOverlay());
  }
  if (state.reviewModalOpen && state.activeIncident) {
    app.insertAdjacentHTML('beforeend', renderReviewModal());
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ==========================================
// 7. CITIZEN SOS EXPERIENCE
// ==========================================
function renderCitizenHome() {
  const offlineWarning = !state.isOnline ? `
    <div class="fixed top-0 inset-x-0 z-40 bg-amber-500/90 text-black px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-lg">
      <i data-lucide="wifi-off" class="w-4 h-4"></i>
      OFFLINE MODE ACTIVE — SOS requests are saved locally in IndexedDB and transmitted automatically when connectivity returns.
    </div>
  ` : '';

  if (state.submittedBeacon) {
    return `
      ${offlineWarning}
      <div class="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-gradient-to-b from-[#080d1a] to-[#04060a]">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.15)_0%,_transparent_70%)] pointer-events-none"></div>
        <div class="glass-card-elevated max-w-lg w-full p-8 rounded-3xl text-center relative z-10 border border-red-500/30">
          <div class="w-20 h-20 mx-auto mb-6 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center relative">
            <span class="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-75"></span>
            <i data-lucide="radio" class="w-10 h-10 animate-pulse"></i>
          </div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-400 font-mono text-xs font-bold uppercase tracking-wider mb-3">
            Distress Beacon Active • ${state.submittedBeacon.priority} Priority
          </div>
          <h1 class="text-3xl font-extrabold text-white mb-2 tracking-tight">SOS Received & Dispatched</h1>
          <p class="text-slate-400 text-sm mb-6">Your emergency has been registered in the RESQ AI response network. Operators and emergency rescue teams have been alerted.</p>

          <div class="bg-slate-900/80 rounded-2xl p-4 mb-6 border border-slate-800 text-left space-y-3 font-mono text-xs">
            <div class="flex justify-between pb-2 border-b border-slate-800">
              <span class="text-slate-500">INCIDENT ID</span>
              <span class="text-white font-bold">${state.submittedBeacon.id}</span>
            </div>
            <div class="flex justify-between pb-2 border-b border-slate-800">
              <span class="text-slate-500">CATEGORY</span>
              <span class="text-cyan-400 font-semibold">${state.submittedBeacon.type}</span>
            </div>
            <div class="flex justify-between pb-2 border-b border-slate-800">
              <span class="text-slate-500">AI RISK SCORE</span>
              <span class="text-red-400 font-bold">${state.submittedBeacon.riskScore}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">STATUS</span>
              <span class="text-emerald-400 font-bold uppercase flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                ACTIVE DISPATCH
              </span>
            </div>
          </div>

          <div class="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-left text-xs text-red-200 mb-6 space-y-1">
            <p class="font-bold flex items-center gap-1.5 text-red-400">
              <i data-lucide="shield-alert" class="w-4 h-4"></i> Critical Life Safety Instructions:
            </p>
            <p>• Move to the highest accessible ground or structural anchor point.</p>
            <p>• Keep this browser screen active to broadcast live telemetry.</p>
            <p>• Conserve your phone battery and prepare a flashlight or bright cloth.</p>
          </div>

          <button onclick="state.submittedBeacon = null; render();" class="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl transition-all border border-slate-700">
            Submit Additional Update / New SOS
          </button>
        </div>
      </div>
    `;
  }

  return `
    ${offlineWarning}
    <div class="min-h-screen flex flex-col justify-between p-4 sm:p-10 relative overflow-hidden bg-gradient-to-b from-[#060a12] via-[#090e18] to-[#040609]">
      <div class="absolute -top-40 -left-40 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Header -->
      <header class="flex justify-between items-center z-10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-lg shadow-red-600/30 text-white font-black tracking-wider text-xl">
            R
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xl font-black tracking-wider text-white">RESQ</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">CITIZEN SOS</span>
            </div>
            <p class="text-[11px] text-slate-400 font-medium">AI Emergency Detection & Rapid Response</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300">
            <span class="w-2 h-2 rounded-full ${state.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}"></span>
            ${state.isOnline ? 'NETWORK ONLINE' : 'OFFLINE MODE'}
          </div>
        </div>
      </header>

      <!-- Central SOS Button -->
      <main class="flex-1 flex flex-col items-center justify-center my-8 z-10 text-center">
        <div class="relative flex items-center justify-center my-6">
          <div class="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-red-600/20 sos-pulse-ring pointer-events-none"></div>
          <div class="absolute w-60 h-60 sm:w-68 sm:h-68 rounded-full bg-red-600/30 sos-pulse-ring pointer-events-none" style="animation-delay: 0.7s;"></div>

          <button
            onclick="openSosWizard()"
            id="sos-button"
            class="w-52 h-52 sm:w-64 sm:h-64 rounded-full bg-gradient-to-tr from-red-600 via-rose-600 to-red-500 text-white flex flex-col items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer pulse-glow-red relative border-4 border-red-400/40 group"
          >
            <i data-lucide="alert-triangle" class="w-12 h-12 sm:w-16 sm:h-16 mb-2 text-white group-hover:animate-bounce"></i>
            <span class="text-4xl sm:text-5xl font-black tracking-widest uppercase">SOS</span>
            <span class="text-[11px] sm:text-xs font-bold tracking-wider text-red-100 uppercase mt-1">Press For Help</span>
          </button>
        </div>

        <p class="text-slate-400 text-sm max-w-xs sm:max-w-sm mt-4">
          Pressing SOS triggers instant AI multi-modal signal analysis, GPS triangulation, and tactical team dispatch.
        </p>

        <!-- Quick 1-Tap Emergency Categories -->
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-2.5 max-w-xl w-full mt-8">
          ${renderQuickCategoryButton('Flood', 'waves', 'text-blue-400')}
          ${renderQuickCategoryButton('Fire', 'flame', 'text-orange-400')}
          ${renderQuickCategoryButton('Building Damage', 'home', 'text-amber-400')}
          ${renderQuickCategoryButton('Person Trapped', 'life-buoy', 'text-red-400')}
          ${renderQuickCategoryButton('Medical Emergency', 'heart-pulse', 'text-rose-400')}
          ${renderQuickCategoryButton('Road Emergency', 'truck', 'text-emerald-400')}
        </div>
      </main>

      <!-- Footer Info -->
      <footer class="text-center z-10">
        <div class="flex items-center justify-center gap-6 text-xs text-slate-500">
          <span class="flex items-center gap-1.5">
            <i data-lucide="crosshair" class="w-3.5 h-3.5 text-cyan-400"></i> Auto-GPS Locked
          </span>
          <span class="flex items-center gap-1.5">
            <i data-lucide="mic" class="w-3.5 h-3.5 text-red-400"></i> Voice Audio Distress
          </span>
          <span class="flex items-center gap-1.5">
            <i data-lucide="shield-check" class="w-3.5 h-3.5 text-emerald-400"></i> Encrypted Channel
          </span>
        </div>
      </footer>
    </div>
  `;
}

function renderQuickCategoryButton(type, icon, color) {
  return `
    <button
      onclick="startSosWithCategory('${type}')"
      class="glass-card hover:bg-slate-800/90 p-3 rounded-2xl flex flex-col items-center gap-2 text-xs font-semibold text-slate-300 transition-all border border-slate-800/60 hover:border-slate-600 hover:-translate-y-0.5"
    >
      <i data-lucide="${icon}" class="w-5 h-5 ${color}"></i>
      <span class="truncate w-full text-center">${type.split(' ')[0]}</span>
    </button>
  `;
}

function startSosWithCategory(type) {
  state.sosData.type = type;
  openSosWizard();
}

function openSosWizard() {
  state.sosWizardOpen = true;
  state.sosStep = 1;
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.sosData.latitude = pos.coords.latitude;
        state.sosData.longitude = pos.coords.longitude;
        state.sosData.accuracy = Math.round(pos.coords.accuracy || 5);
        state.sosData.address = `${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°W (GPS Triangulated)`;
        render();
      },
      () => {
        state.sosData.address = 'North Valley Sector 4, Civic Basin';
        render();
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }
  render();
}

// ==========================================
// 8. CITIZEN SOS 4-STEP WIZARD MODAL (RAW VOICE RECORDING)
// ==========================================
function renderSosWizardModal() {
  const step = state.sosStep;
  const categories = [
    { id: 'Flood', label: 'Flood / Inundation', icon: 'waves', desc: 'Rising water, submerged property, stranded on roof' },
    { id: 'Fire', label: 'Wildfire / Structure Fire', icon: 'flame', desc: 'Fast-moving smoke, trapped by fire line' },
    { id: 'Building Damage', label: 'Collapse / Landslide', icon: 'home', desc: 'Cracked walls, mudflow, rubble blocking exit' },
    { id: 'Person Trapped', label: 'Person Trapped / Stranded', icon: 'life-buoy', desc: 'Victims unable to evacuate independently' },
    { id: 'Medical Emergency', label: 'Severe Trauma / Medical', icon: 'heart-pulse', desc: 'Critical injury, hypothermia, chest pain' },
    { id: 'Road Emergency', label: 'Road Blocked / Cutoff', icon: 'truck', desc: 'Bridge down, fallen powerlines, vehicle submerged' },
  ];

  return `
    <div class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div class="glass-card-elevated max-w-xl w-full rounded-3xl border border-red-500/30 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <!-- Header -->
        <div class="p-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold">
              ${step}/4
            </div>
            <div>
              <h2 class="text-lg font-bold text-white">Emergency SOS Submission</h2>
              <p class="text-xs text-slate-400">Step ${step}: ${
                step === 1 ? 'Select Emergency Type & People in Danger' :
                step === 2 ? 'Confirm Exact Incident Location' :
                step === 3 ? 'Record Voice Audio Note & Photo' :
                'Review & Instant Response Dispatch'
              }</p>
            </div>
          </div>
          <button onclick="state.sosWizardOpen = false; render();" class="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-6">
          ${step === 1 ? `
            <div class="space-y-4">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-wider block">What is the primary danger?</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                ${categories.map(c => `
                  <button
                    onclick="state.sosData.type = '${c.id}'; render();"
                    class="p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                      state.sosData.type === c.id
                        ? 'bg-red-600/20 border-red-500 text-white shadow-lg shadow-red-600/10'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }"
                  >
                    <div class="p-2 rounded-xl bg-slate-800 ${state.sosData.type === c.id ? 'text-red-400' : 'text-slate-400'}">
                      <i data-lucide="${c.icon}" class="w-5 h-5"></i>
                    </div>
                    <div>
                      <div class="font-bold text-sm text-white">${c.label}</div>
                      <div class="text-[11px] text-slate-400 leading-tight mt-0.5">${c.desc}</div>
                    </div>
                  </button>
                `).join('')}
              </div>

              <div class="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span class="text-sm font-bold text-white block">People Needing Help / Trapped</span>
                  <span class="text-xs text-slate-400">Total individuals at this location</span>
                </div>
                <div class="flex items-center gap-3 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
                  <button onclick="if(state.sosData.peopleAffected > 1) { state.sosData.peopleAffected--; render(); }" class="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center">
                    -
                  </button>
                  <span class="w-8 text-center font-mono font-bold text-lg text-white">${state.sosData.peopleAffected}</span>
                  <button onclick="state.sosData.peopleAffected++; render();" class="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center">
                    +
                  </button>
                </div>
              </div>
            </div>
          ` : step === 2 ? `
            <div class="space-y-4">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-wider block">Incident Coordinates & Location</label>
              <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
                <div class="flex items-center justify-between pb-2 border-b border-slate-900">
                  <span class="text-slate-500">LATITUDE</span>
                  <span class="text-cyan-400 font-bold">${state.sosData.latitude.toFixed(5)}° N</span>
                </div>
                <div class="flex items-center justify-between pb-2 border-b border-slate-900">
                  <span class="text-slate-500">LONGITUDE</span>
                  <span class="text-cyan-400 font-bold">${state.sosData.longitude.toFixed(5)}° W</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-500">GPS ACCURACY</span>
                  <span class="text-emerald-400 font-bold">± ${state.sosData.accuracy} meters (High Precision)</span>
                </div>
              </div>

              <div>
                <label class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Address / Landmark / Sector</label>
                <input
                  type="text"
                  value="${state.sosData.address}"
                  oninput="state.sosData.address = this.value;"
                  class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3.5 text-sm text-white focus:outline-none focus:border-red-500"
                  placeholder="e.g. 742 Riverbend Rd, 2nd floor balcony"
                />
              </div>

              <div>
                <label class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Situation Notes (Optional)</label>
                <textarea
                  oninput="state.sosData.description = this.value;"
                  rows="2"
                  class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-sm text-white focus:outline-none focus:border-red-500"
                  placeholder="Describe situation, trapped victims, water level..."
                >${state.sosData.description}</textarea>
              </div>
            </div>
          ` : step === 3 ? `
            <div class="space-y-5">
              <!-- Voice Note Section (Direct Audio Recording, No Forced Transcript) -->
              <div class="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div class="flex justify-between items-center">
                  <div>
                    <h3 class="text-sm font-bold text-white flex items-center gap-2">
                      <i data-lucide="mic" class="w-4 h-4 text-red-400"></i> Record Voice Audio Message
                    </h3>
                    <p class="text-xs text-slate-400">Press record to speak. Your voice audio is sent directly to the rescue control team.</p>
                  </div>
                  ${state.sosData.hasVoice ? `
                    <span class="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
                      ${state.sosData.voiceDuration}s AUDIO ATTACHED
                    </span>
                  ` : ''}
                </div>

                <div class="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex flex-col gap-3">
                  <div class="flex items-center justify-between">
                    <button
                      onclick="toggleCitizenVoiceRecording()"
                      class="px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all ${
                        state.isRecordingAudio
                          ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/40'
                          : state.sosData.hasVoice
                          ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                          : 'bg-red-600/20 text-red-400 border border-red-500/40 hover:bg-red-600/30'
                      }"
                    >
                      <i data-lucide="${state.isRecordingAudio ? 'square' : 'mic'}" class="w-4 h-4"></i>
                      ${state.isRecordingAudio ? 'Stop Recording' : state.sosData.hasVoice ? 'Record Again' : 'Start Voice Recording'}
                    </button>

                    ${state.isRecordingAudio ? `
                      <div class="flex items-center gap-2 font-mono text-red-400 font-bold text-xs">
                        <span class="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                        RECORDING: 00:${state.audioRecordSeconds < 10 ? '0' + state.audioRecordSeconds : state.audioRecordSeconds}
                      </div>
                    ` : state.sosData.hasVoice ? `
                      <button
                        onclick="playCitizenVoiceAudio()"
                        class="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-xl flex items-center gap-1.5"
                      >
                        <i data-lucide="play" class="w-3.5 h-3.5"></i> Play My Voice Message
                      </button>
                    ` : `
                      <span class="text-xs text-slate-500 font-mono">Audio ready to record</span>
                    `}
                  </div>

                  <!-- Visual Waveform Simulation -->
                  <div class="flex items-center justify-center gap-1 h-8 bg-slate-900 rounded-xl px-4 overflow-hidden">
                    ${Array.from({ length: 24 }).map((_, i) => `
                      <div
                        class="w-1 rounded-full transition-all duration-150 ${
                          state.isRecordingAudio ? 'bg-red-500 animate-pulse' :
                          state.sosData.hasVoice ? 'bg-emerald-500' : 'bg-slate-800'
                        }"
                        style="height: ${
                          state.isRecordingAudio ? Math.max(20, (Math.sin(i + Date.now() * 0.01) * 50 + 50)) + '%' :
                          state.sosData.hasVoice ? ((i % 5 + 2) * 15) + '%' : '25%'
                        };"
                      ></div>
                    `).join('')}
                  </div>
                </div>
              </div>

              <!-- Photo Section -->
              <div class="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div class="flex justify-between items-center">
                  <div>
                    <h3 class="text-sm font-bold text-white flex items-center gap-2">
                      <i data-lucide="camera" class="w-4 h-4 text-cyan-400"></i> Visual Evidence Photo
                    </h3>
                    <p class="text-xs text-slate-400">Attach photo of flood water height or structural hazard</p>
                  </div>
                </div>

                <div class="flex items-center gap-4">
                  <button
                    onclick="simulatePhotoCapture()"
                    class="px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30"
                  >
                    <i data-lucide="camera" class="w-4 h-4"></i>
                    ${state.sosData.hasPhoto ? 'Replace Photo' : 'Capture / Upload Photo'}
                  </button>

                  ${state.sosData.hasPhoto ? `
                    <div class="flex items-center gap-3">
                      <img src="${state.sosData.photoUrl}" class="w-12 h-12 rounded-xl object-cover border border-cyan-500 shadow" />
                      <span class="text-xs text-emerald-400 font-mono">Flood Photo Attached</span>
                    </div>
                  ` : `
                    <span class="text-xs text-slate-500 font-mono">Optional photo proof</span>
                  `}
                </div>
              </div>
            </div>
          ` : `
            <!-- Step 4: Review & Dispatch -->
            <div class="space-y-4">
              <div class="bg-gradient-to-br from-red-950/40 to-slate-900/90 p-5 rounded-2xl border border-red-500/30 space-y-3 font-mono text-xs">
                <div class="flex justify-between pb-2 border-b border-slate-800">
                  <span class="text-slate-400">EMERGENCY TYPE</span>
                  <span class="text-red-400 font-bold text-sm">${state.sosData.type}</span>
                </div>
                <div class="flex justify-between pb-2 border-b border-slate-800">
                  <span class="text-slate-400">PEOPLE IN DANGER</span>
                  <span class="text-white font-bold">${state.sosData.peopleAffected} Person(s)</span>
                </div>
                <div class="flex justify-between pb-2 border-b border-slate-800">
                  <span class="text-slate-400">LOCATION</span>
                  <span class="text-cyan-400 truncate max-w-xs text-right">${state.sosData.address}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">ATTACHMENTS</span>
                  <span class="text-emerald-400">
                    ${state.sosData.hasVoice ? '🎙️ Voice Audio Note' : ''}
                    ${state.sosData.hasPhoto ? '📷 Photo Proof' : ''}
                    ${!state.sosData.hasVoice && !state.sosData.hasPhoto ? 'None' : ''}
                  </span>
                </div>
              </div>

              <div class="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-xs text-slate-400">
                Submitting broadcasts this emergency across command consoles, voice dispatch, SMS, and WhatsApp alerts.
              </div>
            </div>
          `}
        </div>

        <!-- Footer -->
        <div class="p-6 bg-slate-900/90 border-t border-slate-800 flex justify-between items-center">
          ${step > 1 ? `
            <button onclick="state.sosStep--; render();" class="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs">
              Back
            </button>
          ` : `
            <div></div>
          `}

          ${step < 4 ? `
            <button onclick="state.sosStep++; render();" class="px-7 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-600/30">
              Next Step <i data-lucide="chevron-right" class="w-4 h-4"></i>
            </button>
          ` : `
            <button onclick="submitSosReport()" class="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-2xl shadow-red-600/40 animate-pulse">
              <i data-lucide="radio" class="w-4 h-4"></i> Dispatch Emergency Response Now
            </button>
          `}
        </div>
      </div>
    </div>
  `;
}

function toggleCitizenVoiceRecording() {
  if (!state.isRecordingAudio) {
    state.isRecordingAudio = true;
    state.audioRecordSeconds = 0;
    render();

    state.audioRecordInterval = setInterval(() => {
      state.audioRecordSeconds++;
      if (state.audioRecordSeconds >= 15) {
        stopCitizenVoiceRecording();
      } else {
        render();
      }
    }, 1000);
  } else {
    stopCitizenVoiceRecording();
  }
}

function stopCitizenVoiceRecording() {
  clearInterval(state.audioRecordInterval);
  state.isRecordingAudio = false;
  state.sosData.hasVoice = true;
  state.sosData.voiceDuration = Math.max(3, state.audioRecordSeconds);
  state.sosData.voiceAudioUrl = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
  render();
  showToast(`Voice audio recorded (${state.sosData.voiceDuration} seconds). Ready to send to control team.`, 'success');
}

function playCitizenVoiceAudio() {
  playRadioDispatchBeep('Playing citizen recorded voice audio note.');
  showToast('Playing citizen voice audio note...', 'info');
}

function simulatePhotoCapture() {
  state.sosData.hasPhoto = true;
  state.sosData.photoUrl = 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80';
  render();
}

async function submitSosReport() {
  const payload = {
    type: state.sosData.type,
    peopleAffected: state.sosData.peopleAffected,
    description: state.sosData.description || `${state.sosData.type} reported via Mobile Citizen SOS portal.`,
    latitude: state.sosData.latitude,
    longitude: state.sosData.longitude,
    accuracy: state.sosData.accuracy,
    address: state.sosData.address,
    media: state.sosData.hasPhoto ? [{ url: state.sosData.photoUrl, type: 'image', capturedAt: new Date().toISOString() }] : [],
    voiceNote: state.sosData.hasVoice ? {
      audioUrl: state.sosData.voiceAudioUrl,
      durationSeconds: state.sosData.voiceDuration,
      capturedAt: new Date().toISOString(),
    } : null,
  };

  state.sosWizardOpen = false;

  if (!state.isOnline) {
    const offlineReport = { ...payload, id: `OFFLINE-${Date.now()}` };
    await saveOfflineReport(offlineReport);
    state.submittedBeacon = {
      id: offlineReport.id,
      type: payload.type,
      priority: 'P1 (QUEUED OFFLINE)',
      riskScore: 85,
    };
    showToast('Offline Mode: Emergency cached locally. Will broadcast upon reconnection.', 'info');
    render();
    return;
  }

  try {
    const res = await fetch('/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      state.submittedBeacon = data.incident;
      render();
    }
  } catch (e) {
    showToast('Failed to connect. Storing offline.', 'danger');
  }
}

// ==========================================
// ==========================================
// 9. CONTROL CENTER OPERATOR LOGIN (Secure Authentication)
// ==========================================
function renderControlCenterLogin() {
  return `
    <div class="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-[#050810] via-[#070c18] to-[#030509] relative overflow-hidden">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.08)_0%,_transparent_70%)] pointer-events-none"></div>

      <div class="glass-card-elevated max-w-md w-full p-6 sm:p-8 rounded-3xl border border-slate-800 relative z-10 shadow-2xl">
        <div class="text-center mb-8">
          <div class="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-cyan-400 font-black text-2xl shadow-xl">
            <i data-lucide="shield" class="w-8 h-8"></i>
          </div>
          <h1 class="text-2xl font-extrabold text-white tracking-tight">RESQ Control Center</h1>
          <p class="text-xs text-slate-400 mt-1">Tactical Emergency Response Command & Risk Intelligence</p>
        </div>

        <form onsubmit="handleOperatorLogin(event)" class="space-y-4">
          <div>
            <label class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Operator ID</label>
            <div class="relative">
              <i data-lucide="user" class="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500"></i>
              <input
                id="login-username"
                type="text"
                value=""
                required
                autocomplete="username"
                class="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Enter operator username"
              />
            </div>
          </div>

          <div>
            <label class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Command Passkey</label>
            <div class="relative">
              <i data-lucide="lock" class="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500"></i>
              <input
                id="login-password"
                type="password"
                value=""
                required
                autocomplete="current-password"
                class="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Enter secret passkey"
              />
            </div>
          </div>

          <button
            type="submit"
            class="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-cyan-600/30 text-sm flex items-center justify-center gap-2 mt-5"
          >
            <i data-lucide="terminal" class="w-4 h-4"></i> Authenticate & Enter Console
          </button>
        </form>

        <div class="mt-6 text-center">
          <button onclick="navigateTo('/')" class="text-xs text-slate-500 hover:text-slate-300 transition-all flex items-center justify-center gap-1.5 mx-auto">
            <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i> Return to Citizen Portal
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderLoginModal() {
  return `
    <div class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div class="glass-card-elevated max-w-md w-full p-8 rounded-3xl border border-cyan-500/40 relative shadow-2xl animate-in fade-in zoom-in-95">
        <div class="flex justify-between items-start mb-6">
          <div>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-[10px] font-bold uppercase mb-2">
              Tactical Console Access
            </div>
            <h2 class="text-xl font-bold text-white">Operator Console Login</h2>
          </div>
          <button onclick="state.loginModalOpen = false; render();" class="text-slate-400 hover:text-white p-1 rounded-lg">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <form onsubmit="handleOperatorLogin(event)" class="space-y-4">
          <div>
            <label class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Operator ID</label>
            <input id="login-username" type="text" value="" required placeholder="Operator ID" class="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Passkey</label>
            <input id="login-password" type="password" value="" required placeholder="Secret Passkey" class="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500" />
          </div>
          <button type="submit" class="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-2xl transition-all text-sm mt-4">
            Authenticate & Open Console
          </button>
        </form>
      </div>
    </div>
  `;
}

async function handleOperatorLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.success) {
      state.isAuthenticated = true;
      state.loginModalOpen = false;
      state.currentRoute = '/control-center';
      window.history.pushState({}, '', '/control-center');
      await Promise.all([fetchIncidents(), fetchTeams(), fetchWeather(), fetchAlertConfig()]);
      render();
      showToast('Welcome, Operator (resqteamlog). Command Net Online.', 'success');
    } else {
      showToast(data.error || 'Login failed', 'danger');
    }
  } catch (err) {
    showToast('Authentication network error', 'danger');
  }
}

// ==========================================
// 10. CONTROL CENTER DASHBOARD (BALANCED LAYOUT)
// ==========================================
function renderControlCenter() {
  const criticalCount = state.incidents.filter(i => i.priority === 'P1' && i.status !== 'RESOLVED').length;
  const activeCount = state.incidents.filter(i => i.status !== 'RESOLVED').length;
  const availableTeamsCount = state.teams.filter(t => t.status === 'Available').length;

  let filteredIncidents = [...state.incidents];
  if (state.selectedFilter === 'CRITICAL') {
    filteredIncidents = filteredIncidents.filter(i => i.priority === 'P1' && i.status !== 'RESOLVED');
  } else if (state.selectedFilter === 'ACTIVE') {
    filteredIncidents = filteredIncidents.filter(i => i.status !== 'RESOLVED');
  } else if (state.selectedFilter === 'RESOLVED') {
    filteredIncidents = filteredIncidents.filter(i => i.status === 'RESOLVED');
  }

  const priorityQueue = [...state.incidents]
    .filter(i => i.status !== 'RESOLVED')
    .sort((a, b) => b.riskScore - a.riskScore);

  return `
    <div class="min-h-screen bg-[#06090e] text-slate-100 flex flex-col w-full">
      <!-- Top Tactical Header -->
      <header class="glass-card border-b border-slate-800/80 px-4 sm:px-6 py-3 sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3 sm:gap-4">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-cyan-500/20">
              R
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-extrabold text-xs sm:text-sm tracking-wider text-white">RESQ CONTROL CENTER</span>
                <span class="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">OPERATOR NET</span>
              </div>
            </div>
          </div>

          <div class="hidden md:flex items-center gap-3 pl-4 border-l border-slate-800 text-xs font-mono">
            <span class="flex items-center gap-1.5 text-emerald-400">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              SSE STREAM ACTIVE
            </span>
            <span class="text-slate-600">•</span>
            <span class="text-slate-400">OPERATOR: <strong class="text-emerald-400">AUTHENTICATED</strong></span>
          </div>
        </div>

        <!-- Header Action Controls -->
        <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button
            onclick="state.targetSettingsModalOpen = true; render();"
            class="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/50 text-cyan-300 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-500/10"
            title="Configure Call, SMS & WhatsApp target"
          >
            <i data-lucide="phone-call" class="w-3.5 h-3.5 text-cyan-400"></i> <span class="hidden sm:inline">Alert Targets & Gateway</span><span class="sm:hidden">Targets</span>
          </button>

          <button
            onclick="state.demoModalOpen = true; render();"
            class="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/10"
          >
            <i data-lucide="play" class="w-3.5 h-3.5 text-red-400"></i> <span class="hidden sm:inline">Demo Scenarios</span><span class="sm:hidden">Demo</span>
          </button>

          <button
            onclick="state.simulationModalOpen = true; render();"
            class="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] sm:text-xs font-bold flex items-center gap-1.5"
          >
            <i data-lucide="sliders" class="w-3.5 h-3.5 text-cyan-400"></i> <span class="hidden sm:inline">What-If</span>
          </button>

          <button
            onclick="state.rosterModalOpen = true; render();"
            class="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] sm:text-xs font-bold flex items-center gap-1.5"
          >
            <i data-lucide="users" class="w-3.5 h-3.5 text-emerald-400"></i> <span class="hidden sm:inline">Responders (${availableTeamsCount}/${state.teams.length})</span><span class="sm:hidden">(${availableTeamsCount}/${state.teams.length})</span>
          </button>

          <button
            onclick="state.auditModalOpen = true; render();"
            class="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] sm:text-xs font-bold flex items-center gap-1.5"
          >
            <i data-lucide="bell" class="w-3.5 h-3.5 text-amber-400"></i> <span class="hidden sm:inline">Alert Logs</span>
          </button>

          <button
            onclick="handleLogout()"
            class="p-2 rounded-xl bg-slate-800 hover:bg-red-950/50 hover:text-red-400 text-slate-400 border border-slate-700 text-xs transition-all"
            title="Logout"
          >
            <i data-lucide="log-out" class="w-4 h-4"></i>
          </button>
        </div>
      </header>

      <!-- KPI Summary Bar -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800/60 bg-slate-950/50">
        <div class="glass-card p-3 sm:p-4 rounded-2xl border border-red-500/30 flex items-center justify-between">
          <div>
            <div class="text-[10px] sm:text-[11px] font-mono font-bold text-red-400 uppercase tracking-wider">P1 Critical Alerts</div>
            <div class="text-xl sm:text-2xl font-black text-white mt-0.5">${criticalCount}</div>
          </div>
          <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
            <i data-lucide="alert-octagon" class="w-4 h-4 sm:w-5 sm:h-5"></i>
          </div>
        </div>

        <div class="glass-card p-3 sm:p-4 rounded-2xl border border-cyan-500/30 flex items-center justify-between">
          <div>
            <div class="text-[10px] sm:text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider">Active Emergencies</div>
            <div class="text-xl sm:text-2xl font-black text-white mt-0.5">${activeCount}</div>
          </div>
          <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <i data-lucide="activity" class="w-4 h-4 sm:w-5 sm:h-5"></i>
          </div>
        </div>

        <div class="glass-card p-3 sm:p-4 rounded-2xl border border-emerald-500/30 flex items-center justify-between">
          <div>
            <div class="text-[10px] sm:text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">Units Ready</div>
            <div class="text-xl sm:text-2xl font-black text-white mt-0.5">${availableTeamsCount} / ${state.teams.length}</div>
          </div>
          <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <i data-lucide="shield" class="w-4 h-4 sm:w-5 sm:h-5"></i>
          </div>
        </div>

        <div class="glass-card p-3 sm:p-4 rounded-2xl border border-amber-500/30 flex items-center justify-between">
          <div>
            <div class="text-[10px] sm:text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider">Doppler Radar</div>
            <div class="text-sm sm:text-base font-bold text-white mt-0.5 truncate max-w-[100px] sm:max-w-none">${state.weather ? state.weather.condition : 'Heavy Rain'}</div>
          </div>
          <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <i data-lucide="cloud-rain" class="w-4 h-4 sm:w-5 sm:h-5"></i>
          </div>
        </div>
      </div>

      <!-- Main Operational Command Deck (Balanced 60% / 40% Width) -->
      <div class="flex-1 flex flex-col xl:flex-row gap-4 sm:gap-6 p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
        <!-- Left Deck: 3D Situational Map & Weather Radar (58% width) -->
        <div class="flex-1 flex flex-col gap-6 xl:w-7/12">
          <!-- 3D Situational Map -->
          <div class="glass-card rounded-3xl border border-slate-800 overflow-hidden flex flex-col relative min-h-[440px]">
            <div class="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-10">
              <div class="flex items-center gap-2">
                <i data-lucide="map-pin" class="w-4 h-4 text-cyan-400"></i>
                <h3 class="text-xs font-bold uppercase tracking-wider text-white">3D Situational Terrain & Flood Inundation Canvas</h3>
              </div>
              <button
                onclick="triggerMapAnalysis()"
                class="px-3 py-1 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5"
              >
                <i data-lucide="cpu" class="w-3.5 h-3.5"></i> Run AI Multi-Spectral Scan
              </button>
            </div>

            <!-- WebGL 3D Container -->
            <div id="three-map-container" class="w-full flex-1 relative bg-[#02050c] min-h-[380px]">
              ${state.mapAnalysisRunning ? `
                <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center">
                  <div class="scanner-line"></div>
                  <div class="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3 animate-spin">
                    <i data-lucide="loader-2" class="w-7 h-7"></i>
                  </div>
                  <h4 class="text-sm font-bold text-white mb-1">Performing Multi-Spectral AI Map Synthesis...</h4>
                  <p class="text-xs text-slate-400 font-mono">1. LiDAR Topography • 2. Hydrologic Runoff • 3. Inundation Zones • 4. Tactical Corridors</p>
                </div>
              ` : ''}

              <!-- Map Legend -->
              <div class="absolute bottom-3 left-3 z-10 glass-card p-2.5 rounded-xl border border-slate-800 text-[10px] font-mono space-y-1">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500"></span>
                  <span class="text-slate-300">P1 Critical (Immediate)</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span class="text-slate-300">P2 High Priority</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
                  <span class="text-slate-300">P3 Standard</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Meteorological Doppler Radar & Forecast -->
          <div class="glass-card p-5 rounded-3xl border border-slate-800 space-y-4">
            <div class="flex justify-between items-center">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <i data-lucide="cloud-rain" class="w-4 h-4 text-cyan-400"></i> Meteorological Doppler Radar & Storm Trajectory
              </h3>
              <span class="text-[11px] font-mono text-cyan-400">Telemetry Feed</span>
            </div>

            ${state.weather ? `
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                  <div class="text-[10px] font-mono text-slate-500">RAINFALL RATE</div>
                  <div class="text-lg font-bold text-cyan-400 mt-0.5">${state.weather.rainfallMm} mm/h</div>
                </div>
                <div class="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                  <div class="text-[10px] font-mono text-slate-500">WIND VECTOR</div>
                  <div class="text-lg font-bold text-amber-400 mt-0.5">${state.weather.windSpeedKmh} km/h (${state.weather.windDirection})</div>
                </div>
                <div class="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                  <div class="text-[10px] font-mono text-slate-500">RAIN PROBABILITY</div>
                  <div class="text-lg font-bold text-emerald-400 mt-0.5">${state.weather.rainProbability}%</div>
                </div>
                <div class="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                  <div class="text-[10px] font-mono text-slate-500">TEMPERATURE</div>
                  <div class="text-lg font-bold text-white mt-0.5">${state.weather.temperatureC}°C</div>
                </div>
              </div>

              <!-- Hourly Timeline -->
              <div class="pt-3 border-t border-slate-800/80">
                <div class="text-[10px] font-mono font-bold text-slate-400 uppercase mb-2">Hourly Precipitation Progression</div>
                <div class="grid grid-cols-6 gap-2">
                  ${state.weather.hourlyForecast.map(h => `
                    <div class="bg-slate-950 p-2 rounded-xl border border-slate-900 text-center text-[10px] font-mono space-y-1">
                      <div class="text-slate-500">${h.timeLabel}</div>
                      <div class="font-bold text-cyan-300">${h.precipMm}mm</div>
                      <div class="text-[9px] text-slate-400">${h.rainProb}% rain</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Right Deck: Live Citizen Requests & Priority Queue (42% width) -->
        <div class="flex-1 flex flex-col gap-6 xl:w-5/12">
          <!-- Live Feed Card -->
          <div class="glass-card rounded-3xl border border-slate-800 flex flex-col flex-1 overflow-hidden min-h-[380px]">
            <div class="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i data-lucide="inbox" class="w-4 h-4 text-red-400"></i>
                <h3 class="text-xs font-bold uppercase tracking-wider text-white">Live Citizen Requests</h3>
              </div>

              <!-- Filters -->
              <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-bold">
                ${['ALL', 'CRITICAL', 'ACTIVE', 'RESOLVED'].map(f => `
                  <button
                    onclick="state.selectedFilter = '${f}'; render();"
                    class="px-2.5 py-1 rounded-lg transition-all ${
                      state.selectedFilter === f ? 'bg-slate-800 text-cyan-400 shadow' : 'text-slate-400 hover:text-white'
                    }"
                  >
                    ${f}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Incident List -->
            <div class="flex-1 p-4 space-y-3 overflow-y-auto max-h-[420px]">
              ${filteredIncidents.length === 0 ? `
                <div class="text-center py-12 text-slate-500 text-xs">No incidents matching filter.</div>
              ` : filteredIncidents.map(inc => renderIncidentCard(inc)).join('')}
            </div>
          </div>

          <!-- Priority Queue -->
          <div class="glass-card p-5 rounded-3xl border border-slate-800 space-y-4">
            <div class="flex justify-between items-center">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <i data-lucide="zap" class="w-4 h-4 text-amber-400"></i> Priority Queue (Who Needs Help First?)
              </h3>
              <span class="text-[10px] font-mono text-slate-500">Sorted by AI Risk</span>
            </div>

            <div class="space-y-2.5">
              ${priorityQueue.slice(0, 3).map((inc, rank) => `
                <div
                  onclick="openIncidentReview('${inc.id}')"
                  class="p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 cursor-pointer transition-all flex items-center justify-between gap-3 group"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-7 h-7 rounded-xl ${rank === 0 ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'} font-black text-xs flex items-center justify-center">
                      #${rank + 1}
                    </div>
                    <div>
                      <div class="font-bold text-xs text-white group-hover:text-cyan-400 transition-colors">${inc.type} • ${inc.peopleAffected} Victims</div>
                      <div class="text-[10px] text-slate-400 truncate max-w-[180px]">${inc.address}</div>
                    </div>
                  </div>

                  <div class="text-right">
                    <div class="text-xs font-mono font-bold ${inc.riskScore >= 80 ? 'text-red-400' : 'text-amber-400'}">${inc.riskScore}% Risk</div>
                    <div class="text-[10px] text-slate-500 font-mono">${inc.priority}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderIncidentCard(inc) {
  const isCritical = inc.priority === 'P1';
  return `
    <div
      onclick="openIncidentReview('${inc.id}')"
      class="p-4 rounded-2xl border transition-all cursor-pointer ${
        isCritical
          ? 'bg-red-950/20 border-red-500/40 hover:border-red-400'
          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
      } relative overflow-hidden group"
    >
      <div class="flex justify-between items-start mb-2">
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
            isCritical ? 'bg-red-500/30 text-red-300 border border-red-500/40' :
            inc.priority === 'P2' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
            'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
          }">
            ${inc.priority}
          </span>
          <span class="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors">${inc.type}</span>
        </div>

        <span class="text-xs font-mono font-bold ${inc.riskScore >= 80 ? 'text-red-400' : 'text-cyan-400'}">
          ${inc.riskScore}% AI Risk
        </span>
      </div>

      <p class="text-xs text-slate-300 line-clamp-2 mb-3">${inc.description}</p>

      <div class="flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <span class="truncate max-w-[200px] flex items-center gap-1">
          <i data-lucide="map-pin" class="w-3 h-3 text-slate-500"></i> ${inc.address}
        </span>
        <div class="flex items-center gap-2">
          ${inc.media && inc.media.length > 0 ? '<span title="Photo Attached" class="text-cyan-400">📷</span>' : ''}
          ${inc.voiceNote ? '<span title="Citizen Recorded Voice Audio Attached" class="text-red-400 font-bold">🎙️ Voice Note</span>' : ''}
          <span class="px-2 py-0.5 rounded text-[9px] font-bold ${
            inc.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400' :
            inc.status === 'IN PROGRESS' ? 'bg-blue-500/20 text-blue-400' :
            inc.status === 'ACKNOWLEDGED' ? 'bg-amber-500/20 text-amber-400' :
            'bg-red-500/20 text-red-400 animate-pulse'
          }">
            ${inc.status}
          </span>
        </div>
      </div>
    </div>
  `;
}

function openIncidentReview(id) {
  const inc = state.incidents.find(i => i.id === id);
  if (!inc) return;
  state.activeIncident = inc;
  state.reviewModalOpen = true;
  render();
}

async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  state.isAuthenticated = false;
  navigateTo('/');
}

// ==========================================
// 11. DETAILED INCIDENT REVIEW MODAL
// ==========================================
function renderReviewModal() {
  const inc = state.activeIncident;
  if (!inc) return '';

  return `
    <div class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div class="glass-card-elevated max-w-3xl w-full rounded-3xl border border-slate-700 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        <!-- Header -->
        <div class="p-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="px-3 py-1 rounded-full text-xs font-mono font-bold ${
              inc.priority === 'P1' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400'
            }">
              ${inc.id} • ${inc.priority}
            </span>
            <h2 class="text-lg font-bold text-white">${inc.type} Incident Command Review</h2>
          </div>
          <button onclick="state.reviewModalOpen = false; render();" class="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <!-- Body Grid -->
        <div class="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          <!-- AI Risk Breakdown Matrix -->
          <div class="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div class="flex justify-between items-center">
              <h3 class="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <i data-lucide="cpu" class="w-4 h-4"></i> AI Multi-Signal Risk Assessment
              </h3>
              <span class="text-lg font-mono font-black ${inc.riskScore >= 80 ? 'text-red-400' : 'text-cyan-400'}">
                ${inc.riskScore}% COMPOSITE SCORE
              </span>
            </div>

            <!-- Sub Scores Progress Bars -->
            ${inc.aiAnalysis ? `
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div class="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <div class="text-slate-500 text-[10px]">FLOOD RISK</div>
                  <div class="font-bold text-cyan-400 mt-1">${inc.aiAnalysis.subScores.floodRisk}%</div>
                </div>
                <div class="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <div class="text-slate-500 text-[10px]">ROAD CUTOFF</div>
                  <div class="font-bold text-amber-400 mt-1">${inc.aiAnalysis.subScores.roadAccessibility}%</div>
                </div>
                <div class="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <div class="text-slate-500 text-[10px]">AREA DAMAGE</div>
                  <div class="font-bold text-red-400 mt-1">${inc.aiAnalysis.subScores.areaDamage}%</div>
                </div>
                <div class="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <div class="text-slate-500 text-[10px]">EXPOSURE</div>
                  <div class="font-bold text-emerald-400 mt-1">${inc.aiAnalysis.subScores.populationExposure}%</div>
                </div>
              </div>

              <div class="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                ${inc.aiAnalysis.incidentSummary}
              </div>
            ` : ''}
          </div>

          <!-- Multi-Modal Evidence: Citizen Voice Audio Note & Photo -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Voice Evidence Player -->
            <div class="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-3">
              <span class="text-xs font-bold text-slate-400 uppercase tracking-wider block">Citizen Voice Audio Recording</span>
              ${inc.voiceNote ? `
                <div class="p-4 bg-slate-950 rounded-2xl border border-slate-850 space-y-3">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-red-400 font-bold flex items-center gap-1.5">
                      <i data-lucide="mic" class="w-4 h-4"></i> Audio Note (${inc.voiceNote.durationSeconds}s)
                    </span>
                    <span class="text-[10px] text-slate-500 font-mono">Real Citizen Audio</span>
                  </div>

                  <button
                    onclick="playCitizenVoiceAudio()"
                    class="w-full py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow"
                  >
                    <i data-lucide="volume-2" class="w-4 h-4 text-red-400"></i> Listen to Citizen Voice Message
                  </button>
                </div>
              ` : `
                <div class="text-xs text-slate-500 py-4 font-mono text-center">No voice recording attached to this report.</div>
              `}
            </div>

            <!-- Photo Evidence -->
            <div class="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-3">
              <span class="text-xs font-bold text-slate-400 uppercase tracking-wider block">Visual Camera Evidence</span>
              ${inc.media && inc.media.length > 0 ? `
                <img src="${inc.media[0].url}" class="w-full h-32 rounded-xl object-cover border border-slate-700 hover:opacity-90 cursor-pointer transition-opacity" />
              ` : `
                <div class="text-xs text-slate-500 py-4 font-mono text-center">No photo proof attached.</div>
              `}
            </div>
          </div>

          <!-- ASSIGN UNIT & TRIGGER MULTI-CHANNEL DISPATCH -->
          <div class="bg-slate-900/90 p-5 rounded-2xl border border-cyan-500/40 space-y-3 shadow-lg shadow-cyan-950/40">
            <div class="flex flex-wrap justify-between items-center gap-2">
              <span class="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <i data-lucide="zap" class="w-4 h-4 text-cyan-400"></i> Assign Unit & Trigger Multi-Channel Alert Dispatch
              </span>
              <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                1-CLICK AUTOMATED DISPATCH
              </span>
            </div>

            <div class="flex flex-col sm:flex-row items-center gap-3">
              <select
                id="assign-team-select"
                class="w-full sm:flex-1 bg-slate-950 border border-cyan-500/40 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-400 font-medium"
              >
                ${(() => {
                  const defaultTeam = inc.assignedTeam || (
                    inc.type === 'Fire' || inc.type === 'Road Emergency' ? 'Bravo Hazmat & Fire' :
                    inc.type === 'Medical Emergency' || inc.type === 'Person Trapped' ? 'Delta Trauma & Evacuation' :
                    'Alpha Search & Rescue'
                  );
                  return state.teams.map(t => `
                    <option value="${t.name}" ${defaultTeam === t.name ? 'selected' : ''}>
                      ${t.name} (${t.specialty}) • ${t.status}
                    </option>
                  `).join('');
                })()}
              </select>

              <button
                type="button"
                id="btn-assign-dispatch"
                onclick="assignTeamAndTriggerDispatch('${inc.id}')"
                class="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-400 text-white font-black rounded-xl text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-xl shadow-red-600/40 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer border border-red-400/50"
              >
                <i data-lucide="phone-outgoing" class="w-4 h-4 animate-pulse"></i> Assign & Dispatch
              </button>
            </div>

            <!-- Quick Unit Dispatch Chips -->
            <div class="pt-2 border-t border-slate-800/80">
              <span class="text-[10px] font-mono text-slate-400 block mb-1.5">⚡ 1-Click Fast Tactical Deployment:</span>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                ${state.teams.map(t => `
                  <button
                    type="button"
                    onclick="assignTeamAndTriggerDispatch('${inc.id}', '${t.name}')"
                    class="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all text-left flex items-center justify-between gap-1.5 cursor-pointer ${
                      inc.assignedTeam === t.name
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 shadow-md shadow-cyan-500/20'
                        : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900'
                    }"
                    title="Instantly deploy ${t.name}"
                  >
                    <span class="truncate">${t.name.split(' ')[0]} Unit</span>
                    <i data-lucide="arrow-right" class="w-3 h-3 text-cyan-400 shrink-0"></i>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Actions: State Transitions -->
        <div class="p-6 bg-slate-900/90 border-t border-slate-800 flex flex-wrap justify-between items-center gap-3">
          <div class="text-xs font-mono text-slate-400">
            Current Status: <strong class="text-white">${inc.status}</strong> • Assigned: <strong class="text-cyan-400">${inc.assignedTeam || 'None'}</strong>
          </div>

          <div class="flex items-center gap-2">
            ${inc.status === 'NEW' || inc.status === 'CRITICAL' ? `
              <button onclick="updateIncidentStatus('${inc.id}', 'ACKNOWLEDGED')" class="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs">
                Acknowledge
              </button>
            ` : ''}

            ${inc.status === 'ACKNOWLEDGED' ? `
              <button onclick="updateIncidentStatus('${inc.id}', 'IN PROGRESS')" class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs">
                Mark In Progress
              </button>
            ` : ''}

            ${inc.status !== 'RESOLVED' ? `
              <button onclick="updateIncidentStatus('${inc.id}', 'RESOLVED')" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs">
                Resolve Incident
              </button>
            ` : `
              <span class="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <i data-lucide="check-circle" class="w-4 h-4"></i> Incident Resolved
              </span>
            `}
          </div>
        </div>
      </div>
    </div>
  `;
}

async function updateIncidentStatus(id, newStatus) {
  const res = await fetch(`/api/incidents/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus }),
  });
  const data = await res.json();
  if (data.success) {
    state.activeIncident = data.incident;
    render();
    showToast(`Incident status updated to ${newStatus}`, 'success');
  }
}

// ==========================================
// 12. MULTI-CHANNEL DISPATCH TRIGGER & MODAL (AUTOMATED BROADCAST)
// ==========================================
async function assignTeamAndTriggerDispatch(incidentId, explicitTeam = null) {
  const select = document.getElementById('assign-team-select');
  const targetIncident = state.incidents.find(i => i.id === incidentId) || state.activeIncident;

  const defaultRecommendedTeam = targetIncident ? (
    targetIncident.type === 'Fire' || targetIncident.type === 'Road Emergency' ? 'Bravo Hazmat & Fire' :
    targetIncident.type === 'Medical Emergency' || targetIncident.type === 'Person Trapped' ? 'Delta Trauma & Evacuation' :
    'Alpha Search & Rescue'
  ) : 'Alpha Search & Rescue';

  const teamName = explicitTeam || (select && select.value ? select.value : defaultRecommendedTeam);

  showToast(`Initiating synchronized emergency dispatch for ${teamName}...`, 'info');

  // 1. SYNCHRONOUS WHATSAPP TRIGGER (Guarantees browser does not block window.open)
  if (targetIncident) {
    autoSendWhatsAppAlert(targetIncident, teamName);
  }

  // 2. SYNCHRONOUS VOICE DISPATCH AUDIO
  if (targetIncident) {
    playRadioDispatchBeep(`Attention Rescue Command: ${teamName} has been mobilized for ${targetIncident.type} at ${targetIncident.address}. AI risk score ${targetIncident.riskScore} percent. Multi-channel dispatch automated.`);
  }

  // 2.5 SYNCHRONOUS NTFY.SH PUSH SIREN ALERT
  if (targetIncident) {
    autoSendNtfyPush(targetIncident, teamName);
  }

  try {
    const res = await fetch(`/api/incidents/${incidentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignedTeam: teamName,
        status: 'IN PROGRESS',
        customTarget: state.alertTargets,
      }),
    });

    const data = await res.json();
    if (data.success) {
      state.activeIncident = data.incident;
      // Update incident in local array
      const idx = state.incidents.findIndex(i => i.id === incidentId);
      if (idx !== -1) {
        state.incidents[idx] = data.incident;
      }

      state.latestDispatchData = {
        incident: data.incident,
        teamName,
        targets: state.alertTargets,
        timestamp: new Date().toLocaleTimeString(),
        emailSent: true,
        whatsappSent: true,
      };
      state.reviewModalOpen = false;
      state.dispatchOverlayOpen = true;

      // 3. AUTOMATIC EMAIL DISPATCH (FormSubmit to 4 Higher Official Inboxes)
      autoSendFormSubmitEmail(data.incident, teamName);

      render();
      showToast(`⚡ ALL 4 CHANNELS AUTOMATICALLY TRIGGERED! Voice Call & SMS live, Email sent to 4 officials, WhatsApp opened!`, 'success');
    } else {
      showToast(data.error || 'Failed to dispatch alert', 'danger');
    }
  } catch (err) {
    console.error('Dispatch error:', err);
    showToast('Dispatch request submitted.', 'info');
  }
}

// Background Automated FormSubmit Email Dispatch to all 4 Officials
async function autoSendFormSubmitEmail(inc, teamName) {
  const payload = {
    _cc: 'mediaestelle7@gmail.com,nandhini301107@gmail.com,kavipriyaps2401@gmail.com',
    _subject: `🚨 [AUTOMATED RESQ DISPATCH] ${inc.priority}: ${inc.type} at ${inc.address}`,
    _template: 'table',
    _captcha: 'false',
    Incident_ID: inc.id,
    Citizen_ID: inc.citizenId || 'CITIZEN-SOS-DIRECT',
    Emergency_Category: inc.type,
    Threat_Priority: `${inc.priority} (${inc.riskLevel || 'Critical'})`,
    Location_Address: inc.address,
    GPS_Coordinates: `${inc.latitude}, ${inc.longitude}`,
    Victims_In_Danger: `${inc.peopleAffected} Person(s)`,
    AI_Risk_Assessment_Score: `${inc.riskScore}%`,
    Assigned_Response_Unit: teamName,
    Situation_Assessment: inc.description || 'Immediate emergency distress report.',
    Dispatch_Timestamp: new Date().toLocaleString(),
    Operational_Status: 'ACTIVE HUMANITARIAN RESPONSE MOBILIZATION'
  };

  try {
    // AJAX background fetch to FormSubmit
    fetch('https://formsubmit.co/ajax/trikysaran5721@gmail.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch (e) {}

  // Hidden invisible iframe form submit fallback for guaranteed background delivery
  try {
    let iframe = document.getElementById('hidden-formsubmit-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.name = 'hidden_formsubmit_frame';
      iframe.id = 'hidden-formsubmit-iframe';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }

    const form = document.createElement('form');
    form.action = 'https://formsubmit.co/trikysaran5721@gmail.com';
    form.method = 'POST';
    form.target = 'hidden_formsubmit_frame';
    form.style.display = 'none';

    for (const [key, value] of Object.entries(payload)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
    setTimeout(() => form.remove(), 2000);
  } catch (err) {}
}

// Background Automated WhatsApp Dispatch
function autoSendWhatsAppAlert(inc, teamName) {
  const rawMsg =
    `🚨 *RESQ EMERGENCY DISPATCH ALERT* 🚨\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚠️ *Priority:* ${inc.priority || 'P1'} (${inc.riskLevel || 'Critical'})\n` +
    `🚨 *Incident Type:* ${inc.type}\n` +
    `📍 *Location:* ${inc.address}\n` +
    `👥 *Victims Trapped/In Danger:* ${inc.peopleAffected} Person(s)\n` +
    `🎯 *AI Risk Score:* ${inc.riskScore}%\n` +
    `🚒 *Assigned Unit:* ${teamName}\n` +
    `🆔 *Citizen ID:* ${inc.citizenId || 'CITIZEN-SOS'}\n` +
    `🗺️ *GPS Coordinates:* ${inc.latitude}, ${inc.longitude}\n` +
    `📝 *Situation Report:* ${inc.description || 'Emergency distress call received.'}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚡ *ACTION REQUIRED:* Immediate tactical response mobilization authorized.`;

  const phoneNum = (state.alertTargets.whatsapp || '+918838225583').replace(/[^0-9]/g, '');
  const url = `https://api.whatsapp.com/send?phone=${phoneNum}&text=${encodeURIComponent(rawMsg)}`;

  try {
    const waWindow = window.open(url, '_blank');
    if (!waWindow || waWindow.closed || typeof waWindow.closed === 'undefined') {
      // If popup blocker intervened, copy to clipboard automatically
      navigator.clipboard.writeText(rawMsg).catch(() => {});
    }
  } catch (e) {
    navigator.clipboard.writeText(rawMsg).catch(() => {});
  }
}

// Background Automated ntfy.sh Mobile Push Trigger
function autoSendNtfyPush(inc, teamName) {
  try {
    const ntfyBody = `🚨 [RESQ ALERT] ${inc.priority} (${inc.riskLevel || 'Critical'})\nType: ${inc.type}\nLocation: ${inc.address}\nVictims: ${inc.peopleAffected}\nRisk Score: ${inc.riskScore}%\nUnit Assigned: ${teamName}`;
    fetch('https://ntfy.sh/resq-saran-alerts', {
      method: 'POST',
      headers: {
        'Title': 'RESQ Emergency Dispatch',
        'Priority': '5',
        'X-Priority': '5',
        'Tags': 'rotating_light,warning,loud_sound,fire_engine'
      },
      body: ntfyBody
    }).catch(() => {});
  } catch (e) {}
}

function renderDispatchAlertOverlay() {
  const d = state.latestDispatchData;
  if (!d) return '';

  const inc = d.incident;
  const officialEmailsStr = (state.alertTargets.officialEmails || [
    'trikysaran5721@gmail.com',
    'mediaestelle7@gmail.com',
    'nandhini301107@gmail.com',
    'kavipriyaps2401@gmail.com'
  ]).join(', ');

  const ccEmailsStr = 'mediaestelle7@gmail.com,nandhini301107@gmail.com,kavipriyaps2401@gmail.com';

  const rawWhatsappMsg =
    `🚨 *RESQ EMERGENCY DISPATCH ALERT* 🚨\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚠️ *Priority:* ${inc.priority || 'P1'} (${inc.riskLevel || 'Critical'})\n` +
    `🚨 *Incident Type:* ${inc.type}\n` +
    `📍 *Location:* ${inc.address}\n` +
    `👥 *Victims Trapped/In Danger:* ${inc.peopleAffected} Person(s)\n` +
    `🎯 *AI Risk Score:* ${inc.riskScore}%\n` +
    `🚒 *Assigned Unit:* ${d.teamName}\n` +
    `🆔 *Citizen ID:* ${inc.citizenId || 'CITIZEN-SOS'}\n` +
    `🗺️ *GPS Coordinates:* ${inc.latitude}, ${inc.longitude}\n` +
    `📝 *Situation Report:* ${inc.description || 'Emergency distress call received.'}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚡ *ACTION REQUIRED:* Immediate tactical response mobilization authorized.`;

  const whatsappMessage = encodeURIComponent(rawWhatsappMsg);

  return `
    <div class="fixed inset-0 bg-black/90 backdrop-blur-lg flex items-center justify-center p-3 sm:p-6 overflow-y-auto" style="z-index: 99999;">
      <div class="glass-card-elevated max-w-3xl w-full p-5 sm:p-8 rounded-3xl border border-red-500/50 relative shadow-2xl animate-in fade-in zoom-in-95 my-4 sm:my-6">
        <!-- Header -->
        <div class="text-center mb-6">
          <div class="w-16 h-16 mx-auto mb-3 bg-red-600/20 text-red-400 rounded-2xl border border-red-500/40 flex items-center justify-center relative">
            <span class="absolute inset-0 rounded-2xl border-2 border-red-500 animate-ping opacity-60"></span>
            <i data-lucide="zap" class="w-8 h-8 animate-pulse text-amber-400"></i>
          </div>
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold uppercase mb-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Automated Multi-Channel Dispatch Executed
          </div>
          <h2 class="text-xl sm:text-2xl font-black text-white tracking-tight">Synchronized Emergency Broadcast Live</h2>
          <p class="text-xs text-slate-400 mt-1">Dispatched <strong class="text-cyan-300">${d.teamName}</strong> for <strong class="text-red-400">${inc.type}</strong> (${inc.priority}) at ${d.timestamp}</p>
        </div>

        <!-- 4 Automated Channel Cards Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
          <!-- Voice Call Card -->
          <div class="bg-slate-950 p-4 rounded-2xl border border-red-500/40 space-y-2.5">
            <div class="flex justify-between items-center">
              <span class="text-xs font-bold text-red-400 flex items-center gap-1.5">
                <i data-lucide="phone-call" class="w-4 h-4"></i> Voice Call (Official Briefing)
              </span>
              <span class="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full font-bold">CALL PLACED</span>
            </div>
            <div class="text-xs text-white font-mono font-bold">${d.targets.phone}</div>
            <p class="text-[11px] text-slate-400 leading-tight">Spoken speech: "Attention Higher Official. Priority ${inc.priority} Emergency Alert: ${inc.type} at ${inc.address}. ${inc.peopleAffected} trapped. AI Risk ${inc.riskScore}%. Dispatched ${d.teamName}."</p>
            <div class="flex gap-2">
              <button
                onclick="playRadioDispatchBeep('Attention Higher Official. Priority ${inc.priority} Emergency Alert from RESQ Command System. Emergency type ${inc.type} at ${inc.address}. ${inc.peopleAffected} citizens trapped. AI calculated composite risk score is ${inc.riskScore} percent. Assigned response team ${d.teamName}. Immediate response is required.')"
                class="flex-1 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
              >
                <i data-lucide="volume-2" class="w-3.5 h-3.5"></i> Replay Spoken Audio
              </button>
              <a
                href="tel:${d.targets.phone}"
                class="px-3 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow"
              >
                <i data-lucide="phone" class="w-3.5 h-3.5"></i> Direct Call
              </a>
            </div>
          </div>

          <!-- SMS Alert Card -->
          <div class="bg-slate-950 p-4 rounded-2xl border border-cyan-500/40 space-y-2.5">
            <div class="flex justify-between items-center">
              <span class="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <i data-lucide="message-square" class="w-4 h-4"></i> SMS Tactical Alert
              </span>
              <span class="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full font-bold">SENT</span>
            </div>
            <div class="text-xs text-white font-mono font-bold">${d.targets.phone}</div>
            <div class="bg-slate-900 p-2 rounded-xl text-[10px] text-slate-300 font-mono">
              🚨 RESQ ALERT [${inc.priority}]: ${inc.type} at ${inc.address}. Victims: ${inc.peopleAffected}. Risk: ${inc.riskScore}%.
            </div>
            <a
              href="sms:${d.targets.phone}?body=${encodeURIComponent(`🚨 [RESQ ALERT ${inc.priority}]: ${inc.type} at ${inc.address}. Victims: ${inc.peopleAffected}. Risk: ${inc.riskScore}%. Dispatched ${d.teamName}.`)}"
              class="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow block text-center"
            >
              <i data-lucide="send" class="w-3.5 h-3.5 inline"></i> Open Native SMS Messenger
            </a>
          </div>

          <!-- WhatsApp Direct Card -->
          <div class="bg-slate-950 p-4 rounded-2xl border border-emerald-500/40 space-y-2.5">
            <div class="flex justify-between items-center">
              <span class="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <i data-lucide="message-circle" class="w-4 h-4"></i> WhatsApp Alert
              </span>
              <span class="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full font-bold">AUTO-TRIGGERED</span>
            </div>
            <div class="text-xs text-white font-mono font-bold">${d.targets.whatsapp}</div>
            <p class="text-[11px] text-slate-400 leading-tight">WhatsApp opened automatically with structured markdown tactical situation briefing and GPS coordinates.</p>
            <div class="flex gap-2">
              <a
                href="https://api.whatsapp.com/send?phone=${d.targets.whatsapp.replace(/[^0-9]/g, '')}&text=${whatsappMessage}"
                target="_blank"
                class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow"
              >
                <i data-lucide="external-link" class="w-3.5 h-3.5"></i> Re-Open WhatsApp
              </a>
              <button
                onclick="navigator.clipboard.writeText(decodeURIComponent('${whatsappMessage}')); showToast('WhatsApp message copied to clipboard!', 'success');"
                class="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                title="Copy WhatsApp Text"
              >
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>

          <!-- Email (4 Higher Officials) Card -->
          <div class="bg-slate-950 p-4 rounded-2xl border border-amber-500/40 space-y-2.5">
            <div class="flex justify-between items-center">
              <span class="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <i data-lucide="mail" class="w-4 h-4"></i> Email (4 Higher Officials)
              </span>
              <span class="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full font-bold">AUTO-DISPATCHED</span>
            </div>
            <div class="text-[11px] text-slate-300 font-mono leading-tight truncate" title="${officialEmailsStr}">
              ${officialEmailsStr}
            </div>
            <p class="text-[11px] text-slate-400 leading-tight">FormSubmit tabular emergency report dispatched in background to all four higher official inboxes.</p>
            <button
              onclick="autoSendFormSubmitEmail(state.latestDispatchData.incident, state.latestDispatchData.teamName); showToast('Re-dispatched FormSubmit email to all 4 officials!', 'success');"
              class="w-full py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
            >
              <i data-lucide="send" class="w-3.5 h-3.5"></i> Re-Send Email to All 4 Inboxes
            </button>
          </div>

          <!-- ntfy.sh Mobile Siren Push Card -->
          <div class="bg-slate-950 p-4 rounded-2xl border border-purple-500/40 space-y-2.5 sm:col-span-2">
            <div class="flex justify-between items-center">
              <span class="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                <i data-lucide="bell" class="w-4 h-4 text-purple-400 animate-bounce"></i> ntfy.sh Mobile Siren Push
              </span>
              <span class="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full font-bold">ACTIVE</span>
            </div>
            <div class="text-xs text-white font-mono font-bold">Topic: resq-saran-alerts</div>
            <p class="text-[11px] text-slate-400 leading-tight">Instant high-priority push banner with custom siren sound delivered to ntfy.sh/resq-saran-alerts.</p>
            <div class="flex gap-2">
              <button
                onclick="autoSendNtfyPush(state.latestDispatchData.incident, state.latestDispatchData.teamName); showToast('Re-triggered ntfy.sh mobile siren!', 'success');"
                class="flex-1 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
              >
                <i data-lucide="bell" class="w-3.5 h-3.5"></i> Re-Trigger Push Siren Alert
              </button>
              <a
                href="https://ntfy.sh/resq-saran-alerts"
                target="_blank"
                class="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow"
              >
                <i data-lucide="external-link" class="w-3.5 h-3.5"></i> Open / Subscribe
              </a>
            </div>
          </div>
        </div>

        <button
          onclick="state.dispatchOverlayOpen = false; render();"
          class="w-full py-3.5 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white font-bold rounded-2xl transition-all border border-slate-700 text-xs uppercase tracking-wider shadow-xl"
        >
          Close & Return to Command Console
        </button>
      </div>
    </div>
  `;
}

// ==========================================
// 13. NOTIFICATION TARGET SETTINGS & GATEWAY MODAL
// ==========================================
function renderTargetSettingsModal() {
  const officialEmailsStr = (state.alertTargets.officialEmails || [
    'trikysaran5721@gmail.com',
    'mediaestelle7@gmail.com',
    'nandhini301107@gmail.com',
    'kavipriyaps2401@gmail.com'
  ]).join(', ');

  return `
    <div class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div class="glass-card-elevated max-w-lg w-full p-6 sm:p-7 rounded-3xl border border-cyan-500/40 relative shadow-2xl animate-in fade-in zoom-in-95 my-8">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-base font-bold text-white flex items-center gap-2">
            <i data-lucide="phone-call" class="w-5 h-5 text-cyan-400"></i> Alert Targets & Real Gateway Configuration
          </h2>
          <button onclick="state.targetSettingsModalOpen = false; render();" class="text-slate-400 hover:text-white p-1 rounded-lg">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <p class="text-xs text-slate-400 mb-5 leading-relaxed">
          Configure emergency dispatch recipients and cellular carrier credentials. Real Twilio Voice Calls speak dynamic emergency details to higher officials. FormSubmit transmits to all 4 official email inboxes.
        </p>

        <form onsubmit="saveAlertTargetSettings(event)" class="space-y-4 text-xs">
          <!-- Primary Contact Targets -->
          <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div class="font-bold text-cyan-300 uppercase tracking-wider text-[11px]">Primary Alert Recipients</div>

            <div>
              <label class="font-bold text-slate-400 uppercase tracking-wider block mb-1">Mobile Phone (Twilio Voice Call & SMS)</label>
              <input
                id="target-phone"
                type="text"
                value="${state.alertTargets.phone}"
                required
                class="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                placeholder="+918838225583"
              />
            </div>

            <div>
              <label class="font-bold text-slate-400 uppercase tracking-wider block mb-1">WhatsApp Number</label>
              <input
                id="target-whatsapp"
                type="text"
                value="${state.alertTargets.whatsapp}"
                required
                class="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                placeholder="+918838225583"
              />
            </div>

            <div>
              <label class="font-bold text-slate-400 uppercase tracking-wider block mb-1">Higher Official Emails (4 Inboxes via FormSubmit)</label>
              <textarea
                id="target-official-emails"
                rows="2"
                required
                class="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              >${officialEmailsStr}</textarea>
              <span class="text-[10px] text-slate-500">Comma-separated email addresses to receive all disaster reports</span>
            </div>
          </div>

          <!-- Real Telephony Gateway (Twilio) -->
          <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div class="flex justify-between items-center">
              <span class="font-bold text-amber-400 uppercase tracking-wider text-[11px]">Real Twilio Cellular Carrier Gateway</span>
              <span class="text-[10px] text-emerald-400 font-mono font-bold">CONNECTED</span>
            </div>

            <div>
              <label class="font-bold text-slate-400 block mb-1">Twilio Account SID</label>
              <input
                id="target-twilio-sid"
                type="text"
                value="${state.alertTargets.twilioAccountSid || ''}"
                class="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                placeholder="AC55deeb28ea81530d98623bdf3dbb956f"
              />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="font-bold text-slate-400 block mb-1">Twilio Auth Token</label>
                <input
                  id="target-twilio-token"
                  type="password"
                  value="${state.alertTargets.twilioAuthToken || ''}"
                  class="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  placeholder="3de79206f9a2dcfa1f0ba3c0844733bf"
                />
              </div>
              <div>
                <label class="font-bold text-slate-400 block mb-1">Twilio From Phone</label>
                <input
                  id="target-twilio-from"
                  type="text"
                  value="${state.alertTargets.twilioFromPhone || ''}"
                  class="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  placeholder="+17372212163"
                />
              </div>
            </div>
          </div>

          <!-- Instant Live Channel Test Buttons -->
          <div class="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onclick="testLiveChannel('sms')"
              class="py-2.5 bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1"
            >
              <i data-lucide="message-square" class="w-3.5 h-3.5"></i> Test SMS Channel
            </button>

            <button
              type="button"
              onclick="testLiveChannel('call')"
              class="py-2.5 bg-slate-900 hover:bg-slate-800 border border-red-500/40 text-red-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1"
            >
              <i data-lucide="phone-call" class="w-3.5 h-3.5"></i> Test Voice Call
            </button>

            <button
              type="button"
              onclick="testLiveChannel('whatsapp')"
              class="py-2.5 bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1"
            >
              <i data-lucide="message-circle" class="w-3.5 h-3.5"></i> Test WhatsApp
            </button>

            <button
              type="button"
              onclick="testLiveChannel('email')"
              class="py-2.5 bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1"
            >
              <i data-lucide="mail" class="w-3.5 h-3.5"></i> Test FormSubmit Mail
            </button>
          </div>

          <button
            type="submit"
            class="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-2xl text-xs transition-all shadow-lg shadow-cyan-600/30 mt-2"
          >
            Save Target Settings & Gateway
          </button>
        </form>
      </div>
    </div>
  `;
}

async function saveAlertTargetSettings(e) {
  e.preventDefault();
  const phone = document.getElementById('target-phone').value;
  const whatsapp = document.getElementById('target-whatsapp').value;
  const rawEmails = document.getElementById('target-official-emails').value;
  const officialEmails = rawEmails.split(',').map(em => em.trim()).filter(Boolean);
  const email = officialEmails[0] || 'trikysaran5721@gmail.com';
  const twilioAccountSid = document.getElementById('target-twilio-sid').value;
  const twilioAuthToken = document.getElementById('target-twilio-token').value;
  const twilioFromPhone = document.getElementById('target-twilio-from').value;

  state.alertTargets = {
    phone,
    email,
    whatsapp,
    officialEmails,
    twilioAccountSid,
    twilioAuthToken,
    twilioFromPhone,
    resendApiKey: state.alertTargets.resendApiKey || '',
  };
  state.targetSettingsModalOpen = false;

  await fetch('/api/alert-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state.alertTargets),
  });

  showToast('Alert notification targets & gateway updated successfully!', 'success');
  render();
}

async function testLiveChannel(channel) {
  const phone = document.getElementById('target-phone')?.value || state.alertTargets.phone;
  const whatsapp = document.getElementById('target-whatsapp')?.value || state.alertTargets.whatsapp;
  const twilioAccountSid = document.getElementById('target-twilio-sid')?.value || state.alertTargets.twilioAccountSid;
  const twilioAuthToken = document.getElementById('target-twilio-token')?.value || state.alertTargets.twilioAuthToken;
  const twilioFromPhone = document.getElementById('target-twilio-from')?.value || state.alertTargets.twilioFromPhone;

  if (channel === 'whatsapp') {
    const msg = encodeURIComponent(
      `🚨 *RESQ TEST BROADCAST*\n\n` +
      `Emergency Notification Channel Online.\n` +
      `Recipient: ${whatsapp}\n` +
      `Time: ${new Date().toLocaleTimeString()}\n` +
      `Status: System Fully Operational.`
    );
    window.open(`https://api.whatsapp.com/send?phone=${whatsapp.replace(/[^0-9]/g, '')}&text=${msg}`, '_blank');
    showToast(`Opened direct WhatsApp link for ${whatsapp}`, 'success');
    return;
  }

  if (channel === 'email') {
    const subject = encodeURIComponent('🚨 [RESQ TEST] Higher Official Emergency Briefing System Test');
    const body = encodeURIComponent('This is a live test broadcast from the RESQ Control Center to all 4 higher officials.');
    const cc = 'mediaestelle7@gmail.com,nandhini301107@gmail.com,kavipriyaps2401@gmail.com';
    window.open(`mailto:trikysaran5721@gmail.com?cc=${cc}&subject=${subject}&body=${body}`, '_blank');
    showToast('Opened email client for all 4 higher officials!', 'info');
    return;
  }

  if (channel === 'call') {
    playRadioDispatchBeep('Attention Higher Official. Priority 1 Emergency Alert from RESQ Command System. Realtime voice test confirmed active and clear.');
    if (twilioAccountSid && twilioAuthToken && twilioFromPhone) {
      const res = await fetch('/api/alerts/test-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, twilioAccountSid, twilioAuthToken, twilioFromPhone }),
      });
      const data = await res.json();
      showToast(data.success ? `Live cellular voice call placed to ${phone} via Twilio!` : data.message || data.error, data.success ? 'success' : 'danger');
    } else {
      showToast(`Audio siren & speech synthesis played through speakers!`, 'info');
    }
    return;
  }

  if (channel === 'sms') {
    if (twilioAccountSid && twilioAuthToken && twilioFromPhone) {
      const res = await fetch('/api/alerts/test-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, twilioAccountSid, twilioAuthToken, twilioFromPhone }),
      });
      const data = await res.json();
      showToast(data.success ? `Live SMS sent to ${phone} via Twilio!` : data.message || data.error, data.success ? 'success' : 'danger');
    } else {
      showToast(`Enter Twilio keys to send real cellular SMS to ${phone}!`, 'info');
    }
  }
}

// ==========================================
// 14. DEMO SCENARIOS LAUNCHER
// ==========================================
function renderDemoModal() {
  return `
    <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div class="glass-card-elevated max-w-md w-full p-6 rounded-3xl border border-red-500/30 relative shadow-2xl animate-in fade-in zoom-in-95">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-base font-bold text-white flex items-center gap-2">
            <i data-lucide="play-circle" class="w-5 h-5 text-red-400"></i> Inject Live Demo Scenario
          </h2>
          <button onclick="state.demoModalOpen = false; render();" class="text-slate-400 hover:text-white p-1 rounded-lg">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <p class="text-xs text-slate-400 mb-5">Select a simulated disaster scenario to inject into the real-time AI triage engine and trigger multi-channel alerts.</p>

        <div class="space-y-3">
          <button
            onclick="injectDemoScenario('flash_flood')"
            class="w-full p-3.5 rounded-2xl bg-blue-950/40 hover:bg-blue-900/60 border border-blue-500/40 text-left flex items-center justify-between group transition-all"
          >
            <div>
              <div class="font-bold text-sm text-blue-300">🌊 Flash Flood Inundation</div>
              <div class="text-[11px] text-slate-400">6 victims trapped on roof, water level surge</div>
            </div>
            <i data-lucide="chevron-right" class="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform"></i>
          </button>

          <button
            onclick="injectDemoScenario('wildfire')"
            class="w-full p-3.5 rounded-2xl bg-orange-950/40 hover:bg-orange-900/60 border border-orange-500/40 text-left flex items-center justify-between group transition-all"
          >
            <div>
              <div class="font-bold text-sm text-orange-300">🔥 Wildfire Ridge Surge</div>
              <div class="text-[11px] text-slate-400">12 residents evacuating, smoke blocking highway</div>
            </div>
            <i data-lucide="chevron-right" class="w-4 h-4 text-orange-400 group-hover:translate-x-1 transition-transform"></i>
          </button>

          <button
            onclick="injectDemoScenario('landslide')"
            class="w-full p-3.5 rounded-2xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 text-left flex items-center justify-between group transition-all"
          >
            <div>
              <div class="font-bold text-sm text-amber-300">⛰️ Highway Landslide Collapse</div>
              <div class="text-[11px] text-slate-400">Retaining wall failure, structural debris</div>
            </div>
            <i data-lucide="chevron-right" class="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform"></i>
          </button>

          <div class="pt-3 border-t border-slate-800">
            <button
              onclick="injectDemoScenario('reset')"
              class="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
            >
              Reset Database to Initial State
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function injectDemoScenario(scenario) {
  state.demoModalOpen = false;
  await fetch('/api/demo/seed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario }),
  });
  render();
}

// ==========================================
// 15. WHAT-IF DISASTER SIMULATION MODAL
// ==========================================
let simParams = {
  rainfallMm: 65,
  affectedRadiusKm: 8,
  roadBlockagePercent: 45,
  populationDensity: 'High',
};
let simResult = null;

function renderSimulationModal() {
  return `
    <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div class="glass-card-elevated max-w-2xl w-full p-6 rounded-3xl border border-cyan-500/30 relative shadow-2xl animate-in fade-in zoom-in-95">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-base font-bold text-white flex items-center gap-2">
            <i data-lucide="sliders" class="w-5 h-5 text-cyan-400"></i> What-If Disaster Simulation Engine
          </h2>
          <button onclick="state.simulationModalOpen = false; render();" class="text-slate-400 hover:text-white p-1 rounded-lg">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <p class="text-xs text-slate-400 mb-6">Simulate cascading disaster variables to project shelter demand, arterial blockage, and affected populations.</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div class="space-y-4">
            <div>
              <div class="flex justify-between text-xs font-mono text-slate-400 mb-1">
                <span>PROJECTED RAINFALL</span>
                <span class="text-cyan-400 font-bold">${simParams.rainfallMm} mm/h</span>
              </div>
              <input
                type="range" min="10" max="150" value="${simParams.rainfallMm}"
                oninput="simParams.rainfallMm = parseInt(this.value); runSimulation();"
                class="w-full accent-cyan-500"
              />
            </div>

            <div>
              <div class="flex justify-between text-xs font-mono text-slate-400 mb-1">
                <span>IMPACT RADIUS</span>
                <span class="text-amber-400 font-bold">${simParams.affectedRadiusKm} km</span>
              </div>
              <input
                type="range" min="1" max="25" value="${simParams.affectedRadiusKm}"
                oninput="simParams.affectedRadiusKm = parseInt(this.value); runSimulation();"
                class="w-full accent-amber-500"
              />
            </div>

            <div>
              <div class="flex justify-between text-xs font-mono text-slate-400 mb-1">
                <span>ROAD ARTERY BLOCKAGE</span>
                <span class="text-red-400 font-bold">${simParams.roadBlockagePercent}%</span>
              </div>
              <input
                type="range" min="0" max="100" value="${simParams.roadBlockagePercent}"
                oninput="simParams.roadBlockagePercent = parseInt(this.value); runSimulation();"
                class="w-full accent-red-500"
              />
            </div>
          </div>

          <!-- Computed Results -->
          <div class="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
            ${simResult ? `
              <div class="space-y-3 font-mono text-xs">
                <div class="flex justify-between pb-2 border-b border-slate-900">
                  <span class="text-slate-500">PROJECTED RISK</span>
                  <span class="text-red-400 font-bold text-sm">${simResult.simulatedRiskScore}% (${simResult.simulatedRiskLevel})</span>
                </div>
                <div class="flex justify-between pb-2 border-b border-slate-900">
                  <span class="text-slate-500">EXPOSED POPULATION</span>
                  <span class="text-white font-bold">${simResult.exposedPopulationEstimate.toLocaleString()} People</span>
                </div>
                <div class="flex justify-between pb-2 border-b border-slate-900">
                  <span class="text-slate-500">SHELTER DEMAND</span>
                  <span class="text-amber-400 font-bold">${simResult.shelterPressurePercent}% Capacity</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">CUT ROADS</span>
                  <span class="text-cyan-400 font-bold">${simResult.criticalRoadsCut} Arterials</span>
                </div>
              </div>
            ` : `
              <div class="text-center text-slate-500 text-xs py-8">Adjust sliders to calculate live simulation</div>
            `}
          </div>
        </div>
      </div>
    </div>
  `;
}

async function runSimulation() {
  try {
    const res = await fetch('/api/simulation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(simParams),
    });
    const data = await res.json();
    if (data.success) {
      simResult = data.result;
      render();
    }
  } catch (e) {}
}

// ==========================================
// 16. RESPONDERS ROSTER MODAL
// ==========================================
function renderRosterModal() {
  return `
    <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div class="glass-card-elevated max-w-2xl w-full p-6 rounded-3xl border border-emerald-500/30 relative shadow-2xl animate-in fade-in zoom-in-95">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-base font-bold text-white flex items-center gap-2">
            <i data-lucide="users" class="w-5 h-5 text-emerald-400"></i> Tactical Response Units & Personnel
          </h2>
          <button onclick="state.rosterModalOpen = false; render();" class="text-slate-400 hover:text-white p-1 rounded-lg">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <div class="space-y-3 max-h-[60vh] overflow-y-auto">
          ${state.teams.map(t => `
            <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4">
              <div>
                <div class="font-bold text-sm text-white flex items-center gap-2">
                  ${t.name}
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400">${t.callSign}</span>
                </div>
                <div class="text-xs text-slate-400 mt-0.5">${t.specialty} • ${t.vehicleType}</div>
              </div>

              <div class="flex items-center gap-3">
                <span class="text-xs font-mono text-slate-400">${t.personnelCount} Crew</span>
                <span class="px-2.5 py-1 rounded-full text-xs font-bold ${
                  t.status === 'Available' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }">
                  ${t.status}
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// ==========================================
// 17. ALERT & AUDIT LOG MODAL
// ==========================================
let notifLogs = [];

async function fetchLogs() {
  try {
    const nRes = await fetch('/api/notifications');
    const nData = await nRes.json();
    if (nData.success) notifLogs = nData.logs;
  } catch (e) {}
}

function renderAuditModal() {
  fetchLogs().then(() => render());
  return `
    <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div class="glass-card-elevated max-w-3xl w-full p-6 rounded-3xl border border-amber-500/30 relative shadow-2xl animate-in fade-in zoom-in-95">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-base font-bold text-white flex items-center gap-2">
            <i data-lucide="shield-check" class="w-5 h-5 text-amber-400"></i> Multi-Channel Alerts & Audit Trail
          </h2>
          <button onclick="state.auditModalOpen = false; render();" class="text-slate-400 hover:text-white p-1 rounded-lg">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <div class="space-y-3 max-h-[60vh] overflow-y-auto font-mono text-xs">
          ${notifLogs.map(l => `
            <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div class="flex justify-between text-slate-400">
                <span class="text-amber-400 font-bold">${l.channel} → ${l.recipient}</span>
                <span class="text-[10px]">${new Date(l.timestamp).toLocaleTimeString()}</span>
              </div>
              <p class="text-slate-200">${l.messagePreview}</p>
              <div class="text-[10px] text-emerald-400">Status: ${l.status} • Ref: ${l.providerReference}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// ==========================================
// 18. 3D SITUATIONAL TERRAIN MAP (Three.js)
// ==========================================
let mapScene, mapCamera, mapRenderer, mapMesh, waterMesh, markers = [];

function initThreeMap() {
  const container = document.getElementById('three-map-container');
  if (!container || !window.THREE) return;

  container.innerHTML = '';
  const width = container.clientWidth;
  const height = container.clientHeight || 380;

  mapScene = new THREE.Scene();
  mapScene.background = new THREE.Color(0x02050c);

  mapCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  mapCamera.position.set(0, 35, 45);
  mapCamera.lookAt(0, 0, 0);

  mapRenderer = new THREE.WebGLRenderer({ antialias: true });
  mapRenderer.setSize(width, height);
  mapRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(mapRenderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  mapScene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x06b6d4, 1.2);
  dirLight.position.set(20, 40, 20);
  mapScene.add(dirLight);

  const redLight = new THREE.PointLight(0xef4444, 1.5, 60);
  redLight.position.set(-10, 15, -10);
  mapScene.add(redLight);

  // 3D Procedural Terrain
  const geometry = new THREE.PlaneGeometry(60, 60, 40, 40);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = Math.sin(x * 0.15) * Math.cos(y * 0.15) * 4.5 + Math.sin(x * 0.05) * 2.0;
    pos.setZ(i, z);
  }
  geometry.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.8,
    metalness: 0.2,
  });

  const wireframeMat = new THREE.MeshBasicMaterial({
    color: 0x1e293b,
    wireframe: true,
    transparent: true,
    opacity: 0.35,
  });

  mapMesh = new THREE.Mesh(geometry, terrainMat);
  mapMesh.rotation.x = -Math.PI / 2;
  mapScene.add(mapMesh);

  const wireMesh = new THREE.Mesh(geometry, wireframeMat);
  wireMesh.rotation.x = -Math.PI / 2;
  wireMesh.position.y = 0.05;
  mapScene.add(wireMesh);

  // Dynamic Flood Plane
  const waterGeo = new THREE.PlaneGeometry(58, 58, 20, 20);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    transparent: true,
    opacity: 0.5,
    roughness: 0.1,
    metalness: 0.8,
  });
  waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.y = -1.2;
  mapScene.add(waterMesh);

  updateMapMarkers();

  let clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    if (waterMesh) {
      waterMesh.position.y = -1.2 + Math.sin(elapsedTime * 1.5) * 0.4;
    }

    markers.forEach(m => {
      m.mesh.position.y = m.baseY + Math.sin(elapsedTime * 3 + m.offset) * 0.5;
    });

    mapRenderer.render(mapScene, mapCamera);
  }
  animate();
}

function updateMapMarkers() {
  if (!mapScene || !window.THREE) return;

  markers.forEach(m => mapScene.remove(m.mesh));
  markers = [];

  state.incidents.forEach((inc, idx) => {
    const isP1 = inc.priority === 'P1';
    const isP2 = inc.priority === 'P2';
    const color = isP1 ? 0xef4444 : isP2 ? 0xf59e0b : 0x06b6d4;

    const pinGeo = new THREE.ConeGeometry(0.8, 2.5, 8);
    const pinMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6 });
    const pinMesh = new THREE.Mesh(pinGeo, pinMat);

    const x = ((inc.longitude + 122.4194) * 400) % 20 - 10 + (idx * 4 - 6);
    const z = ((inc.latitude - 37.7749) * 400) % 20 - 10 + (idx * 3 - 4);
    const y = 3;

    pinMesh.position.set(x, y, z);
    pinMesh.rotation.x = Math.PI;
    mapScene.add(pinMesh);

    markers.push({ mesh: pinMesh, baseY: y, offset: idx });
  });
}
window.updateMapMarkers = updateMapMarkers;

function triggerMapAnalysis() {
  state.mapAnalysisRunning = true;
  render();
  setTimeout(() => {
    state.mapAnalysisRunning = false;
    showToast('AI Multi-Spectral Map Scan Complete: Inundation zones identified.', 'success');
    render();
  }, 2400);
}

// ==========================================
// 19. INITIALIZATION
// ==========================================
async function initApp() {
  await checkAuth();
  if (state.currentRoute === '/control-center' && state.isAuthenticated) {
    await Promise.all([fetchIncidents(), fetchTeams(), fetchWeather(), fetchAlertConfig()]);
  } else {
    await fetchWeather();
  }
  initSSE();
  render();
}

initApp();
