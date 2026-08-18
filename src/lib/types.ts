// =======================================================
// RESQ SYSTEM - TYPES & DATA MODELS
// =======================================================

export type EmergencyType =
  | 'Flood'
  | 'Fire'
  | 'Road Emergency'
  | 'Building Damage'
  | 'Person Trapped'
  | 'Medical Emergency'
  | 'Storm'
  | 'Other';

export type PriorityLevel = 'P1' | 'P2' | 'P3';

export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';

export type IncidentStatus =
  | 'NEW'
  | 'AI ANALYZING'
  | 'CRITICAL'
  | 'ACKNOWLEDGED'
  | 'ASSIGNED'
  | 'IN PROGRESS'
  | 'RESOLVED'
  | 'CLOSED';

export type NotificationChannel = 'VOICE' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'WEB';

export type NotificationStatus = 'SENT' | 'DELIVERED' | 'FAILED' | 'PENDING' | 'RETRYING';

export type TeamStatus = 'Available' | 'On Response' | 'Offline';

export interface IncidentMedia {
  id: string;
  type: 'image' | 'video';
  url: string; // Base64 data URL or remote path
  capturedAt: string;
  fileName?: string;
}

export interface VoiceNote {
  id: string;
  audioUrl: string; // Base64 audio or blob URL
  durationSeconds: number;
  transcription?: string;
  transcriptionConfidence?: number;
  recordedAt: string;
}

export interface RiskSubScores {
  floodRisk: number; // 0-100
  roadAccessibility: number; // 0-100 (higher = more impassable/danger)
  areaDamage: number; // 0-100
  populationExposure: number; // 0-100
  weatherSeverity: number; // 0-100
}

export interface RiskPrediction {
  riskScore: number; // 0-100
  riskLevel: RiskLevel;
  priority: PriorityLevel;
  subScores: RiskSubScores;
  incidentSummary: string;
  warnings: string[];
  recommendations: string[];
  affectedArea: string;
  signalBreakdown: {
    weatherContribution: number;
    citizenReportContribution: number;
    evidenceContribution: number;
    areaContextContribution: number;
  };
  calculatedAt: string;
}

export interface Incident {
  id: string; // e.g. "RX-1042"
  citizenId: string;
  type: EmergencyType;
  description: string;
  peopleAffected: number;
  latitude: number;
  longitude: number;
  accuracy?: number; // meters
  address: string; // Reverse-geocoded area name e.g. "North District - Block 4"
  priority: PriorityLevel;
  riskScore: number;
  riskLevel: RiskLevel;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
  media?: IncidentMedia[];
  voiceNote?: VoiceNote;
  aiAnalysis?: RiskPrediction;
  assignedTeam?: string; // Team ID or name
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  isSimulated?: boolean;
}

export interface ResponseTeam {
  id: string;
  name: string;
  specialty: 'Search & Rescue' | 'Flood & Marine' | 'Hazmat & Fire' | 'Medical' | 'Drone Recon';
  status: TeamStatus;
  personnelCount: number;
  assignedIncidentId?: string;
  latitude: number;
  longitude: number;
  vehicleType: string;
  callSign: string;
}

export interface Shelter {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number;
  currentOccupancy: number;
  status: 'Open' | 'Near Capacity' | 'Full' | 'Closed';
  suppliesLevel: 'High' | 'Adequate' | 'Critical';
}

export interface NotificationLog {
  id: string;
  incidentId: string;
  channel: NotificationChannel;
  recipient: string;
  status: NotificationStatus;
  providerReference: string;
  timestamp: string;
  messagePreview: string;
  error?: string;
  retryCount: number;
  isSimulated: boolean;
}

export interface AuditLog {
  id: string;
  incidentId?: string;
  actor: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface HourlyForecast {
  timeLabel: string; // "Now", "+1h", "+3h", etc.
  tempC: number;
  rainProb: number;
  windKmh: number;
  condition: 'Rain' | 'Heavy Rain' | 'Storm' | 'Cloudy' | 'Windy' | 'Clear';
}

export interface WeatherSnapshot {
  condition: string;
  temperatureC: number;
  rainProbability: number;
  rainfallMm: number;
  windSpeedKmh: number;
  humidityPercent: number;
  hourlyForecast: HourlyForecast[];
  isSimulated: boolean;
  updatedAt: string;
}

export interface SystemServiceStatus {
  aiEngine: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  weatherFeed: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  realtimeStream: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  notifications: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  database: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  mode: 'demo' | 'live';
  lastPing: string;
}

export interface WhatIfParams {
  rainfallMm: number; // 0 - 200 mm/h
  affectedRadiusKm: number; // 0.5 - 25 km
  roadBlockagePercent: number; // 0 - 100%
  populationDensity: 'Low' | 'Medium' | 'High' | 'Dense Urban';
}

export interface WhatIfResult {
  simulatedRiskScore: number;
  simulatedRiskLevel: RiskLevel;
  exposedPopulationEstimate: number;
  shelterPressurePercent: number;
  criticalRoadsCut: number;
  recommendedEvacuationZones: string[];
}

export interface CitizenSOSDraft {
  localDraftId: string;
  type: EmergencyType;
  description: string;
  peopleAffected: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  address: string;
  mediaBase64?: string;
  mediaType?: 'image' | 'video';
  voiceBase64?: string;
  voiceDuration?: number;
  createdAt: string;
  synced: boolean;
}
