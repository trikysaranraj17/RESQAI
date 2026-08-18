'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Sliders, AlertTriangle, Users, Building, ShieldAlert, X } from 'lucide-react';
import { WhatIfResult, WhatIfParams } from '@/lib/types';

interface WhatIfSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WhatIfSimulator({ isOpen, onClose }: WhatIfSimulatorProps) {
  const [rainfallMm, setRainfallMm] = useState(80);
  const [affectedRadiusKm, setAffectedRadiusKm] = useState(6);
  const [roadBlockagePercent, setRoadBlockagePercent] = useState(45);
  const [populationDensity, setPopulationDensity] = useState<'Low' | 'Medium' | 'High' | 'Dense Urban'>('Medium');
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rainfallMm,
          affectedRadiusKm,
          roadBlockagePercent,
          populationDensity,
        } as WhatIfParams),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.result);
      }
    } catch (err) {
      console.error('Error running simulation:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runSimulation();
    }
  }, [isOpen, rainfallMm, affectedRadiusKm, roadBlockagePercent, populationDensity]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 max-w-2xl w-full text-slate-100 space-y-6 border border-white/20 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Disaster What-If Scenario Simulator</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  SIMULATION ONLY
                </span>
              </div>
              <p className="text-xs text-slate-400">Stress-test shelter capacity, population exposure, and access bottlenecks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Rainfall Slider */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">Simulated Rainfall Intensity</span>
              <strong className="text-cyan-400 font-mono">{rainfallMm} mm/h</strong>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              step="5"
              value={rainfallMm}
              onChange={(e) => setRainfallMm(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Radius Slider */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">Affected Hazard Radius</span>
              <strong className="text-purple-400 font-mono">{affectedRadiusKm} km</strong>
            </div>
            <input
              type="range"
              min="1"
              max="25"
              step="0.5"
              value={affectedRadiusKm}
              onChange={(e) => setAffectedRadiusKm(Number(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
          </div>

          {/* Road Blockage Slider */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">Road Inaccessibility / Blockage</span>
              <strong className="text-amber-400 font-mono">{roadBlockagePercent}%</strong>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={roadBlockagePercent}
              onChange={(e) => setRoadBlockagePercent(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Population Density Selection */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">Zone Population Density</span>
              <strong className="text-emerald-400 font-mono">{populationDensity}</strong>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {(['Low', 'Medium', 'High', 'Dense Urban'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setPopulationDensity(d)}
                  className={`py-1 rounded text-[10px] font-bold border transition-colors ${
                    populationDensity === d
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Simulation Results */}
        {result && (
          <div className="p-4 rounded-2xl bg-black/40 border border-white/15 space-y-4">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              Projected Simulation Impact
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-slate-400 text-[10px] block mb-1">Simulated Risk</span>
                <strong className="text-xl font-black text-red-400">{result.simulatedRiskScore}%</strong>
                <span className="text-[10px] uppercase font-bold text-red-300 block">{result.simulatedRiskLevel}</span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-slate-400 text-[10px] block mb-1">Exposed Population</span>
                <strong className="text-xl font-black text-amber-400">{result.exposedPopulationEstimate.toLocaleString()}</strong>
                <span className="text-[10px] text-slate-400 block">Civilians</span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-slate-400 text-[10px] block mb-1">Shelter Pressure</span>
                <strong className="text-xl font-black text-cyan-400">{result.shelterPressurePercent}%</strong>
                <span className="text-[10px] text-cyan-300 block">Capacity Load</span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-slate-400 text-[10px] block mb-1">Critical Road Cuts</span>
                <strong className="text-xl font-black text-purple-400">{result.criticalRoadsCut}</strong>
                <span className="text-[10px] text-slate-400 block">Arteries Cut</span>
              </div>
            </div>

            {/* Evacuation zones */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
              <strong className="text-amber-400 block mb-1">Simulation Recommended Buffer Corridors:</strong>
              <ul className="list-disc pl-4 space-y-0.5">
                {result.recommendedEvacuationZones.map((z, i) => (
                  <li key={i}>{z}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
