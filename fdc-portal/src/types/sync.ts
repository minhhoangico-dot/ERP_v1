export interface BridgeHealth {
  status: 'online' | 'offline' | 'degraded';
  lastHeartbeat: string;
  hisConnected: boolean;
  misaConnected: boolean;
  queueDepth: number;
}

export interface SyncRecord {
  id: string;
  type: 'inventory' | 'patient' | 'invoice' | 'attendance';
  status: 'success' | 'failed' | 'pending';
  recordsSynced: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}
