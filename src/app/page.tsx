'use client';

import React, { useState } from 'react';
import { Shield, LifeBuoy, Lock, HeartHandshake, Eye } from 'lucide-react';
import { SosButton } from '@/components/citizen/SosButton';
import { SosFlowModal } from '@/components/citizen/SosFlowModal';
import { OfflineBanner } from '@/components/citizen/OfflineBanner';
import { SecretShortcutListener } from '@/components/citizen/SecretShortcutListener';
import { LoginModal } from '@/components/auth/LoginModal';

export default function CitizenHomePage() {
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleOpenSos = () => {
    setIsSosModalOpen(true);
  };

  const handleIncidentSubmitted = (id: string) => {
    setActiveIncidentId(id);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 md:p-8 selection:bg-red-500/30 selection:text-white relative overflow-hidden">
      {/* Secret Global Keyboard Shortcut Listener (5 -> 7 -> 2 -> 1) */}
      <SecretShortcutListener onTrigger={() => setIsLoginModalOpen(true)} />

      {/* Top Header */}
      <header className="flex items-center justify-between max-w-4xl mx-auto w-full pt-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black tracking-wider text-white flex items-center gap-1.5">
              RESQ <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">AI</span>
            </div>
            <p className="text-[11px] text-slate-400">Civil Emergency Response</p>
          </div>
        </div>

        {/* Quiet Live Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Operations Active</span>
        </div>
      </header>

      {/* Main Center Stage: Calm, Clean, Focused */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full my-auto py-8">
        {/* Calm Heading */}
        <div className="text-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Need emergency help?
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-xs mx-auto">
            Instant multi-agency dispatch with automatic AI situational assessment.
          </p>
        </div>

        {/* Giant Pulsating Red SOS Button */}
        <SosButton onPress={handleOpenSos} />

        {/* Active Incident Quick Status Card if citizen already submitted in this session */}
        {activeIncidentId && (
          <div className="w-full mt-4 p-4 rounded-2xl glass-panel text-xs text-slate-200 flex items-center justify-between border-l-4 border-amber-400 animate-in fade-in duration-300">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Active Incident Lodged</span>
              <strong className="text-white font-mono text-sm">{activeIncidentId}</strong>
              <span className="text-emerald-400 block text-[11px]">✓ Team notified & monitoring</span>
            </div>
            <button
              onClick={() => setIsSosModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors"
            >
              View Details
            </button>
          </div>
        )}
      </main>

      {/* Clean, Unobtrusive Footer: strictly Privacy & Help links */}
      <footer className="max-w-4xl mx-auto w-full pt-4 pb-2 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 border-t border-white/5 gap-3">
        <p>© 2026 RESQ Emergency Network. High-Priority Humanitarian Dispatch System.</p>
        <div className="flex items-center gap-5">
          <button
            onClick={() => setShowPrivacyModal(true)}
            className="hover:text-slate-300 transition-colors"
          >
            Privacy & Security
          </button>
          <button
            onClick={() => setShowHelpModal(true)}
            className="hover:text-slate-300 transition-colors"
          >
            How it Works
          </button>
        </div>
      </footer>

      {/* Sequential Guided SOS Modal Flow */}
      <SosFlowModal
        isOpen={isSosModalOpen}
        onClose={() => setIsSosModalOpen(false)}
        onSubmitted={handleIncidentSubmitted}
        activeIncidentId={activeIncidentId}
      />

      {/* Offline Status & IndexedDB Auto-sync Banner */}
      <OfflineBanner />

      {/* Hidden Control Center Login Overlay (Triggered only via 5-7-2-1 secret sequence) */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* Privacy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel-elevated rounded-3xl p-6 max-w-md w-full text-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
              <Lock className="w-5 h-5" />
              <h3>Privacy & Location Safeguards</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your precise coordinates, uploaded photographs, and voice notes are encrypted in transit and accessible strictly by authenticated emergency response operators and tactical rescue units.
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              No private citizen data is publicly visible. Voice recordings are retained solely for rapid rescue assessment.
            </p>
            <button
              onClick={() => setShowPrivacyModal(false)}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel-elevated rounded-3xl p-6 max-w-md w-full text-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
              <LifeBuoy className="w-5 h-5" />
              <h3>How RESQ Works</h3>
            </div>
            <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4 leading-relaxed">
              <li><strong>Tap SOS:</strong> One tap opens the 4-step assistance wizard.</li>
              <li><strong>Provide Evidence:</strong> Photos and voice notes give the AI engine crucial context to elevate response priority.</li>
              <li><strong>Zero Disruption:</strong> Works even when network is intermittent by queuing reports locally until reconnected.</li>
            </ul>
            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
