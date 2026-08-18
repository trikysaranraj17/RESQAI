// =======================================================
// RESQ REALTIME EVENT BROADCASTER
// =======================================================

type RealtimeEventType =
  | 'incident_created'
  | 'incident_updated'
  | 'critical_alert'
  | 'team_dispatched'
  | 'system_status';

export interface RealtimeEventPayload {
  type: RealtimeEventType;
  data: any;
  timestamp: string;
}

type ClientCallback = (event: RealtimeEventPayload) => void;

class RealtimeHub {
  private clients: Set<ClientCallback> = new Set();

  public subscribe(callback: ClientCallback): () => void {
    this.clients.add(callback);
    return () => {
      this.clients.delete(callback);
    };
  }

  public broadcast(type: RealtimeEventType, data: any) {
    const payload: RealtimeEventPayload = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    this.clients.forEach((client) => {
      try {
        client(payload);
      } catch (err) {
        console.error('Error delivering realtime event to subscriber:', err);
      }
    });
  }

  public getSubscriberCount(): number {
    return this.clients.size;
  }
}

declare global {
  var __resq_realtime: RealtimeHub | undefined;
}

export const realtimeHub = global.__resq_realtime || new RealtimeHub();
if (process.env.NODE_ENV !== 'production') {
  global.__resq_realtime = realtimeHub;
}
