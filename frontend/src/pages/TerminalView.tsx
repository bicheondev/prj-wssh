import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export function TerminalView({ host }: { host: string }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = new Terminal({ fontSize: 14, fontFamily: 'JetBrains Mono, Menlo, monospace', cursorBlink: true, theme: { background: '#081025', foreground: '#d7deed', cursor: '#69f0a1', selectionBackground: '#24335f' } });
    const fit = new FitAddon();
    term.loadAddon(fit); term.open(el.current!); fit.fit();
    term.writeln(`Connected to ${host}`);
    term.writeln('Last login: Fri May 24 09:32:11 2024 from 203.0.113.5');
    term.write('\r\nroot@' + host + ':~# ');
    return () => term.dispose();
  }, [host]);

  return <div className='terminal-wrap'><div ref={el} className='terminal-canvas' /></div>;
}
