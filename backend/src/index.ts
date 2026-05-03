import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { WebSocketServer } from 'ws';
import { v4 as uuid } from 'uuid';
import { Client } from 'ssh2';
import { env } from './config/env.js';
import { initDb } from './db/database.js';
import { decryptSecret, encryptSecret } from './utils/crypto.js';
import { hashPassword, signToken, verifyPassword, verifyToken } from './services/auth.js';
import { validateTarget } from './utils/networkGuard.js';

process.on('unhandledRejection', (reason) => console.error('unhandledRejection', String(reason)));
process.on('uncaughtException', (err) => console.error('uncaughtException', err.message));

const app = express(); const server = createServer(app); const db = initDb(env.DATA_PATH);
app.use(helmet()); app.use(express.json({ limit: '512kb' })); app.use(rateLimit({ windowMs: 60000, max: 150 }));
const asyncWrap = (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);
const auth = (req: any, res: any, next: any) => { try { const t = (req.headers.authorization || '').replace('Bearer ', ''); req.userId = verifyToken(env.JWT_SECRET, t).sub; next(); } catch { res.status(401).json({ message: 'Unauthorized' }); } };
const audit = (userId: string, event: string, target?: string) => db.prepare('INSERT INTO audit_logs VALUES (?,?,?,?,?)').run(uuid(), userId, event, target || null, null, new Date().toISOString());

app.post('/api/auth/register', asyncWrap(async (req, res) => { const { email, password } = req.body; if (!email || !password || password.length < 10) return res.status(400).json({ message: 'Invalid' }); const id = uuid(); db.prepare('INSERT INTO users VALUES (?,?,?,?)').run(id, email, await hashPassword(password), new Date().toISOString()); db.prepare('INSERT INTO user_settings(user_id) VALUES (?)').run(id); res.status(201).json({ token: signToken(env.JWT_SECRET, id) }); }));
app.post('/api/auth/login', asyncWrap(async (req, res) => { const u = db.prepare('SELECT * FROM users WHERE email=?').get(req.body.email) as any; if (!u || !(await verifyPassword(req.body.password || '', u.password_hash))) return res.status(401).json({ message: 'Invalid credentials' }); res.json({ token: signToken(env.JWT_SECRET, u.id) }); }));
app.post('/api/auth/logout', auth, (_req, res) => res.status(204).end());
app.get('/api/hosts', auth, asyncWrap(async (req: any, res) => res.json(db.prepare('SELECT id,display_name,hostname,port,ssh_username,group_name,favorite,notes,last_connected_at FROM hosts WHERE user_id=?').all(req.userId))));

const sessions = new Map<string, { userId: string; hostId: string; ssh: Client; stream?: any; ws: any; status: string }>();
const msgRate = new WeakMap<any, { count: number; tick: number }>();
const wss = new WebSocketServer({ server, path: '/ws/terminal' });
wss.on('connection', (ws, req) => {
  try { const token = new URL(req.url!, 'http://x').searchParams.get('token') || ''; (ws as any).userId = verifyToken(env.JWT_SECRET, token).sub; } catch { ws.close(1008, 'unauthorized'); return; }
  ws.on('message', async (raw) => {
    const now = Math.floor(Date.now() / 1000); const rate = msgRate.get(ws) || { count: 0, tick: now }; if (rate.tick !== now) { rate.tick = now; rate.count = 0; } rate.count++; msgRate.set(ws, rate); if (rate.count > 40) return ws.send(JSON.stringify({ type: 'error', message: 'rate_limited' }));
    let m: any;
    try { m = JSON.parse(raw.toString()); } catch { ws.send(JSON.stringify({ type: 'error', message: 'invalid_json' })); ws.close(1003, 'invalid_json'); return; }
    const userId = (ws as any).userId;
    if (m.type === 'start') {
      try {
        const host = db.prepare('SELECT * FROM hosts WHERE id=? AND user_id=?').get(m.hostId, userId) as any; if (!host) return ws.send(JSON.stringify({ type: 'error', message: 'host_not_found' }));
        await validateTarget(host.hostname, host.port, env.ADMIN_ALLOW_PRIVATE_NETWORKS);
        const sid = uuid(); const ssh = new Client(); sessions.set(sid, { userId, hostId: host.id, ssh, ws, status: 'connecting' });
        ssh.on('error', () => ws.send(JSON.stringify({ type: 'state', sessionId: sid, state: 'failed' }))).on('close', () => { ws.send(JSON.stringify({ type: 'state', sessionId: sid, state: 'disconnected' })); sessions.delete(sid); });
        ssh.on('ready', () => { ws.send(JSON.stringify({ type: 'state', sessionId: sid, state: 'connected' })); ssh.shell({ term: 'xterm-256color', cols: m.cols || 120, rows: m.rows || 30 }, (_e, stream) => { sessions.get(sid)!.stream = stream; stream.on('data', (d: Buffer) => ws.send(JSON.stringify({ type: 'output', sessionId: sid, data: d.toString('utf8') }))); }); });
        const identity = host.identity_id ? db.prepare('SELECT * FROM identities WHERE id=? AND user_id=?').get(host.identity_id, userId) as any : null;
        const secret = m.connectOnce?.secret || (identity ? decryptSecret(identity.encrypted_secret, env.ENCRYPTION_KEY) : null);
        const passphrase = m.connectOnce?.passphrase || (identity?.encrypted_passphrase ? decryptSecret(identity.encrypted_passphrase, env.ENCRYPTION_KEY) : undefined);
        ssh.connect({ host: host.hostname, port: host.port, username: host.ssh_username, readyTimeout: env.SSH_CONNECT_TIMEOUT_MS, hostHash: 'sha256', hostVerifier: (hashed) => { const row = db.prepare('SELECT * FROM trusted_host_keys WHERE user_id=? AND host_id=?').get(userId, host.id) as any; if (!row) { ws.send(JSON.stringify({ type: 'fingerprint_required', sessionId: sid, fingerprint: hashed })); return false; } return row.fingerprint === hashed; }, ...(identity?.type === 'privateKey' ? { privateKey: secret, passphrase } : { password: secret }) });
        audit(userId, 'connection.start', sid);
      } catch { ws.send(JSON.stringify({ type: 'state', state: 'failed' })); }
    }
    if (m.type === 'trust_fingerprint') db.prepare('INSERT OR REPLACE INTO trusted_host_keys VALUES (?,?,?,?,?,?)').run(uuid(), userId, m.hostId, m.fingerprint, 'sha256', new Date().toISOString());
    if (m.type === 'input') { const s = sessions.get(m.sessionId); if (!s) return ws.send(JSON.stringify({ type: 'error', message: 'invalid_session' })); s.stream?.write(m.data); }
    if (m.type === 'resize') { const s = sessions.get(m.sessionId); if (!s) return ws.send(JSON.stringify({ type: 'error', message: 'invalid_session' })); s.stream?.setWindow(m.rows, m.cols, 0, 0); }
    if (m.type === 'disconnect') { const s = sessions.get(m.sessionId); if (!s) return; s.ssh.end(); sessions.delete(m.sessionId); }
  });
  ws.on('close', () => { for (const [id, s] of sessions) if (s.ws === ws) { s.ssh.end(); sessions.delete(id); } });
});

app.use((err: any, _req: any, res: any, _next: any) => res.status(500).json({ message: 'Internal server error' }));
server.listen(env.PORT, () => console.log(`server ${env.PORT}`));
