import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { env } from './config/env.js';
import { initDb } from './db/database.js';
import { createHost, getHost, listHosts } from './services/hostService.js';
import { issueToken, verifyToken } from './services/auth.js';
import { isBlockedHost } from './utils/networkGuard.js';
import { startSshSession, resizeSession, sendInput, stopSession } from './ws/sessionManager.js';
import { v4 as uuid } from 'uuid';

const app = express();
const server = createServer(app);
const db = initDb(env.DATA_PATH);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '256kb' }));
app.use(rateLimit({ windowMs: 60_000, max: 200 }));

app.post('/api/auth/login', (req, res) => res.json({ token: issueToken(env.JWT_SECRET, req.body.username || 'user') }));

app.get('/api/hosts', (req, res) => res.json(listHosts(db)));
app.post('/api/hosts', (req, res) => {
  if (isBlockedHost(req.body.host, env.ALLOW_PRIVATE_RANGES)) return res.status(400).json({ message: 'Host blocked by policy' });
  const id = createHost(db, req.body, env.CREDENTIAL_KEY);
  res.status(201).json({ id });
});

app.post('/api/sessions/start', (req, res) => {
  const host = getHost(db, req.body.hostId);
  if (!host) return res.status(404).json({ message: 'Host not found' });
  const id = startSshSession(host, env.CREDENTIAL_KEY, () => {});
  db.prepare('INSERT INTO audits VALUES (?,?,?,?)').run(uuid(), host.id, 'start', new Date().toISOString());
  res.json({ sessionId: id });
});

const wss = new WebSocketServer({ server, path: '/ws/terminal' });
wss.on('connection', (socket, req) => {
  const token = new URL(req.url!, 'http://localhost').searchParams.get('token');
  try { if (!token) throw new Error(); verifyToken(env.JWT_SECRET, token); } catch { socket.close(1008, 'Unauthorized'); return; }

  socket.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === 'input') sendInput(msg.sessionId, msg.data || '');
    if (msg.type === 'resize') resizeSession(msg.sessionId, msg.cols, msg.rows);
    if (msg.type === 'disconnect') stopSession(msg.sessionId);
  });
});

server.listen(env.PORT, () => console.log(`backend listening on ${env.PORT}`));
