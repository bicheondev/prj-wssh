import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export function TerminalView() {
  const ref = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal>();
  const fit = useRef(new FitAddon());
  const [status, setStatus] = useState('disconnected');

  useEffect(() => {
    const term = new Terminal({ fontFamily: 'JetBrains Mono, monospace', theme: { background: '#111827', foreground: '#e5e7eb' } });
    term.loadAddon(fit.current);
    term.open(ref.current!);
    fit.current.fit();
    term.writeln('Welcome to WebSSH');
    termRef.current = term;

    fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'demo' }) })
      .then((r) => r.json()).then(async ({ token }) => {
        const ws = new WebSocket(`${location.origin.replace('http', 'ws')}/ws/terminal?token=${token}`);
        setStatus('connecting');
        ws.onopen = () => setStatus('connected');
        ws.onclose = () => setStatus('disconnected');
        ws.onerror = () => setStatus('error');
        ws.onmessage = (e) => { const msg = JSON.parse(e.data); if (msg.type === 'output') term.write(msg.data); };
        term.onData((d) => ws.send(JSON.stringify({ type: 'input', sessionId: localStorage.getItem('sid'), data: d })));
        window.addEventListener('resize', () => {
          fit.current.fit();
          ws.send(JSON.stringify({ type: 'resize', sessionId: localStorage.getItem('sid'), cols: term.cols, rows: term.rows }));
        });
        const sessionResp = await fetch('/api/sessions/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ hostId: localStorage.getItem('hostId') }) });
        const sessionData = await sessionResp.json();
        localStorage.setItem('sid', sessionData.sessionId);
      });

    return () => term.dispose();
  }, []);

  return <section><header>State: {status}</header><div ref={ref} style={{ height: '75vh' }} /></section>;
}
