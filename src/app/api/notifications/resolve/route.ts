import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { realtimeHub } from '@/lib/realtime';

export async function POST(req: NextRequest) {
  try {
    const { logId } = await req.json();
    const logs = db.getNotificationLogs();
    
    // Find matching log in memory
    const logIndex = logs.findIndex((l) => l.id === logId);
    if (logIndex === -1) {
      return NextResponse.json({ success: false, error: 'Notification log not found' }, { status: 404 });
    }

    const log = logs[logIndex];
    log.status = 'DELIVERED';
    log.messagePreview = `[Resolved Manually by Operator] ${log.messagePreview}`;

    const incident = db.getIncidentById(log.incidentId);

    // Broadcast updated state to all dashboards
    realtimeHub.broadcast('incident_updated', {
      incident,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, log });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
