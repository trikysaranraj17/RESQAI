import { NextRequest, NextResponse } from 'next/server';
import { WhatIfParams, WhatIfResult, RiskLevel } from '@/lib/types';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body: WhatIfParams = await req.json();
    const {
      rainfallMm = 50,
      affectedRadiusKm = 5,
      roadBlockagePercent = 30,
      populationDensity = 'Medium',
    } = body;

    // Density multipliers (people per sq km)
    const densityMap: Record<string, number> = {
      'Low': 800,
      'Medium': 2400,
      'High': 5800,
      'Dense Urban': 11200,
    };

    const densityPerKm2 = densityMap[populationDensity] || 2400;
    const affectedAreaKm2 = Math.PI * Math.pow(affectedRadiusKm, 2);
    const exposedPopulationEstimate = Math.round(affectedAreaKm2 * densityPerKm2 * 0.45);

    // Compute Simulated Risk Score
    const rainFactor = (rainfallMm / 150) * 45;
    const blockageFactor = (roadBlockagePercent / 100) * 35;
    const areaFactor = Math.min(20, (affectedRadiusKm / 20) * 20);
    const rawSimScore = Math.min(99, Math.max(15, Math.round(rainFactor + blockageFactor + areaFactor)));

    let simulatedRiskLevel: RiskLevel = 'Moderate';
    if (rawSimScore >= 80) simulatedRiskLevel = 'Critical';
    else if (rawSimScore >= 56) simulatedRiskLevel = 'High';
    else if (rawSimScore >= 31) simulatedRiskLevel = 'Moderate';
    else simulatedRiskLevel = 'Low';

    // Calculate shelter pressure against current capacity
    const shelters = db.getShelters();
    const totalShelterCapacity = shelters.reduce((sum, s) => sum + s.capacity, 0) || 1000;
    const totalShelterOccupancy = shelters.reduce((sum, s) => sum + s.currentOccupancy, 0);
    const expectedEvacuees = Math.round(exposedPopulationEstimate * 0.08); // 8% of exposed pop seeking shelter
    const projectedOccupancy = totalShelterOccupancy + expectedEvacuees;
    const shelterPressurePercent = Math.min(100, Math.round((projectedOccupancy / totalShelterCapacity) * 100));

    // Critical roads cut estimate
    const criticalRoadsCut = Math.max(1, Math.round((roadBlockagePercent / 100) * 12));

    // Evacuation zones recommendation
    const recommendedEvacuationZones = [
      `Sector ${Math.floor(affectedRadiusKm * 1.5)} River Corridor`,
      `Lowland Drainage Basin B`,
      ...(shelterPressurePercent > 80 ? ['Secondary High Ground Staging Area Alpha'] : []),
    ];

    const result: WhatIfResult = {
      simulatedRiskScore: rawSimScore,
      simulatedRiskLevel,
      exposedPopulationEstimate,
      shelterPressurePercent,
      criticalRoadsCut,
      recommendedEvacuationZones,
    };

    return NextResponse.json({ success: true, result, isSimulation: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
