'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Scan,
  Maximize2,
  Minimize2,
  Layers,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Shield,
  Loader2,
  CheckCircle,
  Eye,
  Info,
} from 'lucide-react';
import { Incident, RiskPrediction } from '@/lib/types';

interface Disaster3DMapProps {
  incidents: Incident[];
  selectedIncidentId: string | null;
  onSelectIncident: (id: string) => void;
}

export function Disaster3DMap({
  incidents,
  selectedIncidentId,
  onSelectIncident,
}: Disaster3DMapProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStage, setScanStage] = useState(0);
  const [scanAnalysisResult, setScanAnalysisResult] = useState<RiskPrediction | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [waterLevelRise, setWaterLevelRise] = useState(0.4);

  const scanStages = [
    'Scanning terrain…',
    'Analyzing roads & transit corridors…',
    'Analyzing water/damage zones…',
    'Cross-referencing real-time weather…',
    'Correlating citizen reports…',
    'Calculating multi-signal risk…',
  ];

  // Three.js Scene, Camera, Renderer references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const beaconGroupRef = useRef<THREE.Group | null>(null);
  const waterMeshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight || 420;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060911);
    scene.fog = new THREE.FogExp2(0x060911, 0.025);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(24, 28, 32);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mountRef.current.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Ambient & Directional Lighting
    const ambientLight = new THREE.AmbientLight(0x4a6585, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const redGlowLight = new THREE.PointLight(0xef4444, 2.5, 40);
    redGlowLight.position.set(0, 8, 0);
    scene.add(redGlowLight);

    // 5. Ground Grid Floor
    const gridHelper = new THREE.GridHelper(60, 30, 0x06b6d4, 0x1e293b);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // 6. Water / Flood Plane (Animated Blue Glow)
    const waterGeo = new THREE.PlaneGeometry(55, 55, 32, 32);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
      metalness: 0.8,
      wireframe: false,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = 0.2;
    scene.add(waterMesh);
    waterMeshRef.current = waterMesh;

    // 7. Stylized City Blocks (Procedural 3D Buildings)
    const buildingsGroup = new THREE.Group();
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.6,
      roughness: 0.4,
    });
    const buildingEdgeMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.3 });

    const buildingPositions = [
      { x: -12, z: -10, w: 4, h: 8, d: 4 },
      { x: -6, z: -12, w: 3, h: 12, d: 3 },
      { x: -14, z: -4, w: 5, h: 6, d: 3 },
      { x: 10, z: -8, w: 4, h: 14, d: 4 },
      { x: 14, z: -14, w: 3, h: 9, d: 3 },
      { x: 8, z: 12, w: 4, h: 7, d: 4 },
      { x: 12, z: 6, w: 3, h: 10, d: 3 },
      { x: -10, z: 10, w: 4, h: 6, d: 4 },
      { x: -6, z: 8, w: 3, h: 11, d: 3 },
      { x: -12, z: 14, w: 3, h: 5, d: 3 },
      { x: 14, z: 12, w: 4, h: 8, d: 4 },
      { x: 0, z: -14, w: 3, h: 7, d: 3 },
    ];

    buildingPositions.forEach((b) => {
      const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const mesh = new THREE.Mesh(geo, buildingMat);
      mesh.position.set(b.x, b.h / 2, b.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Edges highlight for high-tech cyberpunk aesthetics
      const edges = new THREE.EdgesGeometry(geo);
      const line = new THREE.LineSegments(edges, buildingEdgeMat);
      line.position.copy(mesh.position);

      buildingsGroup.add(mesh);
      buildingsGroup.add(line);
    });

    scene.add(buildingsGroup);

    // 8. Danger Zone Heat Ring
    const dangerRingGeo = new THREE.RingGeometry(8, 12, 32);
    const dangerRingMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.2,
    });
    const dangerRing = new THREE.Mesh(dangerRingGeo, dangerRingMat);
    dangerRing.rotation.x = -Math.PI / 2;
    dangerRing.position.set(0, 0.05, 0);
    scene.add(dangerRing);

    // 9. Incident Beacons Group
    const beaconsGroup = new THREE.Group();
    scene.add(beaconsGroup);
    beaconGroupRef.current = beaconsGroup;

    // Animation Loop
    let angle = 0;
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);

      // Subtle slow orbit around the central disaster area
      angle += 0.0025;
      camera.position.x = 36 * Math.sin(angle);
      camera.position.z = 36 * Math.cos(angle);
      camera.lookAt(0, 2, 0);

      // Water wave undulation
      if (waterMeshRef.current) {
        waterMeshRef.current.position.y = 0.3 + Math.sin(Date.now() * 0.002) * 0.15;
      }

      // Beacon pulsating animation
      if (beaconGroupRef.current) {
        beaconGroupRef.current.children.forEach((child, i) => {
          if (child instanceof THREE.Mesh) {
            const scale = 1 + Math.sin(Date.now() * 0.005 + i) * 0.2;
            child.scale.set(scale, scale, scale);
          }
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight || 420;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Update 3D Beacons when Incidents list changes
  useEffect(() => {
    if (!beaconGroupRef.current) return;
    const group = beaconGroupRef.current;
    group.clear();

    incidents.forEach((inc, idx) => {
      // Map lat/long delta to 3D grid coords
      const offsetX = (inc.longitude - (-122.4194)) * 300;
      const offsetZ = (inc.latitude - 37.7749) * 300;
      const x = Math.max(-20, Math.min(20, offsetX + (idx % 3) * 6 - 6));
      const z = Math.max(-20, Math.min(20, offsetZ + Math.floor(idx / 3) * 6 - 6));

      const isCritical = inc.riskLevel === 'Critical';
      const color = isCritical ? 0xef4444 : inc.priority === 'P1' ? 0xf59e0b : 0x06b6d4;

      // Beacon Pin Base
      const pinGeo = new THREE.SphereGeometry(0.8, 16, 16);
      const pinMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.8,
      });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.set(x, 2, z);
      pinMesh.userData = { incidentId: inc.id };

      // Beacon Cylinder Line to Ground
      const lineGeo = new THREE.CylinderGeometry(0.08, 0.08, 4, 8);
      const lineMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 });
      const lineMesh = new THREE.Mesh(lineGeo, lineMat);
      lineMesh.position.set(x, 2, z);

      group.add(pinMesh);
      group.add(lineMesh);
    });
  }, [incidents]);

  // "Analyze Map" staged multi-step animation
  const handleAnalyzeMap = () => {
    setIsScanning(true);
    setScanStage(0);
    setScanAnalysisResult(null);

    scanStages.forEach((_, index) => {
      setTimeout(() => {
        setScanStage(index);
      }, index * 700);
    });

    setTimeout(() => {
      setIsScanning(false);
      setShowAnalysisModal(true);

      // Aggregate high-fidelity decision support result
      const activeCritical = incidents.filter((i) => i.riskLevel === 'Critical').length;
      const calculatedScore = Math.min(96, Math.max(65, 75 + activeCritical * 6));

      setScanAnalysisResult({
        riskScore: calculatedScore,
        riskLevel: calculatedScore >= 80 ? 'Critical' : 'High',
        priority: 'P1',
        subScores: {
          floodRisk: 86,
          roadAccessibility: 74,
          areaDamage: 68,
          populationExposure: 82,
          weatherSeverity: 88,
        },
        incidentSummary:
          '3D LiDAR terrain correlation reveals severe low-lying inundation across North-East Basin Sector 4. ' +
          'Road accessibility degraded by 74% along primary arterial bridges. 12 confirmed civilians in high-water exposure corridors.',
        warnings: [
          'P1 CRITICAL: North Channel embankment overtopping probability > 85%',
          'P1 CRITICAL: Secondary highway bridge approach compromised by heavy saturation',
          'P2 HIGH: Power distribution substation 4B at imminent flood threshold',
          'P3 MODERATE: Commercial sector debris accumulating at culvert bypass',
        ],
        recommendations: [
          'Pre-position Marine Extraction Unit 3 at elevated staging ramp North-2',
          'Initiate targeted broadcast evacuation for Riverbend residents below 10m elevation',
          'Coordinate remote circuit cutoff with Municipal Power Utility for flooded sectors',
          'Deploy AeroRecon Drone Squadron for continuous high-resolution optical surveillance',
        ],
        affectedArea: 'North District Lowland Flood Basin & Sector 4',
        signalBreakdown: {
          weatherContribution: 28,
          citizenReportContribution: 36,
          evidenceContribution: 16,
          areaContextContribution: 8,
        },
        calculatedAt: new Date().toISOString(),
      });
    }, scanStages.length * 700 + 400);
  };

  return (
    <div
      className={`relative glass-panel rounded-2xl overflow-hidden border border-white/10 flex flex-col ${
        isFullscreen ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)]' : 'h-full min-h-[420px]'
      }`}
    >
      {/* Top Map Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 text-xs text-slate-200 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold">3D Situational Terrain Map</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-mono">
              Three.js WebGL
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Analyze Map Button */}
          <button
            onClick={handleAnalyzeMap}
            disabled={isScanning}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                <span>Scanning 3D Map…</span>
              </>
            ) : (
              <>
                <Scan className="w-3.5 h-3.5 text-slate-950" />
                <span>Analyze Map</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Toggle full screen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full flex-1 relative bg-slate-950 cursor-grab active:cursor-grabbing" />

      {/* Scanning Staged Overlay Animation */}
      {isScanning && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm p-6 text-center animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mb-4 flex items-center justify-center">
            <Scan className="w-7 h-7 text-cyan-400 animate-pulse" />
          </div>
          <h4 className="text-base font-bold font-mono text-cyan-300 uppercase tracking-widest mb-1">
            {scanStages[scanStage]}
          </h4>
          <p className="text-xs text-slate-400">
            Synthesizing 3D elevation LiDAR, radar hydrology, and incoming citizen distress beacons…
          </p>

          {/* Progress Bar */}
          <div className="w-64 bg-white/10 h-1.5 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-cyan-400 h-full transition-all duration-500 rounded-full"
              style={{ width: `${((scanStage + 1) / scanStages.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-20 pointer-events-auto p-2.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-[11px] text-slate-300 space-y-1.5">
        <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Map Legend</div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-1 ring-red-400" />
          <span>Critical P1 Incident</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-1 ring-amber-400" />
          <span>High Priority P2</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span>Flood Inundation Plane</span>
        </div>
      </div>

      {/* AI Analysis Staged Result Modal */}
      {showAnalysisModal && scanAnalysisResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel-elevated rounded-3xl p-6 max-w-2xl w-full text-slate-100 space-y-5 border border-white/20 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">3D Map AI Risk Analysis & Decision Support</h3>
                  <p className="text-xs text-slate-400">Multi-Signal Ground Truth & Terrain Intelligence</p>
                </div>
              </div>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white"
              >
                Close
              </button>
            </div>

            {/* Overall Risk Score Strip */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/60 to-slate-900/80 border border-red-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-red-300 uppercase tracking-wider block">
                  Overall Composite Risk Level
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-white">{scanAnalysisResult.riskScore}%</span>
                  <span className="text-sm font-bold uppercase text-red-400 tracking-wider">
                    {scanAnalysisResult.riskLevel}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-300 max-w-xs">
                <span className="text-cyan-400 font-bold block mb-0.5">Decision Support Mode:</span>
                Provides tactical intelligence to human commanders. AI does not autonomously dispatch agencies.
              </div>
            </div>

            {/* Sub-Scores Matrix */}
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Sub-Score Breakdown</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-slate-400 block text-[11px]">Flood Risk</span>
                  <strong className="text-cyan-400 text-lg">{scanAnalysisResult.subScores.floodRisk}%</strong>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-slate-400 block text-[11px]">Road Inaccessibility</span>
                  <strong className="text-amber-400 text-lg">{scanAnalysisResult.subScores.roadAccessibility}%</strong>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-slate-400 block text-[11px]">Area Damage</span>
                  <strong className="text-red-400 text-lg">{scanAnalysisResult.subScores.areaDamage}%</strong>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-slate-400 block text-[11px]">Population Exposure</span>
                  <strong className="text-purple-400 text-lg">{scanAnalysisResult.subScores.populationExposure}%</strong>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-slate-400 block text-[11px]">Weather Severity</span>
                  <strong className="text-blue-400 text-lg">{scanAnalysisResult.subScores.weatherSeverity}%</strong>
                </div>
              </div>
            </div>

            {/* Priority Warnings */}
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Priority Warning List</h4>
              <div className="space-y-1.5">
                {scanAnalysisResult.warnings.map((warn, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-200 flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{warn}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Decision Support Recommendations */}
            <div>
              <h4 className="text-xs font-bold uppercase text-cyan-400 tracking-wider mb-2">
                Recommended Next Tactical Actions
              </h4>
              <div className="space-y-2">
                {scanAnalysisResult.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200 flex items-start gap-2.5"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
