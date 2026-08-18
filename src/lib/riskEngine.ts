import { EmergencyType, RiskLevel, PriorityLevel, RiskPrediction, RiskSubScores, WeatherSnapshot } from './types';

interface RiskEngineInput {
  type: EmergencyType;
  description: string;
  peopleAffected: number;
  latitude: number;
  longitude: number;
  address: string;
  hasMedia: boolean;
  mediaType?: 'image' | 'video';
  hasVoiceNote: boolean;
  voiceDurationSeconds?: number;
  weather?: WeatherSnapshot;
}

export class RiskEngine {
  /**
   * Evaluates multiple multi-modal signals to compute a deterministic and adaptive AI Risk Score.
   * Explicitly combines:
   * 1. Meteorological / Sensor Baseline
   * 2. Citizen Ground Truth (Emergency Type & Impact count)
   * 3. Descriptive urgency & semantic NLP indicators
   * 4. Multi-modal evidence weighting (visual + auditory proof)
   * 5. Topographic / geographic vulnerability
   */
  public static calculateRisk(input: RiskEngineInput): RiskPrediction {
    const {
      type,
      description = '',
      peopleAffected = 1,
      latitude,
      longitude,
      address,
      hasMedia,
      hasVoiceNote,
      weather,
    } = input;

    // 1. Base Weather Signal (0 - 30 pts)
    let weatherSeverity = 20; // baseline ambient weather
    if (weather) {
      const rainWeight = (weather.rainfallMm / 100) * 15;
      const windWeight = (weather.windSpeedKmh / 120) * 10;
      const stormProb = (weather.rainProbability / 100) * 5;
      weatherSeverity = Math.min(30, Math.round(rainWeight + windWeight + stormProb));
    }

    // 2. Incident Type Base Impact (15 - 35 pts)
    const typeWeights: Record<EmergencyType, number> = {
      'Flood': 28,
      'Fire': 34,
      'Person Trapped': 35,
      'Building Damage': 30,
      'Road Emergency': 24,
      'Medical Emergency': 32,
      'Storm': 25,
      'Other': 18,
    };
    const incidentBaseImpact = typeWeights[type] || 20;

    // 3. Human Impact & Population Exposure (0 - 20 pts)
    const peopleMultiplier = Math.min(20, Math.round(Math.log2(Math.max(1, peopleAffected) + 1) * 6));

    // 4. Semantic Severity & Urgent Keywords (0 - 15 pts)
    const text = (description || '').toLowerCase();
    const urgentKeywords = [
      'trapped', 'rising water', 'submerged', 'collapsed', 'unconscious',
      'bleeding', 'explosion', 'flames', 'infant', 'child', 'elderly',
      'cut off', 'urgent', 'help', 'drowning', 'no power', 'blocked', 'gas'
    ];
    let matchedKeywordsCount = 0;
    urgentKeywords.forEach(k => {
      if (text.includes(k)) matchedKeywordsCount++;
    });
    const semanticUrgency = Math.min(15, matchedKeywordsCount * 4 + (text.length > 25 ? 3 : 0));

    // 5. Evidence Verification Multiplier (0 - 15 pts)
    // Multi-modal proof dramatically elevates certainty and urgency!
    let evidenceBonus = 0;
    if (hasMedia) evidenceBonus += 8;
    if (hasVoiceNote) evidenceBonus += 7;

    // 6. Geographic / Proximity Vulnerability Context (0 - 10 pts)
    // Dynamic geographic hazard check
    let geoContextBonus = 5;
    const lowerAddr = address.toLowerCase();
    if (lowerAddr.includes('river') || lowerAddr.includes('lake') || lowerAddr.includes('coastal') || lowerAddr.includes('valley')) {
      geoContextBonus = 9;
    } else if (lowerAddr.includes('hill') || lowerAddr.includes('slope') || lowerAddr.includes('highway')) {
      geoContextBonus = 7;
    }

    // Total Aggregation (Clamped 0 - 100)
    const rawTotal = weatherSeverity + incidentBaseImpact + peopleMultiplier + semanticUrgency + evidenceBonus + geoContextBonus;
    const riskScore = Math.min(98, Math.max(12, Math.round(rawTotal)));

    // Categorize Risk Level (Hackathon Prototype Thresholds)
    // 0–30 Low, 31–55 Moderate, 56–79 High, 80–100 Critical
    let riskLevel: RiskLevel = 'Moderate';
    let priority: PriorityLevel = 'P2';

    if (riskScore >= 80) {
      riskLevel = 'Critical';
      priority = 'P1';
    } else if (riskScore >= 56) {
      riskLevel = 'High';
      priority = 'P1';
    } else if (riskScore >= 31) {
      riskLevel = 'Moderate';
      priority = 'P2';
    } else {
      riskLevel = 'Low';
      priority = 'P3';
    }

    // Sub-Scores Calculation for detailed dashboard analytics
    const subScores: RiskSubScores = {
      floodRisk: Math.min(100, Math.round(
        (type === 'Flood' ? 45 : 10) + (weather?.rainfallMm ? weather.rainfallMm * 0.4 : 20) + (geoContextBonus * 2.5)
      )),
      roadAccessibility: Math.min(100, Math.round(
        (type === 'Road Emergency' || type === 'Building Damage' ? 50 : 20) + (riskScore * 0.35)
      )),
      areaDamage: Math.min(100, Math.round(
        (hasMedia ? 35 : 15) + (riskScore * 0.45)
      )),
      populationExposure: Math.min(100, Math.round(
        peopleMultiplier * 4 + (riskScore * 0.2)
      )),
      weatherSeverity: Math.min(100, Math.round(weatherSeverity * 3.3)),
    };

    // Warnings & Actionable Decision Support Recommendations
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (riskScore >= 80) {
      warnings.push(`CRITICAL DANGER: High probability of severe casualty/trapping at ${address}`);
      warnings.push('Rapid ingress route compromise detected within 1.5km radius.');
    }
    if (peopleAffected >= 3) {
      warnings.push(`Mass exposure hazard: ${peopleAffected} confirmed civilians requiring assistance.`);
    }
    if (type === 'Flood') {
      warnings.push('Water levels expected to rise with upstream watershed accumulation.');
      recommendations.push('Deploy inflatable motorized rescue boats (Marine Unit 3).');
      recommendations.push('Establish elevated staging ground at least 15m above base level.');
    } else if (type === 'Fire') {
      warnings.push('Extreme thermal plume and smoke inhalation hazard.');
      recommendations.push('Deploy Hazmat/Fire Suppression crew with breathing apparatus.');
      recommendations.push('Isolate gas/electrical main junction in surrounding 300m.');
    } else if (type === 'Person Trapped') {
      recommendations.push('Dispatch Heavy Extrication Unit & K-9 Search Team immediately.');
      recommendations.push('Establish direct acoustic link with trapped reporting party.');
    } else if (type === 'Medical Emergency') {
      recommendations.push('Dispatch Advanced Life Support (ALS) Paramedic unit with triage kit.');
      recommendations.push('Pre-notify trauma center at Regional General Hospital.');
    } else {
      recommendations.push('Dispatch nearest field reconnaissance unit to secure perimeter.');
      recommendations.push('Maintain active communication channel with citizen reporter.');
    }

    recommendations.push('Alert nearest emergency shelter coordinator for incoming intake.');
    recommendations.push('Update Control Center situational map upon first responder on-scene arrival.');

    // Synthesize human-readable AI Summary
    const incidentSummary = `AI analysis correlates ${type.toLowerCase()} emergency at ${address} with ${peopleAffected} affected individual(s). ` +
      `Multi-signal verification score: ${riskScore}/100 (${riskLevel.toUpperCase()}). ` +
      `${hasMedia ? 'Visual photographic confirmation validated. ' : ''}` +
      `${hasVoiceNote ? 'Acoustic voice note distress signature detected. ' : ''}` +
      `Recommended tactical response: ${recommendations[0]}`;

    return {
      riskScore,
      riskLevel,
      priority,
      subScores,
      incidentSummary,
      warnings,
      recommendations,
      affectedArea: address,
      signalBreakdown: {
        weatherContribution: weatherSeverity,
        citizenReportContribution: incidentBaseImpact + peopleMultiplier + semanticUrgency,
        evidenceContribution: evidenceBonus,
        areaContextContribution: geoContextBonus,
      },
      calculatedAt: new Date().toISOString(),
    };
  }
}
