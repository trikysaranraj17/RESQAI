import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { realtimeHub } from '@/lib/realtime';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const incident = db.getIncidentById(params.id);
    if (!incident) {
      return NextResponse.json({ success: false, error: 'Incident not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, incident });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { status, assignedTeam, resolutionNotes, resolvedBy = 'Operator #41' } = body;

    const existing = db.getIncidentById(params.id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Incident not found' }, { status: 404 });
    }

    const updates: any = {};
    if (status) updates.status = status;
    if (assignedTeam !== undefined) updates.assignedTeam = assignedTeam;
    if (resolutionNotes) {
      updates.resolutionNotes = resolutionNotes;
      updates.resolvedAt = new Date().toISOString();
      updates.resolvedBy = resolvedBy;
    }

    const updated = db.updateIncident(params.id, updates, resolvedBy);

    // If a team is assigned, update that team's status too
    if (assignedTeam) {
      const teams = db.getTeams();
      const team = teams.find((t) => t.name === assignedTeam || t.id === assignedTeam);
      if (team) {
        db.updateTeam(team.id, {
          status: 'On Response',
          assignedIncidentId: params.id,
        });
        realtimeHub.broadcast('team_dispatched', {
          teamId: team.id,
          teamName: team.name,
          incidentId: params.id,
        });
      }
    }

    // Broadcast update to all control centers
    realtimeHub.broadcast('incident_updated', {
      incident: updated,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, incident: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deleted = db.deleteIncident(params.id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Incident not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Incident deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
