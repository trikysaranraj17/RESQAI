'use client';

import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, CheckCircle2, PhoneCall, Mail, MessageSquare, Send, Check } from 'lucide-react';
import { NotificationLog } from '@/lib/types';

interface UnaccountedSectionProps {
  notifications: NotificationLog[];
  onRefresh: () => void;
}

export function UnaccountedSection({ notifications, onRefresh }: UnaccountedSectionProps) {
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Filter logs with status 'FAILED' representing unaccounted alerts
  const unaccountedLogs = notifications.filter((log) => log.status === 'FAILED');

  const handleRetry = async (logId: string) => {
    try {
      setActioningId(logId);
      const res = await fetch('/api/notifications/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Alert resent successfully!');
      } else {
        alert(`Resend failed: ${data.log?.messagePreview || 'Unknown error'}`);
      }
    } catch (e: any) {
      alert(`Error resending: ${e.message}`);
    } finally {
      setActioningId(null);
      onRefresh();
    }
  };

  const handleResolveManually = async (logId: string) => {
    try {
      setActioningId(logId);
      const res = await fetch('/api/notifications/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Alert manually resolved as delivered.');
      }
    } catch (e: any) {
      alert(`Error resolving: ${e.message}`);
    } finally {
      setActioningId(null);
      onRefresh();
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel.toUpperCase()) {
      case 'VOICE':
      case 'CALL':
        return <PhoneCall className="w-3.5 h-3.5 text-cyan-400" />;
      case 'EMAIL':
        return <Mail className="w-3.5 h-3.5 text-amber-400" />;
      case 'SMS':
        return <MessageSquare className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Send className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-4 flex flex-col space-y-3.5 flex-1 min-h-[220px]">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${unaccountedLogs.length > 0 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
          <h3 className="font-extrabold text-white text-xs tracking-wider uppercase">Unaccounted Alert Requests</h3>
        </div>
        {unaccountedLogs.length > 0 && (
          <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
            {unaccountedLogs.length} MISSED
          </span>
        )}
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto max-h-[280px] space-y-2 pr-1 custom-scrollbar">
        {unaccountedLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 border border-dashed border-white/5 rounded-2xl">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <p className="text-xs text-slate-300 font-bold">All alerts accounted for</p>
            <p className="text-[10px] text-slate-500 max-w-[200px]">
              Every emergency responder and broadcast channel responded successfully.
            </p>
          </div>
        ) : (
          unaccountedLogs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2.5 transition-all hover:bg-white/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                      {log.incidentId}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-200">
                      {getChannelIcon(log.channel)}
                      <span>{log.channel}</span>
                    </div>
                  </div>
                  <p className="text-[11px] font-mono text-slate-300 break-all">{log.recipient}</p>
                </div>
                <span className="text-[9px] text-slate-500">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Error preview text */}
              <div className="p-2 rounded bg-black/40 border border-white/5 text-[10px] text-red-400 font-mono line-clamp-2">
                {log.messagePreview || 'Delivery error reported by provider.'}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  disabled={actioningId !== null}
                  onClick={() => handleRetry(log.id)}
                  className="flex-1 py-1 px-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold text-[10px] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${actioningId === log.id ? 'animate-spin' : ''}`} />
                  <span>Retry Alert</span>
                </button>
                <button
                  disabled={actioningId !== null}
                  onClick={() => handleResolveManually(log.id)}
                  className="py-1 px-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white font-semibold text-[10px] flex items-center gap-1 transition-colors"
                >
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Resolve Manually</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
