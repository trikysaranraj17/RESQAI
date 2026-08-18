import { Incident, ResponseTeam, Shelter, NotificationLog, AuditLog, WeatherSnapshot } from './types';
import { RiskEngine } from './riskEngine';

class DatabaseStore {
  private incidents: Map<string, Incident> = new Map();
  private teams: Map<string, ResponseTeam> = new Map();
  private shelters: Map<string, Shelter> = new Map();
  private notificationLogs: NotificationLog[] = [];
  private auditLogs: AuditLog[] = [];
  private lastIncidentCounter = 1045;

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // 1. Response Teams Seed
    const initialTeams: ResponseTeam[] = [
      {
        id: 'TEAM-ALPHA',
        name: 'Alpha Search & Rescue',
        specialty: 'Search & Rescue',
        status: 'On Response',
        personnelCount: 8,
        assignedIncidentId: 'RX-1042',
        latitude: 37.7749,
        longitude: -122.4194,
        vehicleType: 'Heavy All-Terrain Amphibious',
        callSign: 'ALPHA-LEAD',
      },
      {
        id: 'TEAM-MARINE-3',
        name: 'Marine Unit 3',
        specialty: 'Flood & Marine',
        status: 'Available',
        personnelCount: 6,
        latitude: 37.7810,
        longitude: -122.4080,
        vehicleType: 'Zodiac Rescue Rib & Jet Boats',
        callSign: 'MARINE-3',
      },
      {
        id: 'TEAM-BRAVO-FIRE',
        name: 'Bravo Hazmat & Fire',
        specialty: 'Hazmat & Fire',
        status: 'On Response',
        personnelCount: 12,
        assignedIncidentId: 'RX-1043',
        latitude: 37.7650,
        longitude: -122.4300,
        vehicleType: 'Type-1 Structural Engine & Foam Tender',
        callSign: 'BRAVO-ENGINE',
      },
      {
        id: 'TEAM-MED-RAPID',
        name: 'Rapid Paramedic Unit 1',
        specialty: 'Medical',
        status: 'Available',
        personnelCount: 4,
        latitude: 37.7890,
        longitude: -122.4010,
        vehicleType: 'Mobile Intensive Care Ambulance',
        callSign: 'MEDIC-ONE',
      },
      {
        id: 'TEAM-DRONE-RECON',
        name: 'AeroRecon Drone Squadron',
        specialty: 'Drone Recon',
        status: 'Available',
        personnelCount: 3,
        latitude: 37.7700,
        longitude: -122.4150,
        vehicleType: 'Mobile Comms & UAV Command Van',
        callSign: 'SKY-EYE-4',
      },
    ];

    initialTeams.forEach((team) => this.teams.set(team.id, team));

    // 2. Shelters Seed
    const initialShelters: Shelter[] = [
      {
        id: 'SHELTER-01',
        name: 'North Central Civic Arena',
        address: '1000 Gateway Blvd, North District',
        latitude: 37.7850,
        longitude: -122.4100,
        capacity: 450,
        currentOccupancy: 185,
        status: 'Open',
        suppliesLevel: 'High',
      },
      {
        id: 'SHELTER-02',
        name: 'St. Jude High School Gymnasium',
        address: '450 Valley Ridge Road, East Sector',
        latitude: 37.7680,
        longitude: -122.4350,
        capacity: 250,
        currentOccupancy: 210,
        status: 'Near Capacity',
        suppliesLevel: 'Adequate',
      },
      {
        id: 'SHELTER-03',
        name: 'Harbor Community Center',
        address: '12 Marina Promenade, South Pier',
        latitude: 37.7550,
        longitude: -122.3900,
        capacity: 300,
        currentOccupancy: 45,
        status: 'Open',
        suppliesLevel: 'High',
      },
    ];

    initialShelters.forEach((shelter) => this.shelters.set(shelter.id, shelter));

    // 3. Incidents Seed
    const now = new Date();
    const minAgo = (m: number) => new Date(now.getTime() - m * 60 * 1000).toISOString();

    const sampleIncidents: Incident[] = [
      {
        id: 'RX-1042',
        citizenId: 'CITIZEN-981',
        type: 'Flood',
        description: 'Flash flood water surging through ground floor apartments. 4 people trapped on roof terrace including an elderly resident.',
        peopleAffected: 4,
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 6.2,
        address: 'Riverside Sector 4, North District',
        priority: 'P1',
        riskScore: 88,
        riskLevel: 'Critical',
        status: 'ASSIGNED',
        assignedTeam: 'Alpha Search & Rescue',
        createdAt: minAgo(14),
        updatedAt: minAgo(5),
        media: [
          {
            id: 'MED-1042-1',
            type: 'image',
            url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80',
            fileName: 'flood_water_street.jpg',
            capturedAt: minAgo(14),
          }
        ],
        voiceNote: {
          id: 'VN-1042-1',
          audioUrl: '',
          durationSeconds: 14,
          transcription: 'Water is up to the second floor stairs already! We need boats or extraction immediately, power has cut out.',
          transcriptionConfidence: 0.94,
          recordedAt: minAgo(14),
        },
        aiAnalysis: {
          riskScore: 88,
          riskLevel: 'Critical',
          priority: 'P1',
          subScores: {
            floodRisk: 92,
            roadAccessibility: 78,
            areaDamage: 85,
            populationExposure: 82,
            weatherSeverity: 90,
          },
          incidentSummary: 'AI analysis correlates severe flash flood at Riverside Sector 4 with 4 trapped individuals. High risk of electrical grounding & building entrapment. Marine extraction recommended.',
          warnings: [
            'CRITICAL DANGER: Rising water level exceeds 1.8m in low ground.',
            'Access road blocked by debris 300m West.'
          ],
          recommendations: [
            'Deploy Alpha Search & Rescue amphibious team immediately.',
            'Coordinate with power utility to isolate local transformer grid.',
            'Prepare North Central Civic Shelter for incoming evacuees.'
          ],
          affectedArea: 'Riverside Sector 4, North District',
          signalBreakdown: {
            weatherContribution: 28,
            citizenReportContribution: 38,
            evidenceContribution: 15,
            areaContextContribution: 7,
          },
          calculatedAt: minAgo(13),
        }
      },
      {
        id: 'RX-1043',
        citizenId: 'CITIZEN-982',
        type: 'Fire',
        description: 'Transformer explosion sparked structural fire in commercial warehouse near fuel storage depot.',
        peopleAffected: 2,
        latitude: 37.7650,
        longitude: -122.4300,
        accuracy: 9.5,
        address: 'Industrial Park South, Warehouse 7B',
        priority: 'P1',
        riskScore: 84,
        riskLevel: 'Critical',
        status: 'IN PROGRESS',
        assignedTeam: 'Bravo Hazmat & Fire',
        createdAt: minAgo(28),
        updatedAt: minAgo(10),
        media: [
          {
            id: 'MED-1043-1',
            type: 'image',
            url: 'https://images.unsplash.com/photo-1542385151-efd9000785a0?auto=format&fit=crop&w=800&q=80',
            fileName: 'industrial_smoke_hazard.jpg',
            capturedAt: minAgo(28),
          }
        ],
        aiAnalysis: {
          riskScore: 84,
          riskLevel: 'Critical',
          priority: 'P1',
          subScores: {
            floodRisk: 10,
            roadAccessibility: 65,
            areaDamage: 90,
            populationExposure: 70,
            weatherSeverity: 60,
          },
          incidentSummary: 'AI correlates active transformer fire with proximity to secondary hazardous fuel tanks. Structural perimeter containment required.',
          warnings: [
            'Thermal radiation hazard within 150m perimeter.',
            'Toxic smoke plume drifting toward East Residential Ward.'
          ],
          recommendations: [
            'Deploy Bravo Hazmat & Fire with Class-B chemical suppression foam.',
            'Evacuate downwind residential sectors 12 and 14.'
          ],
          affectedArea: 'Industrial Park South, Warehouse 7B',
          signalBreakdown: {
            weatherContribution: 18,
            citizenReportContribution: 42,
            evidenceContribution: 15,
            areaContextContribution: 9,
          },
          calculatedAt: minAgo(27),
        }
      },
      {
        id: 'RX-1044',
        citizenId: 'CITIZEN-983',
        type: 'Building Damage',
        description: 'Retaining wall cracked and leaning heavily toward roadway following mudslide saturation.',
        peopleAffected: 1,
        latitude: 37.7810,
        longitude: -122.4080,
        accuracy: 5.0,
        address: 'Pine Crest Ridge, Upper Valley',
        priority: 'P2',
        riskScore: 64,
        riskLevel: 'High',
        status: 'ACKNOWLEDGED',
        createdAt: minAgo(45),
        updatedAt: minAgo(20),
        aiAnalysis: {
          riskScore: 64,
          riskLevel: 'High',
          priority: 'P2',
          subScores: {
            floodRisk: 45,
            roadAccessibility: 70,
            areaDamage: 60,
            populationExposure: 40,
            weatherSeverity: 75,
          },
          incidentSummary: 'Slope instability threatens two-lane arterial roadway. No immediate structural collapse of occupied dwellings detected.',
          warnings: ['Roadway partially obstructed; single lane passable with caution.'],
          recommendations: [
            'Deploy public works barrier team to close northbound lane.',
            'Maintain continuous seismic/tilt monitoring.'
          ],
          affectedArea: 'Pine Crest Ridge, Upper Valley',
          signalBreakdown: {
            weatherContribution: 22,
            citizenReportContribution: 28,
            evidenceContribution: 8,
            areaContextContribution: 6,
          },
          calculatedAt: minAgo(44),
        }
      },
      {
        id: 'RX-1045',
        citizenId: 'CITIZEN-984',
        type: 'Road Emergency',
        description: 'Downed high-voltage utility poles blocking major intersection. Power sparking across wet asphalt.',
        peopleAffected: 0,
        latitude: 37.7710,
        longitude: -122.4220,
        accuracy: 4.1,
        address: 'Market Street & 8th Intersection',
        priority: 'P2',
        riskScore: 58,
        riskLevel: 'High',
        status: 'NEW',
        createdAt: minAgo(3),
        updatedAt: minAgo(3),
        aiAnalysis: {
          riskScore: 58,
          riskLevel: 'High',
          priority: 'P2',
          subScores: {
            floodRisk: 30,
            roadAccessibility: 85,
            areaDamage: 50,
            populationExposure: 45,
            weatherSeverity: 80,
          },
          incidentSummary: 'Electrification hazard on wet pavement. Major transit artery blocked.',
          warnings: ['Active electrical arc hazard on wet roadway.'],
          recommendations: [
            'Alert grid operator for emergency substation circuit cut.',
            'Deploy traffic reroute units.'
          ],
          affectedArea: 'Market Street & 8th Intersection',
          signalBreakdown: {
            weatherContribution: 20,
            citizenReportContribution: 26,
            evidenceContribution: 6,
            areaContextContribution: 6,
          },
          calculatedAt: minAgo(2),
        }
      }
    ];

    sampleIncidents.forEach((inc) => this.incidents.set(inc.id, inc));

    // 4. Initial Audit Logs
    this.auditLogs = [
      {
        id: 'AUD-01',
        incidentId: 'RX-1042',
        actor: 'Citizen #981',
        action: 'EMERGENCY_REPORTED',
        details: 'SOS submitted with GPS accuracy ±6.2m and photographic proof.',
        timestamp: minAgo(14),
      },
      {
        id: 'AUD-02',
        incidentId: 'RX-1042',
        actor: 'AI Risk Engine',
        action: 'AI_CRITICAL_FLAG',
        details: 'Evaluated multi-signal risk at 88/100 (CRITICAL). Triggered dispatch protocol.',
        timestamp: minAgo(13),
      },
      {
        id: 'AUD-03',
        incidentId: 'RX-1042',
        actor: 'Dispatcher Ops',
        action: 'TEAM_ASSIGNED',
        details: 'Assigned Alpha Search & Rescue team to incident.',
        timestamp: minAgo(5),
      },
      {
        id: 'AUD-04',
        incidentId: 'RX-1043',
        actor: 'AI Risk Engine',
        action: 'AI_CRITICAL_FLAG',
        details: 'Evaluated risk at 84/100 (CRITICAL). Dispatched Bravo Hazmat & Fire.',
        timestamp: minAgo(27),
      },
      {
        id: 'AUD-05',
        actor: 'System Operator',
        action: 'OPERATOR_LOGIN',
        details: 'Secure session established on Control Center terminal.',
        timestamp: minAgo(60),
      }
    ];

    // 5. Initial Notifications Logs
    this.notificationLogs = [
      {
        id: 'NOTIF-SEED-1',
        incidentId: 'RX-1042',
        channel: 'VOICE',
        recipient: '+1-800-555-RESQ',
        status: 'DELIVERED',
        providerReference: 'SIMULATED-TWILIO-VOICE-SEED1',
        timestamp: minAgo(13),
        messagePreview: 'There is an emergency in Riverside Sector 4, North District. Please send the RESQ team immediately.',
        retryCount: 0,
        isSimulated: true,
      },
      {
        id: 'NOTIF-SEED-2',
        incidentId: 'RX-1042',
        channel: 'EMAIL',
        recipient: 'emergency-dispatch@resq.gov.internal',
        status: 'DELIVERED',
        providerReference: 'SIMULATED-SG-SEED2',
        timestamp: minAgo(13),
        messagePreview: 'RESQ Critical Emergency Alert — RX-1042 [P1] | Flash flood surging through apartments...',
        retryCount: 0,
        isSimulated: true,
      },
      {
        id: 'NOTIF-SEED-3',
        incidentId: 'RX-1042',
        channel: 'SMS',
        recipient: '+1-800-555-RESQ',
        status: 'DELIVERED',
        providerReference: 'SIMULATED-SNS-SEED3',
        timestamp: minAgo(13),
        messagePreview: 'RESQ CRITICAL ALERT — Emergency reported at Riverside Sector 4. Incident RX-1042. Priority: P1.',
        retryCount: 0,
        isSimulated: true,
      },
      {
        id: 'NOTIF-SEED-4',
        incidentId: 'RX-1043',
        channel: 'VOICE',
        recipient: '+1-800-555-RESQ',
        status: 'DELIVERED',
        providerReference: 'SIMULATED-TWILIO-VOICE-SEED4',
        timestamp: minAgo(27),
        messagePreview: 'There is an emergency in Industrial Park South, Warehouse 7B. Please send the RESQ team immediately.',
        retryCount: 0,
        isSimulated: true,
      }
    ];
  }

  // --- Incidents API ---
  public getAllIncidents(): Incident[] {
    return Array.from(this.incidents.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getIncidentById(id: string): Incident | undefined {
    return this.incidents.get(id);
  }

  public createIncident(incidentData: Partial<Incident>): Incident {
    this.lastIncidentCounter++;
    const id = `RX-${this.lastIncidentCounter}`;
    const now = new Date().toISOString();

    const incident: Incident = {
      id,
      citizenId: incidentData.citizenId || `CITIZEN-${Math.floor(1000 + Math.random() * 9000)}`,
      type: incidentData.type || 'Other',
      description: incidentData.description || '',
      peopleAffected: incidentData.peopleAffected !== undefined ? incidentData.peopleAffected : 1,
      latitude: incidentData.latitude || 37.7749,
      longitude: incidentData.longitude || -122.4194,
      accuracy: incidentData.accuracy,
      address: incidentData.address || 'Reported Emergency Coordinates',
      priority: incidentData.priority || 'P2',
      riskScore: incidentData.riskScore || 50,
      riskLevel: incidentData.riskLevel || 'Moderate',
      status: incidentData.status || 'NEW',
      createdAt: now,
      updatedAt: now,
      media: incidentData.media || [],
      voiceNote: incidentData.voiceNote,
      aiAnalysis: incidentData.aiAnalysis,
      assignedTeam: incidentData.assignedTeam,
      isSimulated: incidentData.isSimulated || false,
    };

    this.incidents.set(id, incident);

    this.logAudit({
      incidentId: id,
      actor: 'Citizen',
      action: 'EMERGENCY_REPORTED',
      details: `New emergency report lodged at ${incident.address} (Type: ${incident.type}, Impact: ${incident.peopleAffected}).`,
    });

    return incident;
  }

  public updateIncident(id: string, updates: Partial<Incident>, actor: string = 'Operator'): Incident | null {
    const existing = this.incidents.get(id);
    if (!existing) return null;

    const updated: Incident = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.incidents.set(id, updated);

    if (updates.status && updates.status !== existing.status) {
      this.logAudit({
        incidentId: id,
        actor,
        action: 'STATUS_CHANGE',
        details: `Incident status transitioned from ${existing.status} -> ${updates.status}.`,
      });
    }

    if (updates.assignedTeam && updates.assignedTeam !== existing.assignedTeam) {
      this.logAudit({
        incidentId: id,
        actor,
        action: 'TEAM_ASSIGNED',
        details: `Dispatched response team "${updates.assignedTeam}" to scene.`,
      });
    }

    return updated;
  }

  public deleteIncident(id: string): boolean {
    return this.incidents.delete(id);
  }

  // --- Response Teams API ---
  public getTeams(): ResponseTeam[] {
    return Array.from(this.teams.values());
  }

  public updateTeam(teamId: string, updates: Partial<ResponseTeam>): ResponseTeam | null {
    const team = this.teams.get(teamId);
    if (!team) return null;
    const updated = { ...team, ...updates };
    this.teams.set(teamId, updated);
    return updated;
  }

  // --- Shelters API ---
  public getShelters(): Shelter[] {
    return Array.from(this.shelters.values());
  }

  // --- Notifications API ---
  public getNotificationLogs(): NotificationLog[] {
    return [...this.notificationLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public addNotificationLog(log: NotificationLog) {
    this.notificationLogs.unshift(log);
    if (this.notificationLogs.length > 200) {
      this.notificationLogs.pop();
    }
  }

  // --- Audit Logs API ---
  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public logAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>) {
    const audit: AuditLog = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.auditLogs.unshift(audit);
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
  }

  // --- Reset & Demo Scenarios ---
  public resetToDefault() {
    this.incidents.clear();
    this.teams.clear();
    this.shelters.clear();
    this.notificationLogs = [];
    this.auditLogs = [];
    this.lastIncidentCounter = 1045;
    this.seedInitialData();
  }
}

// Global Singleton for in-memory persistence during development / runtime
declare global {
  var __resq_db: DatabaseStore | undefined;
}

export const db = global.__resq_db || new DatabaseStore();
if (process.env.NODE_ENV !== 'production') {
  global.__resq_db = db;
}
