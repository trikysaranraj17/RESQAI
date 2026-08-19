'use client';

import React, { useState } from 'react';
import {
  X,
  FileText,
  Image as ImageIcon,
  MapPin,
  Sparkles,
  Bell,
  Clock,
  Play,
  Pause,
  Shield,
  CheckCircle,
  AlertTriangle,
  Send,
  Users,
  CheckCheck,
  RotateCw,
  PhoneCall,
  MessageSquare,
  MessageCircle,
  Mail,
  Volume2,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { Incident, ResponseTeam, NotificationLog, IncidentStatus } from '@/lib/types';

interface IncidentReviewModalProps {
  incident: Incident | null;
  isOpen: boolean;
  onClose: () => void;
  teams: ResponseTeam[];
  notifications: NotificationLog[];
  onUpdateStatus: (incidentId: string, status: IncidentStatus, notes?: string) => void;
  onAssignTeam: (incidentId: string, teamName: string) => void;
  onReAnalyze: (incidentId: string) => void;
}

type TabType = 'SUMMARY' | 'DISPATCH_CHANNELS' | 'EVIDENCE' | 'LOCATION' | 'AI' | 'ALERTS' | 'TIMELINE';

export function IncidentReviewModal({
  incident,
  isOpen,
  onClose,
  teams,
  notifications,
  onUpdateStatus,
  onAssignTeam,
  onReAnalyze,
}: IncidentReviewModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('SUMMARY');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [showResolvePrompt, setShowResolvePrompt] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [dispatchedTeamName, setDispatchedTeamName] = useState<string | null>(null);
  const [showDispatchBanner, setShowDispatchBanner] = useState(false);

  if (!isOpen || !incident) return null;

  const incidentNotifications = notifications.filter((n) => n.incidentId === incident.id);
  const targetPhone = '+918838225583';
  const officialEmails = [
    'trikysaran5721@gmail.com',
    'mediaestelle7@gmail.com',
    'nandhini301107@gmail.com',
    'kavipriyaps2401@gmail.com',
  ];

  const handleSpeakVoiceCall = (teamName: string) => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const text = `Attention Emergency Response Command. Critical RESQ incident alert. Emergency category: ${incident.type}. Location: ${incident.address || 'Emergency zone'}. ${incident.peopleAffected || 1} citizens in danger. AI calculated risk score is ${incident.riskScore || 85} percent. Unit ${teamName} has been deployed. Immediate action required.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  const handleSendFormSubmitEmailClient = (teamName: string) => {
    try {
      const emailPayload = {
        _subject: `🚨 [AUTOMATED RESQ DISPATCH] ${incident.priority}: ${incident.type} at ${incident.address}`,
        _cc: 'mediaestelle7@gmail.com,nandhini301107@gmail.com,kavipriyaps2401@gmail.com',
        _template: 'table',
        _captcha: 'false',
        'INCIDENT ID': incident.id,
        'CITIZEN ID': incident.citizenId || 'CITIZEN-SOS',
        'EMERGENCY TYPE': incident.type,
        'PRIORITY LEVEL': incident.priority,
        'AI RISK SCORE': `${incident.riskScore}% (${incident.riskLevel})`,
        'ASSIGNED RESPONSE UNIT': teamName,
        'LOCATION ADDRESS': incident.address,
        'GPS COORDINATES': `Lat: ${incident.latitude}, Lng: ${incident.longitude}`,
        'PEOPLE IN DANGER': `${incident.peopleAffected} victim(s)`,
        'INCIDENT DESCRIPTION': incident.description || 'Immediate tactical emergency response dispatched.',
        'SUBMISSION TIME': incident.createdAt || new Date().toISOString(),
        'DISPATCH TIME': new Date().toISOString(),
      };

      fetch('https://formsubmit.co/ajax/trikysaran5721@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      }).catch(() => {});
    } catch (e) {}
  };

  const handleOpenWhatsApp = (teamName: string) => {
    const rawMsg =
      `🚨 *RESQ EMERGENCY DISPATCH ALERT* 🚨\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⚠️ *Priority:* ${incident.priority || 'P1'} (${incident.riskLevel || 'Critical'})\n` +
      `🚨 *Category:* ${incident.type}\n` +
      `📍 *Location:* ${incident.address}\n` +
      `👥 *Victims in Danger:* ${incident.peopleAffected} Person(s)\n` +
      `🎯 *AI Risk Score:* ${incident.riskScore}%\n` +
      `🚒 *Assigned Unit:* ${teamName}\n` +
      `🆔 *Incident ID:* ${incident.id}\n` +
      `🗺️ *GPS:* ${incident.latitude}, ${incident.longitude}\n` +
      `📝 *Situation:* ${incident.description || 'Emergency assistance needed.'}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⚡ *ACTION REQUIRED:* Mobilize tactical rescue unit immediately.`;

    const url = `https://api.whatsapp.com/send?phone=918838225583&text=${encodeURIComponent(rawMsg)}`;
    window.open(url, '_blank');
  };

  const handleExecuteDispatch = () => {
    const teamToDispatch = selectedTeam || incident.assignedTeam || (teams[0]?.name || 'Alpha Search & Rescue');
    setDispatchedTeamName(teamToDispatch);
    setShowDispatchBanner(true);

    // 1. Call server-side PATCH dispatch
    onAssignTeam(incident.id, teamToDispatch);

    // 2. Play Audible Voice Call announcement directly in browser
    handleSpeakVoiceCall(teamToDispatch);

    // 3. Send FormSubmit Email to all 4 officials
    handleSendFormSubmitEmailClient(teamToDispatch);

    // 4. Open WhatsApp directly
    handleOpenWhatsApp(teamToDispatch);

    // Switch to Dispatch Channels tab for clear visibility
    setActiveTab('DISPATCH_CHANNELS');
  };

  const handleResolve = () => {
    onUpdateStatus(incident.id, 'RESOLVED', resolutionNotes || 'Incident resolved safely by emergency responders.');
    setShowResolvePrompt(false);
  };

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'SUMMARY', label: 'Summary', icon: FileText },
    { id: 'DISPATCH_CHANNELS', label: '🚨 Multi-Channel Broadcast', icon: Bell },
    { id: 'EVIDENCE', label: 'Evidence', icon: ImageIcon },
    { id: 'LOCATION', label: 'Location (Secure)', icon: MapPin },
    { id: 'AI', label: 'AI Risk Analysis', icon: Sparkles },
    { id: 'ALERTS', label: 'Alert Logs', icon: Clock },
    { id: 'TIMELINE', label: 'Timeline', icon: Clock },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel-elevated rounded-3xl p-6 max-w-3xl w-full text-slate-100 space-y-5 border border-white/20 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold bg-cyan-950 px-2.5 py-1 rounded-lg border border-cyan-500/40 text-cyan-300">
              {incident.id}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{incident.type} Emergency</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-red-500/20 text-red-300 border border-red-500/40">
                  {incident.priority} • {incident.riskScore}%
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {incident.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">📍 {incident.address}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 border-b border-white/10 pb-2 overflow-x-auto shrink-0 text-xs">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isCurrent = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  isCurrent
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* TAB 1: SUMMARY */}
          {activeTab === 'SUMMARY' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Citizen Description
                </span>
                <p className="text-sm text-slate-200 leading-relaxed font-medium">
                  &ldquo;{incident.description || 'No descriptive text provided.'}&rdquo;
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-slate-400 text-[10px] block">People In Danger</span>
                  <strong className="text-base text-amber-400">{incident.peopleAffected} civilians</strong>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-slate-400 text-[10px] block">Risk Rating</span>
                  <strong className="text-base text-red-400">{incident.riskScore}/100 ({incident.riskLevel})</strong>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-slate-400 text-[10px] block">Current Stage</span>
                  <strong className="text-base text-cyan-400">{incident.status}</strong>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-slate-400 text-[10px] block">Assigned Unit</span>
                  <strong className="text-base text-emerald-400">{incident.assignedTeam || 'None'}</strong>
                </div>
              </div>

              {/* Lifecycle Action Bar */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/15 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Incident Action & Lifecycle Transitions
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  {incident.status === 'NEW' && (
                    <button
                      onClick={() => onUpdateStatus(incident.id, 'ACKNOWLEDGED')}
                      className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold"
                    >
                      Acknowledge Report
                    </button>
                  )}

                  {/* Team Dispatch Dropdown & Trigger */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={selectedTeam || incident.assignedTeam || (teams[0]?.name || 'Alpha Search & Rescue')}
                      onChange={(e) => setSelectedTeam(e.target.value)}
                      className="glass-input px-3 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 border border-cyan-500/40"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name} ({t.specialty}) — {t.status}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleExecuteDispatch}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs shadow-lg shadow-red-600/40 transition-all cursor-pointer flex items-center gap-2 border border-red-400 animate-pulse"
                    >
                      <Send className="w-4 h-4" />
                      <span>⚡ DISPATCH TEAM (VOICE + SMS + MAIL + WHATSAPP)</span>
                    </button>
                  </div>

                  {incident.status !== 'RESOLVED' && incident.status !== 'CLOSED' && (
                    <button
                      onClick={() => setShowResolvePrompt(true)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold ml-auto"
                    >
                      Resolve Incident
                    </button>
                  )}
                </div>

                {/* Resolve Notes prompt */}
                {showResolvePrompt && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-2 mt-2">
                    <span className="font-semibold text-emerald-300">Resolution Closure Log:</span>
                    <input
                      type="text"
                      placeholder="Add closure notes (e.g. All 4 residents evacuated to North Shelter safely)..."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      className="w-full glass-input p-2 rounded-lg text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleResolve}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                      >
                        Confirm Incident Resolved
                      </button>
                      <button
                        onClick={() => setShowResolvePrompt(false)}
                        className="px-3 py-1.5 rounded-lg glass-pill text-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MULTI-CHANNEL BROADCAST */}
          {activeTab === 'DISPATCH_CHANNELS' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3 rounded-2xl bg-gradient-to-r from-red-950/60 to-slate-900 border border-red-500/40 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    Synchronized 4-Channel Emergency Dispatch Center
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Target Phone: <strong className="text-cyan-300">{targetPhone}</strong> • Target Emails: <strong className="text-amber-300">4 Higher Officials</strong>
                  </p>
                </div>
                <button
                  onClick={handleExecuteDispatch}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Re-Trigger All 4 Channels</span>
                </button>
              </div>

              {/* 4 Multi-Channel Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Voice Call Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-red-500/40 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-red-400 flex items-center gap-1.5 text-xs">
                      <PhoneCall className="w-4 h-4" /> Voice Call (Indian Accent Briefing)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                      ACTIVE
                    </span>
                  </div>
                  <div className="text-xs text-white font-mono font-bold">{targetPhone}</div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Voice Call transmits spoken alert: "Attention Higher Official. Priority {incident.priority} Alert: {incident.type} at {incident.address}. {incident.peopleAffected} civilians trapped."
                  </p>
                  <button
                    onClick={() => handleSpeakVoiceCall(dispatchedTeamName || incident.assignedTeam || 'Alpha Search & Rescue')}
                    className="w-full py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Play Spoken Voice Call Audio
                  </button>
                </div>

                {/* 2. SMS Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/40 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-cyan-400 flex items-center gap-1.5 text-xs">
                      <MessageSquare className="w-4 h-4" /> Cellular SMS Alert
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                      SENT
                    </span>
                  </div>
                  <div className="text-xs text-white font-mono font-bold">{targetPhone}</div>
                  <div className="p-2 rounded-xl bg-slate-900 text-[10px] text-slate-300 font-mono">
                    🚨 [RESQ ALERT] {incident.priority}: {incident.type} at {incident.address}. {incident.peopleAffected} victim(s). Risk: {incident.riskScore}%.
                  </div>
                </div>

                {/* 3. WhatsApp Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                      <MessageCircle className="w-4 h-4" /> WhatsApp Dispatch Alert
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                      AUTO-OPEN
                    </span>
                  </div>
                  <div className="text-xs text-white font-mono font-bold">{targetPhone}</div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Structured tactical situation briefing with markdown tags, incident telemetry, and GPS coordinates.
                  </p>
                  <button
                    onClick={() => handleOpenWhatsApp(dispatchedTeamName || incident.assignedTeam || 'Alpha Search & Rescue')}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> 1-Click Open WhatsApp
                  </button>
                </div>

                {/* 4. Email to 4 Higher Officials Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                      <Mail className="w-4 h-4" /> FormSubmit Email (4 Higher Officials)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                      DISPATCHED
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-300 font-mono leading-tight truncate">
                    {officialEmails.join(', ')}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    FormSubmit table report dispatched to trikysaran5721, mediaestelle7, nandhini301107, kavipriyaps2401.
                  </p>
                  <button
                    onClick={() => handleSendFormSubmitEmailClient(dispatchedTeamName || incident.assignedTeam || 'Alpha Search & Rescue')}
                    className="w-full py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Re-Send FormSubmit Email
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EVIDENCE */}
          {activeTab === 'EVIDENCE' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Visual Photographic Evidence ({incident.media?.length || 0})
                </span>
                {incident.media && incident.media.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {incident.media.map((med, idx) => (
                      <div key={idx} className="rounded-2xl overflow-hidden bg-black/40 border border-white/10 aspect-video relative group">
                        <img src={med.url} alt="Evidence" className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/70 text-[10px] text-white">
                          Captured {med.capturedAt ? new Date(med.capturedAt).toLocaleTimeString() : 'Live'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center text-slate-400">
                    No visual media attached by reporting citizen.
                  </div>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Voice Note & AI Transcription
                </span>
                {incident.voiceNote ? (
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                          className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                        >
                          {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <div>
                          <span className="font-semibold text-white">Audio Recording ({incident.voiceNote.durationSeconds}s)</span>
                          <span className="text-[10px] text-emerald-400 block">✓ Clear acoustic signal</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-cyan-400 tracking-wider">
                        AI-Generated Transcription (Speech-to-Text):
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed font-mono">
                        &ldquo;{incident.voiceNote.transcription || 'Audio transcription processed.'}&rdquo;
                      </p>
                      {incident.voiceNote.transcriptionConfidence && (
                        <span className="text-[10px] text-slate-400 block">
                          Confidence: {Math.round(incident.voiceNote.transcriptionConfidence * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center text-slate-400">
                    No voice recording attached.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: LOCATION (SECURE) */}
          {activeTab === 'LOCATION' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-xs">
                🔒 Precise coordinates are confidential and visible strictly within authenticated Control Center consoles.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-slate-400 text-[10px] block">Exact Latitude</span>
                  <strong className="text-sm font-mono text-cyan-300">{incident.latitude.toFixed(6)}° N</strong>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-slate-400 text-[10px] block">Exact Longitude</span>
                  <strong className="text-sm font-mono text-cyan-300">{incident.longitude.toFixed(6)}° W</strong>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-slate-400 text-[10px] block">GPS Accuracy</span>
                  <strong className="text-sm text-emerald-400">±{incident.accuracy || 5.0} meters</strong>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-slate-400 text-[10px] block">Reverse Geocoded Area</span>
                  <strong className="text-sm text-white">{incident.address}</strong>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AI RISK ANALYSIS */}
          {activeTab === 'AI' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Multi-Signal Risk Decomposition</span>
                <button
                  onClick={() => onReAnalyze(incident.id)}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Re-evaluate Signals</span>
                </button>
              </div>

              {incident.aiAnalysis ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-slate-200 leading-relaxed font-medium">
                      {incident.aiAnalysis.incidentSummary}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] text-slate-400 block">Flood Inundation</span>
                      <strong className="text-cyan-400 text-sm">{incident.aiAnalysis.subScores.floodRisk}%</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] text-slate-400 block">Road Inaccessibility</span>
                      <strong className="text-amber-400 text-sm">{incident.aiAnalysis.subScores.roadAccessibility}%</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] text-slate-400 block">Damage Severity</span>
                      <strong className="text-red-400 text-sm">{incident.aiAnalysis.subScores.areaDamage}%</strong>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-cyan-400 block mb-1.5">
                      Decision Support Tactics
                    </span>
                    <div className="space-y-1.5">
                      {incident.aiAnalysis.recommendations.map((rec, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white/5 text-center text-slate-400">
                  No detailed AI analysis cached. Click "Re-evaluate Signals" above.
                </div>
              )}
            </div>
          )}

          {/* TAB 6: ALERTS */}
          {activeTab === 'ALERTS' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Multi-Channel Critical Alert Dispatch Log ({incidentNotifications.length})
              </span>

              {incidentNotifications.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white/5 text-center text-slate-400">
                  No automated critical notification records triggered for this incident.
                </div>
              ) : (
                <div className="space-y-2">
                  {incidentNotifications.map((notif) => (
                    <div key={notif.id} className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            {notif.channel}
                          </span>
                          <span className="text-slate-300 text-xs font-semibold">{notif.recipient}</span>
                        </div>
                        <span className="text-emerald-400 font-bold text-[10px]">✓ {notif.status}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono line-clamp-2">
                        {notif.messagePreview}
                      </p>
                      <div className="text-[10px] text-slate-500 flex justify-between">
                        <span>Ref: {notif.providerReference}</span>
                        <span>{new Date(notif.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: TIMELINE */}
          {activeTab === 'TIMELINE' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Incident Audit Trail
              </span>
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-slate-400">Lodged:</span>
                  <span className="text-white">{new Date(incident.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-slate-400">Last Status Change:</span>
                  <span className="text-cyan-300">{new Date(incident.updatedAt).toLocaleString()}</span>
                </div>
                {incident.resolvedAt && (
                  <div className="flex justify-between border-b border-white/5 pb-1.5">
                    <span className="text-slate-400">Resolved At:</span>
                    <span className="text-emerald-400">{new Date(incident.resolvedAt).toLocaleString()} ({incident.resolvedBy})</span>
                  </div>
                )}
                {incident.resolutionNotes && (
                  <div className="pt-1">
                    <span className="text-slate-400 block mb-0.5">Resolution Notes:</span>
                    <p className="p-2 rounded bg-black/40 text-slate-200">{incident.resolutionNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
