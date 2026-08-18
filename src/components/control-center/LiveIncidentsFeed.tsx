'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  Flame,
  Waves,
  Car,
  Home,
  UserX,
  HeartPulse,
  CloudLightning,
  HelpCircle,
  Users,
  Eye,
  CheckCircle,
  Sparkles,
  Shield,
  Filter,
} from 'lucide-react';
import { Incident, EmergencyType, IncidentStatus } from '@/lib/types';

interface LiveIncidentsFeedProps {
  incidents: Incident[];
  selectedIncidentId: string | null;
  onSelectIncident: (id: string) => void;
  onReviewIncident: (incident: Incident) => void;
  onAcknowledge: (id: string) => void;
  newAlertIncidentId: string | null;
}

export function LiveIncidentsFeed({
  incidents,
  selectedIncidentId,
  onSelectIncident,
  onReviewIncident,
  onAcknowledge,
  newAlertIncidentId,
}: LiveIncidentsFeedProps) {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filtered = incidents.filter((inc) => {
    if (filterType !== 'ALL' && inc.type !== filterType) return false;
    if (filterStatus === 'ACTIVE' && (inc.status === 'RESOLVED' || inc.status === 'CLOSED')) return false;
    if (filterStatus === 'CRITICAL' && inc.riskLevel !== 'Critical') return false;
    if (filterStatus === 'RESOLVED' && inc.status !== 'RESOLVED') return false;
    return true;
  });

  const getEmergencyIcon = (type: EmergencyType) => {
    switch (type) {
      case 'Flood': return Waves;
      case 'Fire': return Flame;
      case 'Road Emergency': return Car;
      case 'Building Damage': return Home;
      case 'Person Trapped': return UserX;
      case 'Medical Emergency': return HeartPulse;
      case 'Storm': return CloudLightning;
      default: return HelpCircle;
    }
  };

  const getPriorityBadge = (p: string, level: string) => {
    if (level === 'Critical' || p === 'P1') {
      return 'bg-red-500/20 text-red-300 border-red-500/40 ring-1 ring-red-500/30';
    }
    if (level === 'High' || p === 'P2') {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }
    return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case 'NEW':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40 animate-pulse';
      case 'AI ANALYZING':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'CRITICAL':
        return 'bg-red-500/25 text-red-200 border-red-500/50 font-bold';
      case 'ACKNOWLEDGED':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'ASSIGNED':
      case 'IN PROGRESS':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'RESOLVED':
      case 'CLOSED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-white/10 text-slate-300 border-white/10';
    }
  };

  const timeAgo = (dateStr: string) => {
    const ms = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 1) return 'Just now';
    if (min === 1) return '1m ago';
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    return `${hrs}h ago`;
  };

  return (
    <div className="flex flex-col h-full glass-panel rounded-2xl overflow-hidden border border-white/10">
      {/* Feed Header & Filters */}
      <div className="p-3.5 border-b border-white/10 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <h2 className="text-sm font-bold text-white tracking-wide">Live Citizen Requests</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
              {filtered.length}
            </span>
          </div>
          <span className="text-[11px] text-cyan-400 flex items-center gap-1 font-mono">
            <Sparkles className="w-3 h-3" /> Realtime Stream
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pb-1">
          {['ALL', 'ACTIVE', 'CRITICAL', 'RESOLVED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap ${
                filterStatus === f
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Incidents List Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No incidents found matching active filters.
          </div>
        ) : (
          filtered.map((inc) => {
            const Icon = getEmergencyIcon(inc.type);
            const isSelected = selectedIncidentId === inc.id;
            const isJustArrived = newAlertIncidentId === inc.id;

            return (
              <div
                key={inc.id}
                onClick={() => onSelectIncident(inc.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                  isJustArrived ? 'animate-bounce border-red-500 bg-red-950/40 ring-2 ring-red-500' : ''
                } ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-950/50'
                    : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/20'
                }`}
              >
                {/* Critical Glow Edge */}
                {inc.riskLevel === 'Critical' && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                )}

                {/* Top Row: Type, ID, Badges, Time */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white/5 text-cyan-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-mono text-xs font-bold text-white">{inc.id}</span>
                      <span className="text-xs font-semibold text-slate-300 ml-1.5">{inc.type}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase border ${getPriorityBadge(
                        inc.priority,
                        inc.riskLevel
                      )}`}
                    >
                      {inc.priority} • {inc.riskScore}%
                    </span>
                  </div>
                </div>

                {/* Address and Description */}
                <p className="text-xs text-slate-300 font-medium line-clamp-1 mb-1">
                  📍 {inc.address}
                </p>
                {inc.description && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                    &ldquo;{inc.description}&rdquo;
                  </p>
                )}

                {/* Details Row: People, Status, Time, Team */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Users className="w-3 h-3 text-amber-400" />
                      <strong>{inc.peopleAffected}</strong> affected
                    </span>
                    <span>•</span>
                    <span className="text-slate-400">{timeAgo(inc.createdAt)}</span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold border ${getStatusBadge(inc.status)}`}>
                    {inc.status}
                  </span>
                </div>

                {/* Assigned Team indicator */}
                {inc.assignedTeam && (
                  <div className="mt-2 text-[11px] text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    <span>Assigned: <strong>{inc.assignedTeam}</strong></span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-2.5 flex items-center gap-1.5 pt-1.5 border-t border-white/5 opacity-90 group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onReviewIncident(inc);
                    }}
                    className="flex-1 py-1 px-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Review & Evidence</span>
                  </button>

                  {inc.status === 'NEW' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAcknowledge(inc.id);
                      }}
                      className="py-1 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-semibold flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" />
                      <span>Ack</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
