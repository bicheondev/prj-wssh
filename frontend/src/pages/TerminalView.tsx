import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

type Host = { id: string; display_name: string } | undefined;

export function TerminalView({ token, host, onState, onFingerprint }: { token: string; host: Host; onState: (s: any) => void; onFingerprint: (v: any) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sid = useRef<string | null>(null);

  useEffect(() => {
    if (!host) return;
    const term = new Terminal({ fontSize: 14, fontFamily: 'JetBrains Mono, Menlo, monospace', cursorBlink: true, theme: { background: '#081025', foreground: '#d7deed', cursor: '#69f0a1', selectionBackground: '#24335f' } });
    const fit = new FitAddon();
    term.loadAddon(fit); term.open(el.current!); fit.fit();

    const ws = new WebSocket(`${location.origin.replace('http', 'ws')}/ws/terminal?token=${token}`);
    wsRef.current = ws;
    onState('connecting');
    ws.onopen = () => ws.send(JSON.stringify({ type: 'start', hostId: host.id, cols: term.cols, rows: term.rows }));
    ws.onclose = () => onState('disconnected');
    ws.onerror = () => onState('failed');
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.sessionId) sid.current = m.sessionId;
      if (m.type === 'output') term.write(m.data || '');
      if (m.type === 'state') onState(m.state);
      if (m.type === 'fingerprint_required') { onState('fingerprint_required'); onFingerprint({ hostId: host.id, value: m.fingerprint }); }
      if (m.type === 'error') term.writeln(`\r\n[error] ${m.message}`);
    };

    term.onData((d) => { if (sid.current) ws.send(JSON.stringify({ type: 'input', sessionId: sid.current, data: d })); });
    const onResize = () => { fit.fit(); if (sid.current) ws.send(JSON.stringify({ type: 'resize', sessionId: sid.current, cols: term.cols, rows: term.rows })); };
    window.addEventListener('resize', onResize);
    const trustListener = (ev: any) => ws.send(JSON.stringify({ type: 'trust_fingerprint', hostId: ev.detail.hostId, fingerprint: ev.detail.value }));
    window.addEventListener('trust-fingerprint', trustListener as any);

    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('trust-fingerprint', trustListener as any); if (sid.current) ws.send(JSON.stringify({ type: 'disconnect', sessionId: sid.current })); ws.close(); term.dispose(); sid.current = null; };
  }, [host?.id, token]);

  return <div className='terminal-wrap'><div className='terminal-actions'><button onClick={() => { if (sid.current && wsRef.current) wsRef.current.send(JSON.stringify({ type: 'disconnect', sessionId: sid.current })); }}>Disconnect</button></div><div ref={el} className='terminal-canvas' /></div>;
}
