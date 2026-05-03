import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Session, useSessionStore } from '../state/sessions';

type Host = { id: string; display_name: string };

export function TerminalView({ token, sessions, activeSessionId, hosts }: { token: string; sessions: Session[]; activeSessionId?: string; hosts: Host[] }) {
  const containers = useRef<Map<string, HTMLDivElement>>(new Map());
  const terms = useRef<Map<string, { term: Terminal; fit: FitAddon; ws: WebSocket; sid?: string; hostId: string }>>(new Map());
  const updateSession = useSessionStore((s) => s.updateSession);

  useEffect(() => {
    sessions.forEach((s) => {
      if (terms.current.has(s.id) || !containers.current.get(s.id)) return;
      const host = hosts.find((h) => h.id === s.hostId); if (!host) return;
      const term = new Terminal({ scrollback: 5000, fontSize: 13, fontFamily: 'JetBrains Mono, Menlo, monospace', theme: { background: '#081025', foreground: '#d7deed', cursor: '#69f0a1' } });
      const fit = new FitAddon(); term.loadAddon(fit); term.open(containers.current.get(s.id)!); fit.fit(); term.writeln('Ready. Connect to start session.');
      const ws = new WebSocket(`${location.origin.replace('http', 'ws')}/ws/terminal?token=${token}`);
      updateSession(s.id, { state: 'connecting' });
      ws.onopen = () => ws.send(JSON.stringify({ type: 'start', hostId: s.hostId, cols: term.cols, rows: term.rows }));
      ws.onclose = () => updateSession(s.id, { state: 'disconnected' });
      ws.onerror = () => updateSession(s.id, { state: 'failed' });
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.sessionId) terms.current.get(s.id)!.sid = m.sessionId;
        if (m.type === 'output') term.write(m.data || '');
        if (m.type === 'state') updateSession(s.id, { state: m.state });
        if (m.type === 'fingerprint_required') updateSession(s.id, { state: 'fingerprint_required', fingerprint: { value: m.fingerprint } });
        if (m.type === 'error') { term.writeln(`\r\n[error] ${m.message}`); if (m.message?.includes('mismatch')) updateSession(s.id, { state: 'failed', fingerprint: { value: m.message, mismatch: true } }); }
      };
      term.attachCustomKeyEventHandler((e)=>{if((e.ctrlKey||e.metaKey)&&e.key==='v'){navigator.clipboard.readText().then(t=>term.paste(t));return false;} return true;});
      term.onData((d) => { const t = terms.current.get(s.id); if (t?.sid) ws.send(JSON.stringify({ type: 'input', sessionId: t.sid, data: d })); });
      terms.current.set(s.id, { term, fit, ws, hostId: s.hostId });
    });
    Array.from(terms.current.keys()).forEach((id) => { if (!sessions.find((s) => s.id === id)) { const t = terms.current.get(id)!; if (t.sid) t.ws.send(JSON.stringify({ type: 'disconnect', sessionId: t.sid })); t.ws.close(); t.term.dispose(); terms.current.delete(id); } });
  }, [sessions, hosts, token, updateSession]);

  useEffect(() => {
    const onResize = () => terms.current.forEach((t) => { t.fit.fit(); if (t.sid) t.ws.send(JSON.stringify({ type: 'resize', sessionId: t.sid, cols: t.term.cols, rows: t.term.rows })); });
    window.addEventListener('resize', onResize); return () => window.removeEventListener('resize', onResize);
  }, []);

  return <div className='terminal-wrap'><div className='terminal-actions'>{activeSessionId && <><button onClick={() => { const t = terms.current.get(activeSessionId); if (t?.sid) t.ws.send(JSON.stringify({ type: 'disconnect', sessionId: t.sid })); }}>Disconnect</button><button onClick={() => { const s = sessions.find(x=>x.id===activeSessionId); const t = terms.current.get(activeSessionId); if (s && t) { t.ws.close(); terms.current.delete(activeSessionId); updateSession(s.id, { state: 'idle' }); } }}>Reconnect</button></>}</div>{sessions.map(s=><div key={s.id} className='terminal-pane' style={{display:s.id===activeSessionId?'block':'none'}}><div ref={(el)=>{if(el) containers.current.set(s.id,el);}} className='terminal-canvas'/>{s.state==='fingerprint_required'&&<div className='overlay warn'>Verify and trust fingerprint from inspector then reconnect.</div>}{(s.state==='failed'||s.state==='disconnected')&&<div className='overlay'>Connection {s.state}. Use reconnect.</div>}</div>)}{!sessions.length&&<div className='placeholder'>Create a tab from a selected host to start.</div>}</div>;
}
