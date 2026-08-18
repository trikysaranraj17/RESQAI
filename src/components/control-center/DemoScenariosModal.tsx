'use client';

import React, { useState } from 'react';
import { X, PlayCircle, Waves, Flame, Mountain, RotateCcw, Loader2, Sparkles } from 'lucide-react';

interface DemoScenariosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScenarioTriggered: () => void;
}

export function DemoScenariosModal({
  isOpen,
  onClose,
  onScenarioTriggered,
}: DemoScenariosModalProps) {
  const [loadingScenario, setLoadingScenario] = useState<string | null>(null);

  if (!isOpen) return null;

  const triggerScenario = async (scenarioKey: string) => {
    setLoadingScenario(scenarioKey);
    try {
      await fetch('/api/demo/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenarioKey }),
      });
      onScenarioTriggered();
      onClose();
    } catch (err) {
      console.error('Error triggering scenario:', err);
    } finally {
      setLoadingScenario(null);
    }
  };

  const scenarios = [
    {
      key: 'flash_flood',
      title: 'Flash Flood in North Basin Sector',
      description: '6 civilians stranded on residential rooftop. Heavy rainfall (68mm/h) & water rising rapidly. Photo + voice distress evidence attached.',
      icon: Waves,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/30',
      risk: '88% Critical P1',
    },
    {
      key: 'wildfire',
      title: 'Wildfire Gale Spread in Ridge Valley',
      description: 'Rapid brush fire jumped highway barrier. 12 civilians in path of smoke plume. 50km/h wind gusts.',
      icon: Flame,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      risk: '84% Critical P1',
    },
    {
      key: 'landslide',
      title: 'Hillside Mudslide & Highway Collapse',
      description: 'Slope collapse engulfed primary two-lane arterial overpass. Utility power lines severed and sparking.',
      icon: Mountain,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      risk: '64% High P2',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 max-w-xl w-full text-slate-100 space-y-5 border border-white/20 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Hackathon Demo Scenarios</h3>
              <p className="text-xs text-slate-400">Instantly simulate realistic multi-modal disaster reports</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scenarios list */}
        <div className="space-y-3">
          {scenarios.map((sc) => {
            const Icon = sc.icon;
            const isLoading = loadingScenario === sc.key;
            return (
              <div
                key={sc.key}
                className={`p-4 rounded-2xl border ${sc.border} ${sc.bg} space-y-2 relative overflow-hidden`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${sc.color}`} />
                    <h4 className="font-bold text-sm text-white">{sc.title}</h4>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                    {sc.risk}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{sc.description}</p>
                <button
                  onClick={() => triggerScenario(sc.key)}
                  disabled={Boolean(loadingScenario)}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Injecting Disaster Event…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Launch This Scenario</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Reset Button */}
        <div className="pt-2 border-t border-white/10 flex justify-between items-center">
          <span className="text-xs text-slate-400">Restore default demo database state</span>
          <button
            onClick={() => triggerScenario('reset')}
            disabled={Boolean(loadingScenario)}
            className="px-3.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo DB</span>
          </button>
        </div>
      </div>
    </div>
  );
}
