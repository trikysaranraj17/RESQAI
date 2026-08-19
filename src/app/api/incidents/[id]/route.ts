import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { realtimeHub } from '@/lib/realtime';
import { NotificationService } from '@/lib/notificationService';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dwilzclyzdsfwqdzximc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3aWx6Y2x5emRzZndxZHp4aW1jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA1NTk5NiwiZXhwIjoyMTAyNjMxOTk2fQ.Y5kOLKI9VPAJ4c5iGqy_ugkLAj0b5sBDOqH7b1xGK-Q';

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
    const { status, assignedTeam, resolutionNotes, resolvedBy = 'Command Operator', customTarget } = body;

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
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Failed to update incident' }, { status: 500 });
    }

    let alertResult: any = null;

    // If a team is assigned / dispatched, trigger real synchronized multi-channel alert
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

      // 🚨 REAL MULTI-CHANNEL DISPATCH TRIGGER (Twilio Call + SMS + FormSubmit Emails + WhatsApp + Supabase)
      alertResult = await NotificationService.dispatchCriticalAlert(updated, customTarget);
      if (alertResult && alertResult.logs) {
        alertResult.logs.forEach((log: any) => db.addNotificationLog(log));
      }
    }

    // Sync to Supabase Database
    try {
      if (SUPABASE_URL && SUPABASE_KEY) {
        fetch(`${SUPABASE_URL}/rest/v1/incidents?id=eq.${params.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            status: updated.status,
            assigned_team: updated.assignedTeam,
            resolved_at: updated.resolvedAt,
            resolution_notes: updated.resolutionNotes,
            updated_at: updated.updatedAt,
          }),
        }).catch(err => console.warn('Supabase sync notice:', err.message));
      }
    } catch (err: any) {
      console.warn('Supabase sync error:', err.message);
    }

    // Broadcast update to all control centers
    realtimeHub.broadcast('incident_updated', {
      incident: updated,
      triggeredAlerts: Boolean(assignedTeam),
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      incident: updated,
      triggeredAlerts: Boolean(assignedTeam),
      logs: alertResult?.logs || [],
    });
  } catch (error: any) {
    console.error('PATCH /api/incidents/[id] error:', error);
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
