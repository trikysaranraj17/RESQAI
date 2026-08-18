'use client';

import React from 'react';
import { Incident } from '@/lib/types';
import { ShieldAlert, Users, ArrowUpRight, Clock } from 'lucide-react';

interface PriorityQueueProps {
  incidents: Incident[];
  onSelectIncident: (id: string) => void;
  onReviewIncident: (incident: Incident) => void;
}

export function PriorityQueue({
  incidents,
  onSelectIncident,
  onReviewIncident,
}: PriorityQueueProps) {
  // Rank algorithm: Composite urgency = (riskScore * 0.6) + (min(people, 10) * 3) + recencyBonus
  const ranked = [...incidents]
    .filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED')
    .map((inc) => {
      const msOld = Date.now() - new Date(inc.createdAt).getTime();
      const minsOld = msOld / 60000;
      const recencyScore = Math.max(0, 15 - minsOld * 0.2);
      const compositeScore = inc.riskScore * 0.65 + Math.min(inc.peopleAffected, 8) * 3 + recencyScore;
      return {
        ...inc,
        urgencyRankScore: Math.round(compositeScore),
      };
    })
    .sort((a, b) => b.urgencyRankScore - a.urgencyRankScore);

  return (
    <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Priority Queue (Who Needs Help First?)
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">Algorithmic Rank</span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {ranked.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            No active emergencies in priority queue.
          </div>
        ) : (
          ranked.map((inc, index) => {
            const isTop = index === 0;
            return (
              <div
                key={inc.id}
                onClick={() => {
                  onSelectIncident(inc.id);
                  onReviewIncident(inc);
                }}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isTop
                    ? 'bg-red-950/30 border-red-500/40 hover:bg-red-950/50'
                    : 'bg-white/[0.03] border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-6 h-6 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                      isTop
                        ? 'bg-red-500 text-white shadow-md shadow-red-500/40'
                        : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    #{index + 1}
                  </span>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-white">{inc.id}</span>
                      <span className="text-xs font-semibold text-slate-300">{inc.type}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      📍 {inc.address}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-right">
                  <div>
                    <span className="text-xs font-black text-red-400 block">{inc.riskScore}% Risk</span>
                    <span className="text-[10px] text-slate-400">{inc.peopleAffected} trapped</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
