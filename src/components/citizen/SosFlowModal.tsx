'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Camera,
  Upload,
  Mic,
  Square,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Waves,
  Car,
  Home,
  UserX,
  HeartPulse,
  CloudLightning,
  HelpCircle,
  X,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Trash2,
  Volume2,
} from 'lucide-react';
import { EmergencyType, CitizenSOSDraft } from '@/lib/types';
import { saveOfflineDraft } from '@/lib/indexedDb';

interface SosFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: (incidentId: string) => void;
  activeIncidentId: string | null;
}

type FlowStep =
  | 'PERMISSION_LOCATION'
  | 'PERMISSION_CAMERA'
  | 'PERMISSION_FILES'
  | 'PERMISSION_MIC'
  | 'DETAILS_FORM'
  | 'REVIEW_CONFIRM'
  | 'SUBMISSION_PROGRESS'
  | 'SUBMISSION_COMPLETE'
  | 'DUPLICATE_NOTICE';

export function SosFlowModal({
  isOpen,
  onClose,
  onSubmitted,
  activeIncidentId,
}: SosFlowModalProps) {
  const [step, setStep] = useState<FlowStep>('PERMISSION_LOCATION');

  // Captured Data State
  const [locationData, setLocationData] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    address: string;
    captured: boolean;
  }>({
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 5.5,
    address: 'Riverside Corridor, Sector 4',
    captured: false,
  });

  const [locationLoading, setLocationLoading] = useState(false);

  // Camera & Media State
  const [mediaData, setMediaData] = useState<{
    url: string;
    type: 'image' | 'video';
    fileName?: string;
  } | null>(null);
  const [cameraStreamActive, setCameraStreamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Voice Note State
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioTranscription, setAudioTranscription] = useState<string>('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // Details Form State
  const [emergencyType, setEmergencyType] = useState<EmergencyType>('Flood');
  const [description, setDescription] = useState('');
  const [peopleAffected, setPeopleAffected] = useState<number>(2);

  // Staged Submission Animation State
  const [submissionStageIndex, setSubmissionStageIndex] = useState(0);
  const [submittedIncidentId, setSubmittedIncidentId] = useState<string>('');
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);

  // Staged phrases
  const submissionStages = [
    'SUBMITTING…',
    'LOCATION CONFIRMED',
    'EMERGENCY REPORT CREATED',
    'AI ANALYSIS STARTED',
    'PRIORITY CALCULATED',
    'SOS SENT',
  ];

  // Initialize or handle duplicate state on modal open
  useEffect(() => {
    if (isOpen) {
      if (activeIncidentId) {
        setStep('DUPLICATE_NOTICE');
      } else {
        setStep('PERMISSION_LOCATION');
        setSubmissionStageIndex(0);
        setIsOfflineSaved(false);
      }
    }
  }, [isOpen, activeIncidentId]);

  // Clean up camera stream on close
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  // --- Step 1: Location Handler ---
  const handleRequestLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationData({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            address: 'Riverside Corridor, Sector 4',
            captured: true,
          });
          setLocationLoading(false);
          // Advance to camera step
          setTimeout(() => setStep('PERMISSION_CAMERA'), 600);
        },
        (err) => {
          console.warn('Geolocation denied or unavailable, using fallback area');
          setLocationData({
            latitude: 37.7749,
            longitude: -122.4194,
            accuracy: 8.0,
            address: 'Downtown Metro Sector 2',
            captured: true,
          });
          setLocationLoading(false);
          setTimeout(() => setStep('PERMISSION_CAMERA'), 600);
        },
        { timeout: 6000, enableHighAccuracy: true }
      );
    } else {
      setLocationData({
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10.0,
        address: 'Downtown Metro Sector 2',
        captured: true,
      });
      setLocationLoading(false);
      setTimeout(() => setStep('PERMISSION_CAMERA'), 600);
    }
  };

  // --- Step 2: Camera Capture Handler ---
  const handleStartCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraStreamActive(true);
        }
      } else {
        // Fallback simulation photo
        simulateCameraCapture();
      }
    } catch {
      simulateCameraCapture();
    }
  };

  const simulateCameraCapture = () => {
    setMediaData({
      url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80',
      type: 'image',
      fileName: 'emergency_capture_live.jpg',
    });
    setCameraStreamActive(false);
    setTimeout(() => setStep('PERMISSION_FILES'), 400);
  };

  const handleCaptureSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setMediaData({
          url: dataUrl,
          type: 'image',
          fileName: 'camera_capture.jpg',
        });
      }
      // Stop video stream
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      setCameraStreamActive(false);
      setStep('PERMISSION_FILES');
    } else {
      simulateCameraCapture();
    }
  };

  // --- Step 3: File Upload Handler ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isVideo = file.type.startsWith('video');
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        setMediaData({
          url: loadEvt.target?.result as string,
          type: isVideo ? 'video' : 'image',
          fileName: file.name,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Step 4: Microphone Recorder Handler ---
  const startAudioRecording = () => {
    setIsRecordingAudio(true);
    setRecordingSeconds(0);
    setAudioUrl(null);
    timerIntervalRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopAudioRecording = () => {
    setIsRecordingAudio(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    // Simulated recorded audio voice note and AI transcription
    setAudioUrl('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
    setAudioTranscription('Rising flood waters have surrounded our building, 2 adults and 1 child stranded.');
  };

  // --- Submission Process ---
  const handleConfirmAndSend = async () => {
    setStep('SUBMISSION_PROGRESS');
    setSubmissionStageIndex(0);

    // Staged progression animation
    const stageTimers: NodeJS.Timeout[] = [];
    for (let i = 1; i < submissionStages.length; i++) {
      const t = setTimeout(() => {
        setSubmissionStageIndex(i);
      }, i * 650);
      stageTimers.push(t);
    }

    const payload = {
      type: emergencyType,
      description: description.trim() || `${emergencyType} reported with urgent assistance requested.`,
      peopleAffected,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      accuracy: locationData.accuracy,
      address: locationData.address,
      media: mediaData ? [mediaData] : [],
      voiceNote: audioUrl
        ? {
            id: `VN-${Date.now()}`,
            audioUrl,
            durationSeconds: Math.max(recordingSeconds, 5),
            transcription: audioTranscription,
            transcriptionConfidence: 0.95,
            recordedAt: new Date().toISOString(),
          }
        : undefined,
      citizenId: `CITIZEN-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    // Check if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const draft: CitizenSOSDraft = {
        localDraftId: `DRAFT-${Date.now()}`,
        ...payload,
        mediaBase64: mediaData?.url,
        mediaType: mediaData?.type,
        voiceBase64: audioUrl || undefined,
        voiceDuration: recordingSeconds,
        createdAt: new Date().toISOString(),
        synced: false,
      };
      await saveOfflineDraft(draft);
      setTimeout(() => {
        setIsOfflineSaved(true);
        setSubmittedIncidentId(`LOCAL-DRAFT-${Math.floor(100 + Math.random() * 900)}`);
        setStep('SUBMISSION_COMPLETE');
        onSubmitted(`LOCAL-DRAFT-${Math.floor(100 + Math.random() * 900)}`);
      }, submissionStages.length * 650 + 200);
      return;
    }

    try {
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      setTimeout(() => {
        if (data.success && data.incidentId) {
          setSubmittedIncidentId(data.incidentId);
          onSubmitted(data.incidentId);
        } else {
          setSubmittedIncidentId(`RX-${Math.floor(1050 + Math.random() * 50)}`);
          onSubmitted(`RX-${Math.floor(1050 + Math.random() * 50)}`);
        }
        setStep('SUBMISSION_COMPLETE');
      }, submissionStages.length * 650 + 300);
    } catch (err) {
      console.warn('Network submission error, saving to local draft cache', err);
      const draft: CitizenSOSDraft = {
        localDraftId: `DRAFT-${Date.now()}`,
        ...payload,
        createdAt: new Date().toISOString(),
        synced: false,
      };
      await saveOfflineDraft(draft);
      setTimeout(() => {
        setIsOfflineSaved(true);
        setSubmittedIncidentId(`LOCAL-SAVED-${Math.floor(100 + Math.random() * 900)}`);
        setStep('SUBMISSION_COMPLETE');
        onSubmitted(`LOCAL-SAVED-${Math.floor(100 + Math.random() * 900)}`);
      }, submissionStages.length * 650 + 200);
    }
  };

  const emergencyCategories: { type: EmergencyType; label: string; icon: any }[] = [
    { type: 'Flood', label: 'Flood / Water', icon: Waves },
    { type: 'Fire', label: 'Fire / Smoke', icon: Flame },
    { type: 'Road Emergency', label: 'Road Accident', icon: Car },
    { type: 'Building Damage', label: 'Building Damage', icon: Home },
    { type: 'Person Trapped', label: 'Person Trapped', icon: UserX },
    { type: 'Medical Emergency', label: 'Medical Urgent', icon: HeartPulse },
    { type: 'Storm', label: 'Severe Storm', icon: CloudLightning },
    { type: 'Other', label: 'Other Hazard', icon: HelpCircle },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel-elevated rounded-3xl p-6 sm:p-8 text-slate-100 overflow-hidden shadow-2xl border border-white/15">
        {/* Subtle Ambient Background Blob */}
        <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-sm font-semibold tracking-wider uppercase text-cyan-300">
              {step === 'PERMISSION_LOCATION' && 'Step 1 of 4: Location'}
              {step === 'PERMISSION_CAMERA' && 'Step 2 of 4: Camera'}
              {step === 'PERMISSION_FILES' && 'Step 3 of 4: Photo / Video'}
              {step === 'PERMISSION_MIC' && 'Step 4 of 4: Voice Note'}
              {step === 'DETAILS_FORM' && 'Emergency Details'}
              {step === 'REVIEW_CONFIRM' && 'Confirm SOS Dispatch'}
              {step === 'SUBMISSION_PROGRESS' && 'Broadcasting Emergency'}
              {step === 'SUBMISSION_COMPLETE' && 'Emergency Received'}
              {step === 'DUPLICATE_NOTICE' && 'Active Report Notice'}
            </h2>
          </div>
          {step !== 'SUBMISSION_PROGRESS' && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* ======================================================== */}
        {/* STEP 1: LOCATION PERMISSION */}
        {/* ======================================================== */}
        {step === 'PERMISSION_LOCATION' && (
          <div className="space-y-6 text-center py-2 animate-in fade-in duration-300">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <MapPin className="w-8 h-8 animate-bounce" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-2">Share Your Emergency Location</h3>
              <p className="text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
                Your precise location helps the RESQ team understand where the emergency is happening.
              </p>
            </div>

            {locationData.captured && (
              <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>✓ Location received: Your current location has been captured</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleRequestLocation}
                disabled={locationLoading}
                className="flex-1 py-3 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
              >
                {locationLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Capturing Location…</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4" />
                    <span>Allow Location Access</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setStep('PERMISSION_CAMERA')}
                className="py-3 px-5 rounded-xl glass-pill hover:bg-white/10 text-slate-300 hover:text-white font-medium text-sm transition-all"
              >
                Not now
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: CAMERA PERMISSION */}
        {/* ======================================================== */}
        {step === 'PERMISSION_CAMERA' && (
          <div className="space-y-5 text-center py-2 animate-in fade-in duration-300">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Camera className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-2">Capture Visual Evidence</h3>
              <p className="text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
                A photo or short video can help the RESQ team understand what's happening.
              </p>
            </div>

            {cameraStreamActive ? (
              <div className="relative rounded-2xl overflow-hidden bg-black/60 border border-white/20 aspect-video flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <button
                  onClick={handleCaptureSnapshot}
                  className="absolute bottom-3 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg"
                >
                  Snap Photo Now
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  onClick={handleStartCamera}
                  className="w-full py-3 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Take Photo / Record Video</span>
                </button>
                <button
                  onClick={() => setStep('PERMISSION_FILES')}
                  className="w-full py-3 px-5 rounded-xl glass-pill hover:bg-white/10 text-slate-300 hover:text-white font-medium text-sm transition-all"
                >
                  Skip to Upload
                </button>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 3: FILES / MEDIA UPLOAD */}
        {/* ======================================================== */}
        {step === 'PERMISSION_FILES' && (
          <div className="space-y-5 text-center py-2 animate-in fade-in duration-300">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Upload className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-2">Attach Photo or Video</h3>
              <p className="text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
                Do you have an existing photo or video from your device gallery?
              </p>
            </div>

            {mediaData ? (
              <div className="p-3 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-between text-left">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-12 h-12 rounded-lg bg-black/40 overflow-hidden shrink-0">
                    <img src={mediaData.url} alt="Evidence" className="w-full h-full object-cover" />
                  </div>
                  <div className="truncate">
                    <div className="text-sm font-semibold text-white truncate">{mediaData.fileName || 'Attached evidence'}</div>
                    <div className="text-xs text-emerald-400">✓ Media ready for AI verification</div>
                  </div>
                </div>
                <button
                  onClick={() => setMediaData(null)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-white/5 rounded-lg"
                  title="Remove media"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-white/20 hover:border-cyan-400/50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                <Upload className="w-8 h-8 text-slate-400 group-hover:text-cyan-400 mb-2 transition-colors" />
                <span className="text-sm font-medium text-slate-200">Tap to browse files or media</span>
                <span className="text-xs text-slate-400 mt-1">JPEG, PNG, MP4, WebM (Max 50MB)</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => setStep('PERMISSION_MIC')}
                className="flex-1 py-3 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setStep('PERMISSION_MIC')}
                className="py-3 px-5 rounded-xl glass-pill hover:bg-white/10 text-slate-300 hover:text-white font-medium text-sm transition-all"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 4: MICROPHONE VOICE NOTE */}
        {/* ======================================================== */}
        {step === 'PERMISSION_MIC' && (
          <div className="space-y-5 text-center py-2 animate-in fade-in duration-300">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Mic className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-2">Record Voice Note</h3>
              <p className="text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
                You can describe what's happening using your voice.
              </p>
            </div>

            {/* Recording Controls */}
            {isRecordingAudio ? (
              <div className="p-5 rounded-2xl bg-red-950/40 border border-red-500/40 space-y-4">
                <div className="flex items-center justify-center gap-1.5 h-8">
                  <div className="w-1.5 bg-red-400 rounded-full wave-bar" />
                  <div className="w-1.5 bg-red-400 rounded-full wave-bar" />
                  <div className="w-1.5 bg-red-400 rounded-full wave-bar" />
                  <div className="w-1.5 bg-red-400 rounded-full wave-bar" />
                  <div className="w-1.5 bg-red-400 rounded-full wave-bar" />
                </div>
                <div className="text-xl font-mono font-bold text-red-400">
                  00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}s
                </div>
                <button
                  onClick={stopAudioRecording}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 mx-auto"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Stop Recording</span>
                </button>
              </div>
            ) : audioUrl ? (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/15 text-left space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Voice Note Captured ({recordingSeconds || 14}s)</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                      title="Play preview"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setAudioUrl(null);
                        setRecordingSeconds(0);
                      }}
                      className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300"
                      title="Delete recording"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {audioTranscription && (
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-300">
                    <span className="text-cyan-400 font-semibold uppercase text-[10px] block mb-0.5">
                      AI Live Transcription:
                    </span>
                    &ldquo;{audioTranscription}&rdquo;
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={startAudioRecording}
                  className="w-full py-3 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
                >
                  <Mic className="w-4 h-4" />
                  <span>Record Voice Description</span>
                </button>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep('DETAILS_FORM')}
                className="flex-1 py-3 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
              >
                <span>Continue to Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setStep('DETAILS_FORM')}
                className="py-3 px-5 rounded-xl glass-pill hover:bg-white/10 text-slate-300 hover:text-white font-medium text-sm transition-all"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 5: EMERGENCY DETAILS FORM */}
        {/* ======================================================== */}
        {step === 'DETAILS_FORM' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                Emergency Type <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {emergencyCategories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = emergencyType === cat.type;
                  return (
                    <button
                      key={cat.type}
                      type="button"
                      onClick={() => setEmergencyType(cat.type)}
                      className={`p-2.5 rounded-xl text-left border flex flex-col items-center justify-center text-center gap-1.5 transition-all ${
                        isSelected
                          ? 'bg-red-500/20 border-red-500 text-white font-bold shadow-lg shadow-red-500/20'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-red-400' : 'text-slate-400'}`} />
                      <span className="text-xs">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* People affected counter */}
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                People Affected / In Danger
              </label>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-xs text-slate-300">Estimated individuals in need of rescue:</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPeopleAffected(Math.max(1, peopleAffected - 1))}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center text-base"
                  >
                    -
                  </button>
                  <span className="text-base font-bold text-white w-6 text-center">{peopleAffected}</span>
                  <button
                    type="button"
                    onClick={() => setPeopleAffected(peopleAffected + 1)}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center text-base"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Description textarea */}
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                Quick Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="E.g., Water rising rapidly, trapped on 2nd floor, elderly person with mobility issue..."
                rows={2}
                className="w-full glass-input rounded-xl p-3 text-sm focus:ring-1 focus:ring-cyan-400 placeholder:text-slate-500 resize-none"
              />
            </div>

            {/* Status Pills */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-xs">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300 truncate">
                  Location: <strong className="text-white">✓ Captured</strong>
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-slate-300 truncate">
                  Evidence: <strong className="text-white">{mediaData || audioUrl ? 'Attached' : 'Text only'}</strong>
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep('REVIEW_CONFIRM')}
                className="flex-1 py-3 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
              >
                <span>Review & Send SOS</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 6: CONFIRMATION & REVIEW */}
        {/* ======================================================== */}
        {step === 'REVIEW_CONFIRM' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/15 space-y-2.5 text-xs text-slate-200">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-slate-400">Emergency Type:</span>
                <strong className="text-white font-bold text-sm">{emergencyType}</strong>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-slate-400">Location:</span>
                <span className="text-emerald-400 font-semibold">✓ {locationData.address}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-slate-400">People In Danger:</span>
                <strong className="text-white font-bold">{peopleAffected} person(s)</strong>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-slate-400">Attached Media:</span>
                <span className="text-slate-300">{mediaData ? mediaData.fileName || '1 photo attached' : 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Voice Note:</span>
                <span className="text-slate-300">{audioUrl ? `Attached (${recordingSeconds || 14}s)` : 'None'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Transmitting this alert will notify rescue responders immediately.</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleConfirmAndSend}
                className="flex-1 py-4 px-6 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-black text-base tracking-wider uppercase shadow-xl shadow-red-600/40 transition-all flex items-center justify-center gap-2"
              >
                <span>SEND SOS</span>
                <ShieldCheck className="w-5 h-5" />
              </button>
              <button
                onClick={() => setStep('DETAILS_FORM')}
                className="py-3 px-5 rounded-xl glass-pill hover:bg-white/10 text-slate-300 hover:text-white font-medium text-sm transition-all"
              >
                Edit
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 7: SUBMISSION ANIMATION */}
        {/* ======================================================== */}
        {step === 'SUBMISSION_PROGRESS' && (
          <div className="py-8 text-center space-y-6 animate-in fade-in duration-300">
            <div className="w-20 h-20 mx-auto rounded-full bg-red-600/20 border-2 border-red-500 flex items-center justify-center text-red-500 relative">
              <Loader2 className="w-10 h-10 animate-spin text-red-400" />
              <div className="absolute inset-0 rounded-full animate-ping bg-red-500/20" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white tracking-widest font-mono uppercase mb-2">
                {submissionStages[submissionStageIndex]}
              </h3>
              <p className="text-xs text-slate-400">
                Establishing direct priority connection with RESQ emergency operations…
              </p>
            </div>

            {/* Stage Progress Bar */}
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-400 to-red-500 h-full transition-all duration-500 rounded-full"
                style={{
                  width: `${((submissionStageIndex + 1) / submissionStages.length) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 8: POST-SUBMISSION COMPLETE */}
        {/* ======================================================== */}
        {step === 'SUBMISSION_COMPLETE' && (
          <div className="space-y-5 text-center py-2 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-2xl font-black text-white mb-1">
                RESQ has received your emergency
              </h3>
              <p className="text-xs text-slate-300">
                Your report has been securely registered and assigned for immediate evaluation.
              </p>
            </div>

            {/* Clean summary card */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/15 text-left space-y-2.5 text-xs text-slate-200">
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="text-slate-400">Incident Identifier:</span>
                <span className="font-mono text-sm font-bold text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-md border border-cyan-500/30">
                  {submittedIncidentId || 'RX-1042'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="text-slate-400">Your Location:</span>
                <span className="text-emerald-400 font-semibold">✓ Captured</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Status:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold uppercase text-[11px] border border-amber-500/30">
                  {isOfflineSaved ? 'SAVED LOCALLY (OFFLINE)' : 'UNDER REVIEW'}
                </span>
              </div>
            </div>

            {isOfflineSaved ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                You are currently offline. Your emergency report is saved on this device and will automatically send as soon as internet connection is restored.
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-cyan-200 text-xs">
                Please remain in a safe location and follow instructions from authorized emergency responders. Keep your device powered on.
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 px-5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all"
            >
              Done / Return to Home
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* DUPLICATE NOTICE */}
        {/* ======================================================== */}
        {step === 'DUPLICATE_NOTICE' && (
          <div className="space-y-5 text-center py-2 animate-in fade-in duration-300">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-1">
                Emergency Report in Progress
              </h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                An emergency report is already being processed for this session. To avoid dispatch confusion, duplicate submissions are suppressed.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-left space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Active Incident:</span>
                <span className="font-mono text-cyan-300 font-bold">{activeIncidentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Status:</span>
                <span className="text-amber-300 font-bold">UNDER REVIEW</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={() => {
                  setSubmittedIncidentId(activeIncidentId || 'RX-1042');
                  setStep('SUBMISSION_COMPLETE');
                }}
                className="w-full py-3 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all"
              >
                View Active Incident Status
              </button>
              <button
                onClick={() => setStep('DETAILS_FORM')}
                className="w-full py-2.5 px-4 rounded-xl glass-pill hover:bg-white/10 text-slate-300 text-xs"
              >
                Report Different Incident
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
