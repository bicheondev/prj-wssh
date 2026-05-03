import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { WebSocketServer } from 'ws';
import { v4 as uuid } from 'uuid';
import { Client, utils as sshUtils } from 'ssh2';
import { env } from './config/env.js';
import { initDb } from './db/database.js';
import { decryptSecret, encryptSecret } from './utils/crypto.js';
import { hashPassword, signToken, verifyPassword, verifyToken } from './services/auth.js';
import { validateTarget } from './utils/networkGuard.js';

const app = express(); const server = createServer(app); const db = initDb(env.DATA_PATH);
app.use(helmet()); app.use(express.json({limit:'512kb'})); app.use(rateLimit({windowMs:60000,max:150}));

const auth = (req:any,res:any,next:any)=>{try{const h=req.headers.authorization||''; const t=h.replace('Bearer ',''); req.userId=verifyToken(env.JWT_SECRET,t).sub; next();}catch{return res.status(401).json({message:'Unauthorized'});}};
const audit=(userId:string,event:string,target?:string,metadata?:unknown)=>db.prepare('INSERT INTO audit_logs VALUES (?,?,?,?,?)').run(uuid(),userId,event,target||null,metadata?JSON.stringify(metadata):null,new Date().toISOString());

app.post('/api/auth/register', async (req,res)=>{const {email,password}=req.body; if(!email||!password||password.length<10) return res.status(400).json({message:'Invalid'}); const id=uuid(); const hash=await hashPassword(password); db.prepare('INSERT INTO users VALUES (?,?,?,?)').run(id,email,hash,new Date().toISOString()); db.prepare('INSERT INTO user_settings(user_id) VALUES (?)').run(id); res.status(201).json({token:signToken(env.JWT_SECRET,id)});});
app.post('/api/auth/login', async (req,res)=>{const u=db.prepare('SELECT * FROM users WHERE email=?').get(req.body.email) as any; if(!u||!(await verifyPassword(req.body.password||'',u.password_hash))) return res.status(401).json({message:'Invalid credentials'}); res.json({token:signToken(env.JWT_SECRET,u.id)});});
app.post('/api/auth/logout', auth, (_,res)=>res.status(204).end());

app.get('/api/hosts', auth, (req:any,res)=>res.json(db.prepare('SELECT id,display_name,hostname,port,ssh_username,group_name,favorite,notes,last_connected_at FROM hosts WHERE user_id=? ORDER BY favorite DESC,display_name').all(req.userId)));
app.post('/api/hosts', auth, async (req:any,res)=>{await validateTarget(req.body.hostname, req.body.port, env.ADMIN_ALLOW_PRIVATE_NETWORKS); const id=uuid(); const now=new Date().toISOString(); db.prepare('INSERT INTO hosts VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,req.userId,req.body.displayName,req.body.hostname,req.body.port,req.body.sshUsername,req.body.groupName||null,req.body.favorite?1:0,req.body.notes||null,null,req.body.identityId||null,now,now); audit(req.userId,'host.create',id); res.status(201).json({id});});
app.put('/api/hosts/:id', auth, (req:any,res)=>{const r=db.prepare('UPDATE hosts SET display_name=?,group_name=?,favorite=?,notes=?,updated_at=? WHERE id=? AND user_id=?').run(req.body.displayName,req.body.groupName||null,req.body.favorite?1:0,req.body.notes||null,new Date().toISOString(),req.params.id,req.userId); if(!r.changes) return res.status(404).json({message:'Not found'}); audit(req.userId,'host.update',req.params.id); res.status(204).end();});
app.delete('/api/hosts/:id', auth, (req:any,res)=>{const r=db.prepare('DELETE FROM hosts WHERE id=? AND user_id=?').run(req.params.id,req.userId); if(!r.changes) return res.status(404).end(); audit(req.userId,'host.delete',req.params.id); res.status(204).end();});
app.post('/api/identities', auth, (req:any,res)=>{const id=uuid(); db.prepare('INSERT INTO identities VALUES (?,?,?,?,?,?,?)').run(id,req.userId,req.body.name,req.body.type,encryptSecret(req.body.secret,env.ENCRYPTION_KEY),req.body.passphrase?encryptSecret(req.body.passphrase,env.ENCRYPTION_KEY):null,new Date().toISOString()); audit(req.userId,'identity.create',id); res.status(201).json({id});});
app.get('/api/identities', auth, (req:any,res)=>res.json(db.prepare('SELECT id,name,type,created_at FROM identities WHERE user_id=?').all(req.userId)));

const sessions=new Map<string,{userId:string;hostId:string;ssh:Client;stream?:any;ws:any;status:string}>();
const wss=new WebSocketServer({server,path:'/ws/terminal'});
wss.on('connection',(ws,req)=>{try{const token=new URL(req.url!,'http://x').searchParams.get('token')||''; const userId=verifyToken(env.JWT_SECRET,token).sub; (ws as any).userId=userId;}catch{ws.close(1008,'unauthorized');return;}
  ws.on('message',async(raw)=>{const m=JSON.parse(raw.toString()); const userId=(ws as any).userId;
    if(m.type==='start'){
      const active=[...sessions.values()].filter(s=>s.userId===userId&&s.status==='connected').length; if(active>=env.MAX_SESSIONS_PER_USER) return ws.send(JSON.stringify({type:'state',state:'failed',reason:'session_limit'}));
      const host=db.prepare('SELECT * FROM hosts WHERE id=? AND user_id=?').get(m.hostId,userId) as any; if(!host) return;
      try{await validateTarget(host.hostname,host.port,env.ADMIN_ALLOW_PRIVATE_NETWORKS);}catch{ws.send(JSON.stringify({type:'state',state:'blocked by security policy'}));return;}
      const sid=uuid(); const ssh=new Client(); sessions.set(sid,{userId,hostId:host.id,ssh,ws,status:'connecting'});
      ssh.on('error',()=>ws.send(JSON.stringify({type:'state',sessionId:sid,state:'failed'}))).on('close',()=>{ws.send(JSON.stringify({type:'state',sessionId:sid,state:'disconnected'})); sessions.delete(sid); db.prepare('UPDATE sessions SET status=?,ended_at=? WHERE id=?').run('disconnected',new Date().toISOString(),sid); audit(userId,'connection.end',sid);});
      ssh.on('ready',()=>{sessions.get(sid)!.status='connected'; ws.send(JSON.stringify({type:'state',sessionId:sid,state:'connected'})); ssh.shell({term:'xterm-256color',cols:m.cols||120,rows:m.rows||30},(err,stream)=>{if(err){ws.send(JSON.stringify({type:'state',state:'failed'}));return;} sessions.get(sid)!.stream=stream; stream.on('data',(d:Buffer)=>ws.send(JSON.stringify({type:'output',sessionId:sid,data:d.toString('utf8')})));});});
      const identity = host.identity_id ? db.prepare('SELECT * FROM identities WHERE id=? AND user_id=?').get(host.identity_id,userId) as any : null;
      const secret = m.connectOnce?.secret || (identity ? decryptSecret(identity.encrypted_secret,env.ENCRYPTION_KEY):null);
      const passphrase = m.connectOnce?.passphrase || (identity?.encrypted_passphrase ? decryptSecret(identity.encrypted_passphrase,env.ENCRYPTION_KEY):undefined);
      ssh.connect({host:host.hostname,port:host.port,username:host.ssh_username,readyTimeout:env.SSH_CONNECT_TIMEOUT_MS,hostHash:'sha256',hostVerifier:(hashed,key)=>{const fp=sshUtils.parseKey(key).getFingerprint('sha256').toString('hex'); const row=db.prepare('SELECT * FROM trusted_host_keys WHERE user_id=? AND host_id=?').get(userId,host.id) as any; if(!row){ws.send(JSON.stringify({type:'fingerprint_required',sessionId:sid,fingerprint:fp})); sessions.delete(sid); ssh.end(); return false;} return row.fingerprint===fp;}, ...(identity?.type==='privateKey'?{privateKey:secret,passphrase}:{password:secret})});
      db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?,?)').run(sid,userId,host.id,'connecting',new Date().toISOString(),null); audit(userId,'connection.start',sid);
    }
    if(m.type==='trust_fingerprint'){db.prepare('INSERT OR REPLACE INTO trusted_host_keys VALUES (?,?,?,?,?,?)').run(uuid(),userId,m.hostId,m.fingerprint,'sha256',new Date().toISOString());}
    if(m.type==='input') sessions.get(m.sessionId)?.stream?.write(m.data);
    if(m.type==='resize') sessions.get(m.sessionId)?.stream?.setWindow(m.rows,m.cols,0,0);
    if(m.type==='disconnect'){sessions.get(m.sessionId)?.ssh.end(); sessions.delete(m.sessionId);}
  });
  ws.on('close',()=>{for(const [id,s] of sessions){if(s.ws===ws){s.ssh.end(); sessions.delete(id);}}});
});

server.listen(env.PORT,()=>console.log(`server ${env.PORT}`));
