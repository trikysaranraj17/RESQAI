'use client';

import React, { useState } from 'react';
import { Shield, Lock, User, Loader2, X, AlertCircle, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter();
  const [username, setUsername] = useState('operator');
  const [password, setPassword] = useState('resq-command-2026');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onClose();
        router.push('/control-center');
      } else {
        setErrorMessage(data.error || 'Invalid credentials. Access denied.');
      }
    } catch {
      setErrorMessage('Network authentication error. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-panel-elevated rounded-3xl p-6 sm:p-8 text-slate-100 shadow-2xl border border-white/20">
        {/* Glow ambient background accent */}
        <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-lg shadow-cyan-500/10">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">RESQ Control Center</h2>
          <p className="text-xs text-slate-400 mt-1">Authorized Agency & Operator Access Terminal</p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 animate-in shake duration-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
              Operator Identifier
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter operator ID"
                required
                className="w-full glass-input rounded-xl py-2.5 pl-10 pr-3.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
              Secure Passkey
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter secure passkey"
                required
                className="w-full glass-input rounded-xl py-2.5 pl-10 pr-3.5 text-sm"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-[0.98] text-white font-bold text-sm shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials…</span>
                </>
              ) : (
                <>
                  <span>Authenticate Operator</span>
                  <Sparkles className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-4 text-center">
          <p className="text-[11px] text-slate-400">
            Demo Credentials Pre-filled: <code className="text-cyan-300 font-mono">operator</code> / <code className="text-cyan-300 font-mono">resq-command-2026</code>
          </p>
        </div>
      </div>
    </div>
  );
}
