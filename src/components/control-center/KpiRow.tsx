'use client';

import React from 'react';
import { AlertCircle, Flame, ShieldAlert, Users, Clock, BellRing } from 'lucide-react';
import { Incident, ResponseTeam, NotificationLog } from '@/lib/types';

interface KpiRowProps {
  incidents: Incident[];
  teams: ResponseTeam[];
  notifications: NotificationLog[];
}

export function KpiRow({ incidents, teams, notifications }: KpiRowProps) {
  const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED');
  const criticalIncidents = activeIncidents.filter((i) => i.riskLevel === 'Critical');
  const highPriorityIncidents = activeIncidents.filter((i) => i.priority === 'P1' || i.riskLevel === 'High');
  const availableTeams = teams.filter((t) => t.status === 'Available');
  const unreviewedCount = activeIncidents.filter((i) => i.status === 'NEW' || i.status === 'AI ANALYZING');
  const alertsTodayCount = notifications.length;

  const kpis = [
    {
      label: 'Active Emergencies',
      value: activeIncidents.length,
      icon: AlertCircle,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
    },
    {
      label: 'Critical P1 Incidents',
      value: criticalIncidents.length,
      icon: Flame,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      pulse: criticalIncidents.length > 0,
    },
    {
      label: 'High Priority',
      value: highPriorityIncidents.length,
      icon: ShieldAlert,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    {
      label: 'Responders Ready',
      value: `${availableTeams.length}/${teams.length}`,
      icon: Users,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      label: 'Unreviewed Reports',
      value: unreviewedCount.length,
      icon: Clock,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
    {
      label: 'Alerts Dispatched Today',
      value: alertsTodayCount,
      icon: BellRing,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <div
            key={idx}
            className={`p-3.5 rounded-2xl glass-panel border ${kpi.border} flex items-center justify-between transition-all hover:translate-y-[-2px]`}
          >
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">{kpi.label}</span>
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5 block">
                {kpi.value}
              </span>
            </div>
            <div className={`p-2 rounded-xl ${kpi.bg} ${kpi.color} ${kpi.pulse ? 'animate-pulse ring-2 ring-red-500/40' : ''}`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
