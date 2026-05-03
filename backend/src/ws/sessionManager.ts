import { Client } from 'ssh2';
import { v4 as uuid } from 'uuid';
import { decryptSecret } from '../utils/crypto.js';

const sessions = new Map<string, { ssh: Client; stream?: any; history: string[] }>();

export function startSshSession(hostRecord: any, key: string, onEvent: (evt: any) => void) {
  const sessionId = uuid();
  const ssh = new Client();
  sessions.set(sessionId, { ssh, history: [] });

  ssh.on('ready', () => {
    onEvent({ type: 'state', state: 'connected', sessionId });
    ssh.shell({ term: 'xterm-256color', cols: 120, rows: 30 }, (err, stream) => {
      if (err) return onEvent({ type: 'error', message: 'PTY failed', sessionId });
      sessions.get(sessionId)!.stream = stream;
      stream.on('data', (d: Buffer) => onEvent({ type: 'output', sessionId, data: d.toString('utf8') }));
      stream.on('close', () => stopSession(sessionId));
    });
  }).on('error', () => onEvent({ type: 'error', message: 'SSH connection failed', sessionId }))
    .on('end', () => onEvent({ type: 'state', state: 'disconnected', sessionId }));

  const secret = decryptSecret(hostRecord.encryptedSecret, key);
  ssh.connect({
    host: hostRecord.host,
    port: hostRecord.port,
    username: hostRecord.username,
    ...(hostRecord.authMode === 'password' ? { password: secret } : { privateKey: secret })
  });
  onEvent({ type: 'state', state: 'connecting', sessionId });
  return sessionId;
}

export function sendInput(sessionId: string, input: string) {
  const s = sessions.get(sessionId);
  if (!s?.stream) return;
  s.history.push(input);
  s.stream.write(input);
}
export function resizeSession(sessionId: string, cols: number, rows: number) { sessions.get(sessionId)?.stream?.setWindow(rows, cols, 0, 0); }
export function stopSession(sessionId: string) { const s = sessions.get(sessionId); if (!s) return; s.stream?.end(); s.ssh.end(); sessions.delete(sessionId); }
