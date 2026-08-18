import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { realtimeHub } from '@/lib/realtime';

export async function GET() {
  try {
    const teams = db.getTeams();
    return NextResponse.json({ success: true, count: teams.length, teams });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { teamId, status, assignedIncidentId } = body;

    if (!teamId) {
      return NextResponse.json({ success: false, error: 'teamId is required' }, { status: 400 });
    }

    const updated = db.updateTeam(teamId, {
      status,
      assignedIncidentId,
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
    }

    realtimeHub.broadcast('team_dispatched', {
      team: updated,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, team: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
