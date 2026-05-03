import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TerminalView } from './pages/TerminalView';
import { useSessionStore } from './state/sessions';
import './styles.css';

type Host = { id: string; display_name: string; hostname: string; port: number; ssh_username: string; group_name?: string; favorite?: number };

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hosts, setHosts] = useState<Host[]>([]);
  const [activeHostId, setActiveHostId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [settings,setSettings]=useState({theme:'dark',font_size:13,font_family:'JetBrains Mono',layout_density:'compact',scrollback_lines:10000});
  const [sync,setSync]=useState<'local only'|'synced'|'sync error'>('local only');
  const [recent,setRecent]=useState<any[]>([]);
  const sessions = useSessionStore((s) => s.sessions); const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const addSession = useSessionStore((s) => s.addSession); const removeSession = useSessionStore((s) => s.removeSession); const setActive = useSessionStore((s) => s.setActive);

  useEffect(() => { if (!token) return; fetch('/api/hosts', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : Promise.reject()).then((data: Host[]) => { setHosts(data); if (data[0]) setActiveHostId(data[0].id); });
    fetch('/api/settings',{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()).then(setSettings).catch(()=>setSync('sync error'));
    fetch('/api/recent-sessions',{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()).then(setRecent);
  }, [token]);

  const filtered = useMemo(() => hosts.filter((h) => `${h.display_name} ${h.hostname}`.toLowerCase().includes(query.toLowerCase())), [hosts, query]);
  const activeHost = hosts.find((h) => h.id === activeHostId); const activeSession = sessions.find((s)=>s.id===activeSessionId);
  async function login(){const r=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})});if(!r.ok)return;const d=await r.json();localStorage.setItem('token',d.token);setToken(d.token)}
  async function saveSettings(patch:any){const next={...settings,...patch,last_active_session_id:activeSessionId};setSettings(next);const r=await fetch('/api/settings',{method:'PUT',headers:{'content-type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(next)});setSync(r.ok?'synced':'sync error')}
  function createTab(){if(!activeHost)return; const id=crypto.randomUUID(); addSession({id,hostId:activeHost.id,hostLabel:activeHost.display_name,title:activeHost.display_name,state:'idle',createdAt:Date.now(),lastActivityAt:Date.now()})}

  if(!token) return <div className='auth'><h1>WebTermius</h1><input placeholder='email' value={email} onChange={e=>setEmail(e.target.value)}/><input type='password' placeholder='password' value={password} onChange={e=>setPassword(e.target.value)}/><button onClick={login}>Sign in</button></div>;
  return <div className='wt-app'><nav className='wt-rail'>{['⌘','🖥','📄','🔑','⚙'].map((i,idx)=><button key={idx} className={idx===1?'on':''}>{i}</button>)}</nav>
  <aside className='wt-sidebar'><h1>WebTermius</h1><div className='search'><input placeholder='Search hosts…' value={query} onChange={e=>setQuery(e.target.value)}/></div><h3>Hosts</h3>{!filtered.length?<div className='empty'>No hosts yet</div>:filtered.map(h=><button key={h.id} className={`host ${activeHostId===h.id?'active':''}`} onClick={()=>setActiveHostId(h.id)}><span><strong>{h.display_name}</strong><small>{h.ssh_username}@{h.hostname}</small></span><i className='dot on'/></button>)}<h4>Recent Sessions</h4>{recent.map(r=><p key={r.id}>{r.tab_title||r.host_id} · {r.status}</p>)}</aside>
  <section className='wt-main'><header className='tabs'>{sessions.map(s=><button key={s.id} className={s.id===activeSessionId?'active':''} onClick={()=>setActive(s.id)}><span className={`tab-dot ${s.state==='connected'?'on':s.state==='disconnected'?'off':''}`}/> {s.title} <b onClick={e=>{e.stopPropagation();removeSession(s.id)}}>×</b></button>)}<button onClick={createTab}>＋</button></header>
  <TerminalView token={token} sessions={sessions} activeSessionId={activeSessionId} hosts={hosts} scrollback={settings.scrollback_lines} fontFamily={settings.font_family} fontSize={settings.font_size}/>
  <footer className='status'><span>Sync: {sync}</span><span className='green'>● {activeSession?.state||'idle'}</span><span>{activeSession?.hostLabel||'No session'}</span></footer></section>
  <aside className='wt-inspector'><h2>Session Info</h2><dl><dt>Host</dt><dd>{activeSession?.hostLabel||'-'}</dd><dt>State</dt><dd>{activeSession?.state||'-'}</dd></dl><h3>Connected Accounts</h3><button>Connect Google (coming soon)</button><button>Connect Oracle Cloud (coming soon)</button><h3>Terminal Settings</h3><label>Font size<input value={settings.font_size} onChange={e=>saveSettings({font_size:Number(e.target.value)})}/></label><label>Font<input value={settings.font_family} onChange={e=>saveSettings({font_family:e.target.value})}/></label><label>Scrollback<input value={settings.scrollback_lines} onChange={e=>saveSettings({scrollback_lines:Number(e.target.value)})}/></label><p>Hints: screen copy mode Ctrl+A then [ ; tmux copy mode Ctrl+B then [</p></aside></div>;
}
createRoot(document.getElementById('root')!).render(<App />);
