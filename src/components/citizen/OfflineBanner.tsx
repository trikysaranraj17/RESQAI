'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getOfflineDrafts, deleteOfflineDraft } from '@/lib/indexedDb';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingDraftsCount, setPendingDraftsCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncedJustNow, setSyncedJustNow] = useState<boolean>(false);

  // Monitor online / offline network state
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineDrafts();
    };

    const handleOffline = () => {
      setIsOnline(false);
      checkDrafts();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkDrafts();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkDrafts = async () => {
    try {
      const drafts = await getOfflineDrafts();
      setPendingDraftsCount(drafts.length);
    } catch {
      // IndexedDB might not be available yet
    }
  };

  const syncOfflineDrafts = async () => {
    try {
      const drafts = await getOfflineDrafts();
      if (drafts.length === 0) return;

      setIsSyncing(true);
      for (const draft of drafts) {
        await fetch('/api/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: draft.type,
            description: draft.description,
            peopleAffected: draft.peopleAffected,
            latitude: draft.latitude,
            longitude: draft.longitude,
            accuracy: draft.accuracy,
            address: draft.address,
            media: draft.mediaBase64 ? [{ url: draft.mediaBase64, type: draft.mediaType || 'image', capturedAt: draft.createdAt }] : [],
            citizenId: `CITIZEN-OFFLINE-SYNC-${Math.floor(1000 + Math.random() * 9000)}`,
          }),
        });
        await deleteOfflineDraft(draft.localDraftId);
      }

      setIsSyncing(false);
      setPendingDraftsCount(0);
      setSyncedJustNow(true);
      setTimeout(() => setSyncedJustNow(false), 5000);
    } catch (err) {
      console.error('Error syncing offline drafts:', err);
      setIsSyncing(false);
    }
  };

  if (isOnline && pendingDraftsCount === 0 && !syncedJustNow) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 animate-in slide-in-from-bottom duration-300">
      {!isOnline && (
        <div className="p-3.5 rounded-2xl bg-amber-950/80 border border-amber-500/40 text-amber-200 text-xs shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <div>
              <p className="font-semibold text-amber-100">Offline Mode Active</p>
              <p className="text-[11px] text-amber-300/80">Reports will be saved to IndexedDB and sent automatically upon reconnection.</p>
            </div>
          </div>
        </div>
      )}

      {syncedJustNow && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs shadow-2xl backdrop-blur-xl flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Pending emergency reports synchronized successfully with RESQ.</span>
        </div>
      )}

      {isOnline && pendingDraftsCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 text-xs shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <RefreshCw className={`w-4 h-4 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{pendingDraftsCount} offline report(s) ready to transmit.</span>
          </div>
          <button
            onClick={syncOfflineDrafts}
            disabled={isSyncing}
            className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px]"
          >
            {isSyncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      )}
    </div>
  );
}
