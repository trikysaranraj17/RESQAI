'use client';

import React, { useState } from 'react';
import { X, Bell, Clock, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { NotificationLog, AuditLog } from '@/lib/types';

interface AlertHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationLog[];
  auditLogs: AuditLog[];
}

export function AlertHistoryModal({
  isOpen,
  onClose,
  notifications,
  auditLogs,
}: AlertHistoryModalProps) {
  const [viewMode, setViewMode] = useState<'ALERTS' | 'AUDIT'>('ALERTS');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 max-w-4xl w-full text-slate-100 space-y-5 border border-white/20 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Alert Dispatch Records & Audit Trail</h3>
              <p className="text-xs text-slate-400">Verifiable logging of all voice, SMS, email, and operator state changes</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/10 text-xs">
              <button
                onClick={() => setViewMode('ALERTS')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  viewMode === 'ALERTS' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Alerts ({notifications.length})
              </button>
              <button
                onClick={() => setViewMode('AUDIT')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  viewMode === 'AUDIT' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Audit Log ({auditLogs.length})
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 text-xs">
          {viewMode === 'ALERTS' ? (
            <div className="space-y-2">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No alert transmissions recorded yet.</div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">{n.incidentId}</span>
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {n.channel}
                        </span>
                        <span className="text-slate-300 font-semibold">{n.recipient}</span>
                        {n.isSimulated && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            SIMULATED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 font-mono line-clamp-1">
                        &ldquo;{n.messagePreview}&rdquo;
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto text-[11px] shrink-0">
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{n.status}</span>
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">
                        {new Date(n.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No audit events recorded.</div>
              ) : (
                auditLogs.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-400 font-bold">{a.action}</span>
                        {a.incidentId && (
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                            {a.incidentId}
                          </span>
                        )}
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-300">{a.actor}</span>
                      </div>
                      <p className="text-xs text-slate-300">{a.details}</p>
                    </div>
                    <span className="text-slate-500 text-[10px] font-mono shrink-0">
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
