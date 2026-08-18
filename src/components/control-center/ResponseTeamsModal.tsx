'use client';

import React from 'react';
import { X, Users, Shield, Radio, CheckCircle, Navigation } from 'lucide-react';
import { ResponseTeam, TeamStatus } from '@/lib/types';

interface ResponseTeamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: ResponseTeam[];
  onUpdateTeamStatus: (teamId: string, status: TeamStatus) => void;
}

export function ResponseTeamsModal({
  isOpen,
  onClose,
  teams,
  onUpdateTeamStatus,
}: ResponseTeamsModalProps) {
  if (!isOpen) return null;

  const getStatusBadge = (status: TeamStatus) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'On Response':
        return 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse';
      case 'Offline':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/40';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 max-w-2xl w-full text-slate-100 space-y-5 border border-white/20 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Emergency Response Units Roster</h3>
              <p className="text-xs text-slate-400">Tactical ground, marine, and aerial deployment status</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Teams List */}
        <div className="space-y-3">
          {teams.map((team) => (
            <div
              key={team.id}
              className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{team.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-cyan-300">
                    {team.callSign}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(team.status)}`}>
                    {team.status}
                  </span>
                </div>
                <div className="text-xs text-slate-300 flex items-center gap-3">
                  <span>Specialty: <strong className="text-slate-100">{team.specialty}</strong></span>
                  <span>•</span>
                  <span>Personnel: <strong className="text-slate-100">{team.personnelCount}</strong></span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Vehicle / Equipment: {team.vehicleType}
                </div>
                {team.assignedIncidentId && (
                  <div className="text-[11px] text-amber-300 font-medium">
                    ⚡ Deployed to active incident: <span className="font-mono font-bold">{team.assignedIncidentId}</span>
                  </div>
                )}
              </div>

              {/* Status Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => onUpdateTeamStatus(team.id, 'Available')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    team.status === 'Available'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  Ready
                </button>
                <button
                  onClick={() => onUpdateTeamStatus(team.id, 'On Response')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    team.status === 'On Response'
                      ? 'bg-red-500/20 border-red-500 text-red-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  On-Mission
                </button>
                <button
                  onClick={() => onUpdateTeamStatus(team.id, 'Offline')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    team.status === 'Offline'
                      ? 'bg-slate-500/20 border-slate-500 text-slate-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  Standby
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
