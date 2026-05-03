import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export function TerminalView(){const div=useRef<HTMLDivElement>(null); const [status,setStatus]=useState('idle');
useEffect(()=>{const t=new Terminal({allowPaste:true,fontSize:14,theme:{background:'#05070b',foreground:'#e4e7ee'}}); const fit=new FitAddon(); t.loadAddon(fit); t.open(div.current!); fit.fit(); t.writeln('Select a host and connect.'); setStatus('idle'); return ()=>t.dispose();},[]);
return <div><div className='status'>Session: {status}</div><div ref={div} style={{height:'75vh'}}/></div>;}
