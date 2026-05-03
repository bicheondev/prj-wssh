export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface HostRecord {
  id: string;
  name: string;
  group?: string;
  host: string;
  port: number;
  username: string;
  authMode: 'password' | 'privateKey';
  encryptedSecret: string;
  createdAt: string;
  updatedAt: string;
}

export interface WsClientEvent {
  type: 'input' | 'resize' | 'heartbeat';
  sessionId: string;
  data?: string;
  cols?: number;
  rows?: number;
}

export interface WsServerEvent {
  type: 'output' | 'state' | 'error';
  sessionId: string;
  data?: string;
  state?: ConnectionState;
  message?: string;
}
