'use client';

import React from 'react';
import {
  CloudRain,
  CloudLightning,
  Wind,
  Droplets,
  Thermometer,
  Compass,
  Sparkles,
} from 'lucide-react';
import { WeatherSnapshot } from '@/lib/types';

interface WeatherPanelProps {
  weather: WeatherSnapshot | null;
}

export function WeatherPanel({ weather }: WeatherPanelProps) {
  if (!weather) {
    return (
      <div className="glass-panel p-4 rounded-2xl border border-white/10 text-xs text-slate-400">
        Loading meteorological radar data…
      </div>
    );
  }

  const getConditionIcon = (condition: string) => {
    if (condition.includes('Storm') || condition.includes('Lightning')) return CloudLightning;
    if (condition.includes('Rain')) return CloudRain;
    return CloudRain;
  };

  const MainIcon = getConditionIcon(weather.condition);

  return (
    <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudRain className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Meteorological Radar</h3>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono">
          {weather.isSimulated ? 'DEMO WEATHER' : 'REAL PROVIDER'}
        </span>
      </div>

      {/* Main Condition & Temp Display */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-blue-950/30 border border-cyan-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
            <MainIcon className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-sm font-bold text-white block">{weather.condition}</span>
            <span className="text-xs text-cyan-300/80">Active Storm Surge Advisory</span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl font-black text-white">{weather.temperatureC}°C</span>
          <span className="text-[10px] text-slate-400 block">Precip: {weather.rainfallMm} mm/h</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-center gap-1 text-slate-400 text-[11px] mb-1">
            <Droplets className="w-3 h-3 text-cyan-400" />
            <span>Rain Prob</span>
          </div>
          <strong className="text-white font-bold text-sm">{weather.rainProbability}%</strong>
        </div>

        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-center gap-1 text-slate-400 text-[11px] mb-1">
            <Wind className="w-3 h-3 text-amber-400" />
            <span>Wind Speed</span>
          </div>
          <strong className="text-white font-bold text-sm">{weather.windSpeedKmh} km/h</strong>
        </div>

        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-center gap-1 text-slate-400 text-[11px] mb-1">
            <Droplets className="w-3 h-3 text-emerald-400" />
            <span>Humidity</span>
          </div>
          <strong className="text-white font-bold text-sm">{weather.humidityPercent}%</strong>
        </div>
      </div>

      {/* Hourly Forecast Strip */}
      <div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
          Hourly Weather Trajectory
        </span>
        <div className="grid grid-cols-6 gap-1.5 text-center">
          {weather.hourlyForecast.map((h, i) => (
            <div key={i} className="p-2 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center">
              <span className="text-[10px] text-slate-400 font-mono">{h.timeLabel}</span>
              <CloudRain className="w-3.5 h-3.5 text-cyan-400 my-1" />
              <span className="text-xs font-bold text-white">{h.tempC}°</span>
              <span className="text-[9px] text-cyan-300">{h.rainProb}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
