'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Volume2, VolumeX, AlertOctagon, Radio, Shield } from 'lucide-react';
import { Incident } from '@/lib/types';

export default function SirenStationPage() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isTriggered, setIsTriggered] = useState(false);
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillator1Ref = useRef<OscillatorNode | null>(null);
  const oscillator2Ref = useRef<OscillatorNode | null>(null);
  const modulatorRef = useRef<OscillatorNode | null>(null);
  const pulseIntervalRef = useRef<any>(null);

  const initializedIncidentsRef = useRef<Set<string>>(new Set());
  const isInitializedRef = useRef<boolean>(false);

  // Subscribe to SSE stream and polling for real-time dispatch updates
  useEffect(() => {
    let eventSource: EventSource | null = null;

    // Initial load & Polling Fallback
    const pollIncidents = async () => {
      try {
        const res = await fetch('/api/incidents');
        const data = await res.json();
        if (data.success && Array.isArray(data.incidents)) {
          const activeList: Incident[] = data.incidents;

          // If we haven't initialized, populate older in-progress incidents as already handled.
          // If the dispatch update is recent (within 5 minutes), let it trigger the alarm!
          if (!isInitializedRef.current) {
            activeList.forEach((inc) => {
              if (inc.status === 'IN PROGRESS') {
                const diffMs = Date.now() - new Date(inc.updatedAt || inc.createdAt).getTime();
                // If it was dispatched more than 5 minutes ago, mark it as handled so it doesn't trigger
                if (Math.abs(diffMs) > 5 * 60 * 1000) {
                  initializedIncidentsRef.current.add(inc.id);
                }
              }
            });
            isInitializedRef.current = true;
          }

          // Check for any new IN PROGRESS incident
          const newDispatch = activeList.find(
            (inc) => inc.status === 'IN PROGRESS' && !initializedIncidentsRef.current.has(inc.id)
          );

          if (newDispatch) {
            initializedIncidentsRef.current.add(newDispatch.id);
            setActiveIncident(newDispatch);
            setIsTriggered(true);
          }
        }
      } catch (e) {
        console.warn('Polling fallback failed:', e);
      }
    };

    pollIncidents();
    const interval = setInterval(pollIncidents, 1500);

    try {
      eventSource = new EventSource('/api/realtime');

      eventSource.addEventListener('incident_updated', (evt: any) => {
        try {
          const payload = JSON.parse(evt.data);
          if (payload.reset) return;

          const updated: Incident = payload.incident;
          
          // Trigger when status changes to IN PROGRESS (Dispatched) and not already handled
          if (updated.status === 'IN PROGRESS' && !initializedIncidentsRef.current.has(updated.id)) {
            initializedIncidentsRef.current.add(updated.id);
            setActiveIncident(updated);
            setIsTriggered(true);
          }
        } catch (e) {
          console.error('Error parsing SSE event:', e);
        }
      });
    } catch (e) {
      console.warn('SSE Connection failed:', e);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearInterval(interval);
      stopSirenAlarm();
    };
  }, []);

  // Play/Stop siren based on isTriggered state
  useEffect(() => {
    if (isTriggered && isUnlocked) {
      startSirenAlarm();
    } else {
      stopSirenAlarm();
    }
    return () => stopSirenAlarm();
  }, [isTriggered, isUnlocked]);

  // Unlock audio globally on click/tap
  useEffect(() => {
    const handleUnlock = () => {
      if (!isUnlocked) {
        unlockAudio();
      }
      // Proactively resume context on any interaction to prevent background suspension
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    };
    window.addEventListener('click', handleUnlock);
    window.addEventListener('touchstart', handleUnlock);
    return () => {
      window.removeEventListener('click', handleUnlock);
      window.removeEventListener('touchstart', handleUnlock);
    };
  }, [isUnlocked]);

  const unlockAudio = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        ctx.resume();
        audioCtxRef.current = ctx;
      }
      setIsUnlocked(true);
    } catch (e) {
      console.error('Failed to unlock audio context:', e);
    }
  };

  const startSirenAlarm = () => {
    try {
      // Ensure any existing audio is stopped
      stopSirenAlarm();

      let ctx = audioCtxRef.current;
      if (!ctx) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        ctx = new AudioContext();
        audioCtxRef.current = ctx;
      }

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Generate a sharp dual-tone emergency buzzer (Square + Sine Combination)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'square'; // Square wave creates that classic harsh "buzzer" sound
      osc2.type = 'sawtooth';

      osc1.frequency.setValueAtTime(220, ctx.currentTime); // Low aggressive buzz
      osc2.frequency.setValueAtTime(440, ctx.currentTime); // Mid-tone siren sweep

      const modulator = ctx.createOscillator();
      const modulatorGain = ctx.createGain();
      modulator.frequency.value = 3.5; // Rapid sweeps (3.5 times per second)
      modulatorGain.gain.value = 120; // Pitch variation range

      modulator.connect(modulatorGain);
      modulatorGain.gain.setValueAtTime(120, ctx.currentTime);
      modulatorGain.connect(osc1.frequency);
      modulatorGain.connect(osc2.frequency);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Start initial volume
      gainNode.gain.setValueAtTime(0.9, ctx.currentTime);

      modulator.start();
      osc1.start();
      osc2.start();

      oscillator1Ref.current = osc1;
      oscillator2Ref.current = osc2;
      modulatorRef.current = modulator;

      // 🚨 PULSING/INTERMITTENT CYCLE: Plays buzzer sound "in sometimes only" (1.0s ON, 0.8s OFF)
      let beepState = true;
      pulseIntervalRef.current = setInterval(() => {
        try {
          if (ctx.state === 'running') {
            if (beepState) {
              // Turn off buzzer volume
              gainNode.gain.setValueAtTime(0.0, ctx.currentTime);
            } else {
              // Restore buzzer volume
              gainNode.gain.setValueAtTime(0.9, ctx.currentTime);
            }
            beepState = !beepState;
          }
        } catch (err) {}
      }, 1000);

      // Speak alert details via speech synthesis during silent periods
      if ('speechSynthesis' in window && activeIncident) {
        window.speechSynthesis.cancel();
        const text = `Warning. Emergency dispatch active. Incident Type: ${activeIncident.type}. Location: ${activeIncident.address}. Priority: ${activeIncident.priority}. Standby for action.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 0.95;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn('Audio Synthesis failed:', e);
    }
  };

  const stopSirenAlarm = () => {
    try {
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
        pulseIntervalRef.current = null;
      }
      if (oscillator1Ref.current) {
        try { oscillator1Ref.current.stop(); } catch (e) {}
        oscillator1Ref.current = null;
      }
      if (oscillator2Ref.current) {
        try { oscillator2Ref.current.stop(); } catch (e) {}
        oscillator2Ref.current = null;
      }
      if (modulatorRef.current) {
        try { modulatorRef.current.stop(); } catch (e) {}
        modulatorRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
        audioCtxRef.current.suspend();
      }
    } catch (e) {}
  };

  const handleMuteReset = () => {
    setIsTriggered(false);
    setActiveIncident(null);
    stopSirenAlarm();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 text-slate-100">
      <div className="max-w-md w-full bg-slate-950 border-2 border-slate-800 rounded-3xl p-8 text-center space-y-8">
        
        {/* Simple Flat Header */}
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <Shield className="w-5 h-5" />
          <span className="text-xs font-black tracking-wider uppercase">RESQ Receiver Station</span>
        </div>

        {/* Large Simple Alarm Symbol */}
        <div className="flex justify-center py-4">
          <div className={`p-8 rounded-full border-4 ${
            isTriggered 
              ? 'bg-red-600 border-red-700 text-white animate-bounce' 
              : isUnlocked 
                ? 'bg-slate-800 border-slate-700 text-slate-400' 
                : 'bg-amber-600/20 border-amber-500/40 text-amber-400'
          }`}>
            <Bell className="w-24 h-24 stroke-[2]" />
          </div>
        </div>

        {/* Main Status Text */}
        <div className="space-y-2">
          {!isUnlocked ? (
            <>
              <h2 className="text-xl font-bold text-amber-400">Station Locked</h2>
              <p className="text-xs text-slate-400">
                Browser security requires user interaction to enable audio. Tap the button below to arm the station.
              </p>
            </>
          ) : isTriggered ? (
            <>
              <h2 className="text-2xl font-black text-red-500 uppercase tracking-wide">🚨 SIREN ACTIVE 🚨</h2>
              <p className="text-sm text-white font-bold font-mono">
                {activeIncident?.type} DISPATCHED!
              </p>
              <p className="text-xs text-slate-400 font-mono mt-1">
                📍 {activeIncident?.address}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-emerald-400">System Monitoring</h2>
              <p className="text-xs text-slate-400">
                Armed and listening for real-time dispatch signals from control center...
              </p>
            </>
          )}
        </div>

        {/* Action Button */}
        <div>
          {!isUnlocked ? (
            <button
              onClick={unlockAudio}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider transition-colors shadow-lg"
            >
              🔊 Activate Alarm Station
            </button>
          ) : isTriggered ? (
            <button
              onClick={handleMuteReset}
              className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <VolumeX className="w-4 h-4" /> Mute & Reset Alarm
            </button>
          ) : (
            <div className="flex justify-center gap-1.5 items-center text-emerald-500 text-xs font-bold font-mono bg-emerald-500/10 py-3 rounded-2xl border border-emerald-500/20">
              <Radio className="w-4 h-4 animate-pulse" />
              <span>LIVE CONNECTION ESTABLISHED</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
