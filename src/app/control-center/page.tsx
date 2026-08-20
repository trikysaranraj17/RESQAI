'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Incident,
  ResponseTeam,
  NotificationLog,
  AuditLog,
  WeatherSnapshot,
  SystemServiceStatus,
  IncidentStatus,
} from '@/lib/types';
import { HeaderStrip } from '@/components/control-center/HeaderStrip';
import { KpiRow } from '@/components/control-center/KpiRow';
import { LiveIncidentsFeed } from '@/components/control-center/LiveIncidentsFeed';
import { Disaster3DMap } from '@/components/control-center/Disaster3DMap';
import { WeatherPanel } from '@/components/control-center/WeatherPanel';
import { PriorityQueue } from '@/components/control-center/PriorityQueue';
import { IncidentReviewModal } from '@/components/control-center/IncidentReviewModal';
import { WhatIfSimulator } from '@/components/control-center/WhatIfSimulator';
import { ResponseTeamsModal } from '@/components/control-center/ResponseTeamsModal';
import { AlertHistoryModal } from '@/components/control-center/AlertHistoryModal';
import { DemoScenariosModal } from '@/components/control-center/DemoScenariosModal';
import { UnaccountedSection } from '@/components/control-center/UnaccountedSection';
import { Bell, AlertTriangle, Sparkles, CheckCircle2, Radio } from 'lucide-react';

export default function ControlCenterDashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [teams, setTeams] = useState<ResponseTeam[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemServiceStatus | null>(null);

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [reviewIncident, setReviewIncident] = useState<Incident | null>(null);

  // Modals state
  const [isTeamsModalOpen, setIsTeamsModalOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [isDemoScenariosOpen, setIsDemoScenariosOpen] = useState(false);

  // New Alert Banner notification
  const [newEmergencyAlert, setNewEmergencyAlert] = useState<{
    incidentId: string;
    type: string;
    address: string;
    priority: string;
    riskScore: number;
  } | null>(null);

  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  const unlockAudioContext = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.01, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
      setIsAudioUnlocked(true);
      if ('speechSynthesis' in window) {
        const dummy = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(dummy);
      }
    } catch (e) {}
  };

  const playLoudSirenAndVoice = useCallback((inc: Incident) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(500, ctx.currentTime);
      osc2.frequency.setValueAtTime(800, ctx.currentTime);

      const modulator = ctx.createOscillator();
      const modulatorGain = ctx.createGain();
      modulator.frequency.value = 1.8;
      modulatorGain.gain.value = 250;

      modulator.connect(modulatorGain);
      modulatorGain.connect(osc1.frequency);
      modulatorGain.connect(osc2.frequency);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      gainNode.gain.setValueAtTime(0.85, ctx.currentTime);

      modulator.start();
      osc1.start();
      osc2.start();

      setTimeout(() => {
        try {
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          setTimeout(() => {
            osc1.stop();
            osc2.stop();
            modulator.stop();
            ctx.close();
          }, 600);
        } catch (e) {}
      }, 4500);

      if ('speechSynthesis' in window) {
        setTimeout(() => {
          window.speechSynthesis.cancel();
          const text = `Attention response team. Emergency dispatch activated for ${inc.type} at ${inc.address || 'Emergency zone'}. AI risk score is ${inc.riskScore || 85} percent. Mobilize unit immediately.`;
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.95;
          utterance.pitch = 1.0;
          window.speechSynthesis.speak(utterance);
        }, 800);
      }
    } catch (e) {
      console.warn('Realtime sound dispatch error:', e);
    }
  }, []);

  // Fetch initial data
  const loadDashboardData = useCallback(async () => {
    try {
      const [incRes, teamsRes, notifsRes, auditRes, weatherRes, statusRes] = await Promise.all([
        fetch('/api/incidents'),
        fetch('/api/teams'),
        fetch('/api/notifications'),
        fetch('/api/audit'),
        fetch('/api/weather'),
        fetch('/api/status'),
      ]);

      const [incData, teamsData, notifsData, auditData, weatherData, statusData] = await Promise.all([
        incRes.json(),
        teamsRes.json(),
        notifsRes.json(),
        auditRes.json(),
        weatherRes.json(),
        statusRes.json(),
      ]);

      if (incData.success) setIncidents(incData.incidents);
      if (teamsData.success) setTeams(teamsData.teams);
      if (notifsData.success) setNotifications(notifsData.logs);
      if (auditData.success) setAuditLogs(auditData.logs);
      if (weatherData.success) setWeather(weatherData.weather);
      if (statusData.success) setSystemStatus(statusData.status);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Subscribe to Realtime SSE events stream
  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource('/api/realtime');

      eventSource.addEventListener('incident_created', (evt: any) => {
        try {
          const payload = JSON.parse(evt.data);
          const newIncident: Incident = payload.incident;

          setIncidents((prev) => [newIncident, ...prev.filter((i) => i.id !== newIncident.id)]);

          // Trigger "🚨 New Citizen Emergency" Alert Banner
          setNewEmergencyAlert({
            incidentId: newIncident.id,
            type: newIncident.type,
            address: newIncident.address,
            priority: newIncident.priority,
            riskScore: newIncident.riskScore,
          });

          // Refresh logs & stats
          fetch('/api/notifications')
            .then((r) => r.json())
            .then((d) => d.success && setNotifications(d.logs));
          fetch('/api/audit')
            .then((r) => r.json())
            .then((d) => d.success && setAuditLogs(d.logs));

          setTimeout(() => setNewEmergencyAlert(null), 8000);
        } catch (e) {
          console.error('Error parsing incident_created event:', e);
        }
      });

      eventSource.addEventListener('incident_updated', (evt: any) => {
        try {
          const payload = JSON.parse(evt.data);
          if (payload.reset) {
            loadDashboardData();
            return;
          }
          const updated: Incident = payload.incident;
          setIncidents((prev) => {
            const existing = prev.find((i) => i.id === updated.id);
            if (existing && existing.status !== 'IN PROGRESS' && updated.status === 'IN PROGRESS') {
              playLoudSirenAndVoice(updated);
            }
            return prev.map((i) => (i.id === updated.id ? updated : i));
          });
          if (reviewIncident && reviewIncident.id === updated.id) {
            setReviewIncident(updated);
          }
        } catch (e) {
          console.error('Error parsing incident_updated event:', e);
        }
      });

      eventSource.addEventListener('team_dispatched', () => {
        fetch('/api/teams')
          .then((r) => r.json())
          .then((d) => d.success && setTeams(d.teams));
      });
    } catch (e) {
      console.warn('Realtime SSE unavailable or failed to connect:', e);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [loadDashboardData, reviewIncident, playLoudSirenAndVoice]);

  // Actions
  const handleUpdateStatus = async (incidentId: string, status: IncidentStatus, notes?: string) => {
    try {
      const res = await fetch(`/api/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolutionNotes: notes }),
      });
      const data = await res.json();
      if (data.success) {
        setIncidents((prev) => prev.map((i) => (i.id === incidentId ? data.incident : i)));
        if (reviewIncident && reviewIncident.id === incidentId) {
          setReviewIncident(data.incident);
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleAssignTeam = async (incidentId: string, teamName: string) => {
    try {
      const res = await fetch(`/api/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTeam: teamName, status: 'IN PROGRESS' }),
      });
      const data = await res.json();
      if (data.success) {
        setIncidents((prev) => prev.map((i) => (i.id === incidentId ? data.incident : i)));
        if (reviewIncident && reviewIncident.id === incidentId) {
          setReviewIncident(data.incident);
        }
        // Refresh teams and notification alert logs
        const [tRes, nRes] = await Promise.all([fetch('/api/teams'), fetch('/api/notifications')]);
        const [tData, nData] = await Promise.all([tRes.json(), nRes.json()]);
        if (tData.success) setTeams(tData.teams);
        if (nData.success) setNotifications(nData.logs);
      }
    } catch (err) {
      console.error('Error assigning team:', err);
    }
  };

  const handleUpdateTeamStatus = async (teamId: string, status: any) => {
    try {
      await fetch('/api/teams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, status }),
      });
      const tRes = await fetch('/api/teams');
      const tData = await tRes.json();
      if (tData.success) setTeams(tData.teams);
    } catch (err) {
      console.error('Error updating team status:', err);
    }
  };

  const handleReAnalyze = async (incidentId: string) => {
    try {
      const res = await fetch(`/api/incidents/${incidentId}/analyze`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setIncidents((prev) => prev.map((i) => (i.id === incidentId ? data.incident : i)));
        if (reviewIncident && reviewIncident.id === incidentId) {
          setReviewIncident(data.incident);
        }
      }
    } catch (err) {
      console.error('Error re-analyzing incident:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header Strip with health status and navigation */}
      <HeaderStrip
        status={systemStatus}
        onOpenTeams={() => setIsTeamsModalOpen(true)}
        onOpenAlerts={() => setIsAlertsModalOpen(true)}
        onOpenDemoScenarios={() => setIsDemoScenariosOpen(true)}
        onOpenSimulation={() => setIsSimulationOpen(true)}
      />

      {/* Main Operational Container */}
      <main className="flex-1 p-3 sm:p-4 space-y-3.5 max-w-[1920px] mx-auto w-full flex flex-col">
        {/* Browser Audio Context Unlock Banner */}
        {!isAudioUnlocked && (
          <button
            onClick={unlockAudioContext}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 border border-cyan-400 text-white flex items-center justify-center gap-2.5 font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-[0.99] transition-all"
          >
            <Radio className="w-4 h-4 animate-pulse text-cyan-300" />
            <span>🔊 Click to Activate Real-Time Mobile Dispatch Voice & Sirens</span>
          </button>
        )}

        {/* Flashy "🚨 New Citizen Emergency" Alert Banner */}
        {newEmergencyAlert && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-red-700 to-amber-600 border border-red-400 text-white flex items-center justify-between shadow-2xl shadow-red-600/40 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20 animate-bounce">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider bg-black/40 px-2 py-0.5 rounded">
                    🚨 INCOMING CITIZEN EMERGENCY
                  </span>
                  <span className="font-mono font-bold">{newEmergencyAlert.incidentId}</span>
                  <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded">
                    {newEmergencyAlert.type}
                  </span>
                </div>
                <p className="text-xs font-medium text-red-100 mt-0.5">
                  📍 {newEmergencyAlert.address} • AI Evaluated Risk: {newEmergencyAlert.riskScore}% ({newEmergencyAlert.priority})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const inc = incidents.find((i) => i.id === newEmergencyAlert.incidentId);
                  if (inc) setReviewIncident(inc);
                  setNewEmergencyAlert(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-white text-red-700 font-bold text-xs hover:bg-red-50 shadow-md transition-colors"
              >
                Inspect Now
              </button>
              <button
                onClick={() => setNewEmergencyAlert(null)}
                className="px-2 py-1.5 rounded-xl bg-black/20 text-white text-xs hover:bg-black/30"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* KPI Summary Row */}
        <KpiRow incidents={incidents} teams={teams} notifications={notifications} />

        {/* Primary 3-Column Tactical Operations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 items-stretch">
          {/* Left Column: Live Citizen Requests Feed (3.5 cols on desktop) */}
          <div className="lg:col-span-4 xl:col-span-3 min-h-[500px] flex flex-col">
            <LiveIncidentsFeed
              incidents={incidents}
              selectedIncidentId={selectedIncidentId}
              onSelectIncident={(id) => setSelectedIncidentId(id)}
              onReviewIncident={(inc) => setReviewIncident(inc)}
              onAcknowledge={(id) => handleUpdateStatus(id, 'ACKNOWLEDGED')}
              newAlertIncidentId={newEmergencyAlert?.incidentId || null}
            />
          </div>

          {/* Center Column: Interactive 3D Disaster Map (5 cols on desktop) */}
          <div className="lg:col-span-5 xl:col-span-6 min-h-[500px] flex flex-col">
            <Disaster3DMap
              incidents={incidents}
              selectedIncidentId={selectedIncidentId}
              onSelectIncident={(id) => setSelectedIncidentId(id)}
            />
          </div>

          {/* Right Column: Weather Radar, Priority Queue & Unaccounted (3.5 cols on desktop) */}
          <div className="lg:col-span-3 xl:col-span-3 space-y-3.5 flex flex-col">
            <WeatherPanel weather={weather} />
            <PriorityQueue
              incidents={incidents}
              onSelectIncident={(id) => setSelectedIncidentId(id)}
              onReviewIncident={(inc) => setReviewIncident(inc)}
            />
            <UnaccountedSection
              notifications={notifications}
              onRefresh={async () => {
                const res = await fetch('/api/notifications');
                const data = await res.json();
                if (data.success) setNotifications(data.logs);
              }}
            />
          </div>
        </div>
      </main>

      {/* Tabbed Incident Review Modal */}
      <IncidentReviewModal
        incident={reviewIncident}
        isOpen={Boolean(reviewIncident)}
        onClose={() => setReviewIncident(null)}
        teams={teams}
        notifications={notifications}
        onUpdateStatus={handleUpdateStatus}
        onAssignTeam={handleAssignTeam}
        onReAnalyze={handleReAnalyze}
      />

      {/* Response Teams Roster Modal */}
      <ResponseTeamsModal
        isOpen={isTeamsModalOpen}
        onClose={() => setIsTeamsModalOpen(false)}
        teams={teams}
        onUpdateTeamStatus={handleUpdateTeamStatus}
      />

      {/* Alert History & Audit Trail Modal */}
      <AlertHistoryModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        notifications={notifications}
        auditLogs={auditLogs}
      />

      {/* What-If Simulation Tool Modal */}
      <WhatIfSimulator
        isOpen={isSimulationOpen}
        onClose={() => setIsSimulationOpen(false)}
      />

      {/* Demo Scenarios Quick Trigger Modal */}
      <DemoScenariosModal
        isOpen={isDemoScenariosOpen}
        onClose={() => setIsDemoScenariosOpen(false)}
        onScenarioTriggered={loadDashboardData}
      />
    </div>
  );
}
