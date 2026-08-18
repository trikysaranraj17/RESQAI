import { NextResponse } from 'next/server';
import { SystemServiceStatus } from '@/lib/types';
import { realtimeHub } from '@/lib/realtime';

export async function GET() {
  try {
    const appMode = (process.env.APP_MODE as 'demo' | 'live') || 'demo';

    const status: SystemServiceStatus = {
      aiEngine: 'ONLINE',
      weatherFeed: 'ONLINE',
      realtimeStream: 'ONLINE',
      notifications: 'ONLINE',
      database: 'ONLINE',
      mode: appMode,
      lastPing: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      status,
      subscriberCount: realtimeHub.getSubscriberCount(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
