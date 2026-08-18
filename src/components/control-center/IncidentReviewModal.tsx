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

type TabType = 'SUMMARY' | 'EVIDENCE' | 'LOCATION' | 'AI' | 'ALERTS' | 'TIMELINE';

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

  if (!isOpen || !incident) return null;

  const incidentNotifications = notifications.filter((n) => n.incidentId === incident.id);

  const handleResolve = () => {
    onUpdateStatus(incident.id, 'RESOLVED', resolutionNotes || 'Incident resolved safely by emergency responders.');
    setShowResolvePrompt(false);
  };

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'SUMMARY', label: 'Summary', icon: FileText },
    { id: 'EVIDENCE', label: 'Evidence', icon: ImageIcon },
    { id: 'LOCATION', label: 'Location (Secure)', icon: MapPin },
    { id: 'AI', label: 'AI Risk Analysis', icon: Sparkles },
    { id: 'ALERTS', label: 'Alert Logs', icon: Bell },
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

                  {/* Team Dispatch Dropdown */}
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedTeam}
                      onChange={(e) => setSelectedTeam(e.target.value)}
                      className="glass-input px-3 py-2 rounded-xl text-xs"
                    >
                      <option value="">Select Response Team…</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name} ({t.specialty}) — {t.status}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        if (selectedTeam) {
                          onAssignTeam(incident.id, selectedTeam);
                          onUpdateStatus(incident.id, 'ASSIGNED');
                        }
                      }}
                      disabled={!selectedTeam}
                      className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold disabled:opacity-40"
                    >
                      Dispatch Team
                    </button>
                  </div>

                  {incident.status === 'ASSIGNED' && (
                    <button
                      onClick={() => onUpdateStatus(incident.id, 'IN PROGRESS')}
                      className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold"
                    >
                      Mark On-Scene / In Progress
                    </button>
                  )}

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

          {/* TAB 2: EVIDENCE */}
          {activeTab === 'EVIDENCE' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Photo / Video evidence */}
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

              {/* Voice Note & AI Transcription */}
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

          {/* TAB 3: LOCATION (SECURE) */}
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

          {/* TAB 4: AI RISK ANALYSIS */}
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

                  {/* Recommendations */}
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

          {/* TAB 5: ALERTS */}
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

          {/* TAB 6: TIMELINE */}
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
