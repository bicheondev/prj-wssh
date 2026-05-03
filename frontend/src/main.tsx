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
  const [newHost, setNewHost] = useState(false);
  const sessions = useSessionStore((s) => s.sessions); const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const addSession = useSessionStore((s) => s.addSession); const removeSession = useSessionStore((s) => s.removeSession); const setActive = useSessionStore((s) => s.setActive);

  useEffect(() => { if (!token) return; fetch('/api/hosts', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : Promise.reject()).then((data: Host[]) => { setHosts(data); if (data[0]) setActiveHostId(data[0].id); }).catch(() => setToken('')); }, [token]);
  const filtered = useMemo(() => hosts.filter((h) => `${h.display_name} ${h.hostname}`.toLowerCase().includes(query.toLowerCase())), [hosts, query]);
  const activeHost = hosts.find((h) => h.id === activeHostId);
  const activeSession = sessions.find((s) => s.id === activeSessionId);

  async function login() { const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) }); if (!res.ok) return alert('Login failed'); const data = await res.json(); localStorage.setItem('token', data.token); setToken(data.token); }
  function createTab() { if (!activeHost) return; const id = crypto.randomUUID(); addSession({ id, hostId: activeHost.id, hostLabel: activeHost.display_name, title: activeHost.display_name, state: 'idle', createdAt: Date.now(), lastActivityAt: Date.now() }); }
  async function createHost(form: any){const res=await fetch('/api/hosts',{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(form)});if(res.ok){setNewHost(false);const data=await fetch('/api/hosts',{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json());setHosts(data);}}

  if (!token) return <div className='auth'><h1>WebTermius</h1><input placeholder='email' value={email} onChange={e=>setEmail(e.target.value)} /><input type='password' placeholder='password' value={password} onChange={e=>setPassword(e.target.value)} /><button onClick={login}>Sign in</button></div>;
  return <div className='wt-app'>
    <nav className='wt-rail'>{['⌘', '🖥', '📄', '🔑', '⚙'].map((i, idx) => <button key={idx} className={idx === 1 ? 'on' : ''}>{i}</button>)}</nav>
    <aside className='wt-sidebar'><header><h1>WebTermius</h1></header><div className='search'><input placeholder='Search hosts…' value={query} onChange={(e) => setQuery(e.target.value)} /></div><button className='new-host' onClick={()=>setNewHost(true)}>+ New Host</button><h3>Hosts</h3>{!filtered.length?<div className='empty'>No hosts yet</div>:filtered.map((h) => <button key={h.id} className={`host ${activeHostId === h.id ? 'active' : ''}`} onClick={() => setActiveHostId(h.id)}><span><strong>{h.display_name}</strong><small>{h.ssh_username}@{h.hostname}</small></span><i className='dot on' /></button>)}</aside>
    <section className='wt-main'><header className='tabs'>{sessions.map(s=><button key={s.id} className={s.id===activeSessionId?'active':''} onClick={()=>setActive(s.id)}><span className={`tab-dot ${s.state==='connected'?'on':s.state==='disconnected'?'off':''}`}/> {s.title} <b onClick={(e)=>{e.stopPropagation();removeSession(s.id);}}>×</b></button>)}<button onClick={createTab}>＋</button></header>
      <TerminalView token={token} sessions={sessions} activeSessionId={activeSessionId} hosts={hosts} />
      <footer className='status'><span>🔒 SSH</span><span className='green'>● {activeSession?.state || 'idle'}</span><span>{activeSession?.hostLabel || 'No session'}</span></footer>
    </section>
    <aside className='wt-inspector'><h2>Session Info</h2><dl><dt>Host</dt><dd>{activeSession?.hostLabel || '-'}</dd><dt>State</dt><dd>{activeSession?.state || '-'}</dd><dt>Created</dt><dd>{activeSession ? new Date(activeSession.createdAt).toLocaleTimeString() : '-'}</dd></dl>{activeSession && (activeSession.state==='disconnected'||activeSession.state==='failed') && <p>Use reconnect in terminal toolbar.</p>}</aside>
    {newHost && <NewHostModal onClose={()=>setNewHost(false)} onSave={createHost} />}
  </div>;
}

function NewHostModal({onClose,onSave}:{onClose:()=>void;onSave:(f:any)=>void}){const [f,set]=useState({displayName:'',hostname:'',port:22,sshUsername:'',groupName:'',favorite:false,connectOncePassword:''});
return <div className='modal'><div className='card'><h3>New Host</h3>{Object.entries(f).map(([k,v])=><input key={k} placeholder={k} value={String(v)} onChange={e=>set({...f,[k]:k==='favorite'?e.target.value==='true':k==='port'?Number(e.target.value):e.target.value})}/>)}<button onClick={onClose}>Cancel</button><button onClick={()=>onSave(f)}>Save</button></div></div>}

createRoot(document.getElementById('root')!).render(<App />);
