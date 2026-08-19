'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Activity,
  Radio,
  CloudRain,
  Bell,
  Database,
  Cpu,
  LogOut,
  Sparkles,
  Layers,
  Users,
  PlayCircle,
} from 'lucide-react';
import { SystemServiceStatus } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface HeaderStripProps {
  status: SystemServiceStatus | null;
  onOpenTeams: () => void;
  onOpenAlerts: () => void;
  onOpenDemoScenarios: () => void;
  onOpenSimulation: () => void;
}

export function HeaderStrip({
  status,
  onOpenTeams,
  onOpenAlerts,
  onOpenDemoScenarios,
  onOpenSimulation,
}: HeaderStripProps) {
  const router = useRouter();
  const [timeString, setTimeString] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    router.push('/');
  };

  const getBadgeColor = (val?: 'ONLINE' | 'DEGRADED' | 'OFFLINE') => {
    if (val === 'ONLINE') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (val === 'DEGRADED') return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-red-400 bg-red-500/10 border-red-500/30';
  };

  return (
    <header className="w-full glass-panel-elevated border-b border-white/10 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-slate-200">
      {/* Left: Brand & Operator Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-sm">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base tracking-wider">RESQ CONTROL CENTER</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                DISPATCH v2.6
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                [LIVE MULTI-CHANNEL ACTIVE]
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>Station: Lead Command Terminal</span>
              <span>•</span>
              <span>Operator: <strong className="text-slate-200">Operator #41 (On Duty)</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle: Live System Health Status Strip */}
      <div className="hidden xl:flex items-center gap-1.5 text-[11px]">
        <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${getBadgeColor(status?.aiEngine)}`}>
          <Cpu className="w-3.5 h-3.5" />
          <span>AI: {status?.aiEngine || 'ONLINE'}</span>
        </div>
        <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${getBadgeColor(status?.weatherFeed)}`}>
          <CloudRain className="w-3.5 h-3.5" />
          <span>WEATHER: {status?.weatherFeed || 'ONLINE'}</span>
        </div>
        <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${getBadgeColor(status?.realtimeStream)}`}>
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>REALTIME: {status?.realtimeStream || 'ONLINE'}</span>
        </div>
        <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${getBadgeColor(status?.notifications)}`}>
          <Bell className="w-3.5 h-3.5" />
          <span>NOTIFS: {status?.notifications || 'ONLINE'}</span>
        </div>
        <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${getBadgeColor(status?.database)}`}>
          <Database className="w-3.5 h-3.5" />
          <span>DB: {status?.database || 'ONLINE'}</span>
        </div>
      </div>

      {/* Right: Quick Action Modals & Clock & Logout */}
      <div className="flex items-center gap-2.5">
        {/* Scenarios Button */}
        <button
          onClick={onOpenDemoScenarios}
          className="px-2.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          title="Trigger hackathon demo disaster scenarios"
        >
          <PlayCircle className="w-3.5 h-3.5" />
          <span>Scenarios</span>
        </button>

        {/* What-If Sim Button */}
        <button
          onClick={onOpenSimulation}
          className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          title="Open What-If disaster scenario simulator"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>What-If Sim</span>
        </button>

        {/* Responders Roster Button */}
        <button
          onClick={onOpenTeams}
          className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          title="View & dispatch response teams"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Responders</span>
        </button>

        {/* Alert Logs Button */}
        <button
          onClick={onOpenAlerts}
          className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          title="View alert dispatch logs & audit timeline"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Alert Logs</span>
        </button>

        {/* Live Clock */}
        <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 font-mono text-xs font-bold text-cyan-300 flex items-center gap-1.5 shadow-inner">
          <Activity className="w-3.5 h-3.5 text-red-400 animate-pulse" />
          <span>{timeString || '12:00:00'} UTC</span>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 border border-red-500/30 transition-colors"
          title="Sign out of Control Center"
          aria-label="Log Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
