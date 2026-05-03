import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TerminalView } from './pages/TerminalView';
import './styles.css';

type Host = { id: string; display_name: string; hostname: string; port: number; ssh_username: string; group_name?: string; favorite?: number };
type ConnState = 'idle' | 'connecting' | 'fingerprint_required' | 'connected' | 'disconnected' | 'failed';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hosts, setHosts] = useState<Host[]>([]);
  const [activeHostId, setActiveHostId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [state, setState] = useState<ConnState>('idle');
  const [fingerprint, setFingerprint] = useState<{hostId:string; value:string}|null>(null);

  useEffect(() => {
    if (!token) return;
    fetch('/api/hosts', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: Host[]) => { setHosts(data); if (data[0]) setActiveHostId(data[0].id); })
      .catch(() => setToken(''));
  }, [token]);

  const filtered = useMemo(() => hosts.filter((h) => `${h.display_name} ${h.hostname}`.toLowerCase().includes(query.toLowerCase())), [hosts, query]);
  const activeHost = hosts.find((h) => h.id === activeHostId);

  async function login() {
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (!res.ok) return alert('Login failed');
    const data = await res.json();
    localStorage.setItem('token', data.token); setToken(data.token);
  }

  if (!token) return <div className='auth'><h1>WebTermius</h1><input placeholder='email' value={email} onChange={e=>setEmail(e.target.value)} /><input type='password' placeholder='password' value={password} onChange={e=>setPassword(e.target.value)} /><button onClick={login}>Sign in</button></div>;

  return <div className='wt-app'>
    <nav className='wt-rail'>{['⌘', '🖥', '📄', '🔑', '⚙'].map((i, idx) => <button key={idx} className={idx === 1 ? 'on' : ''}>{i}</button>)}</nav>
    <aside className='wt-sidebar'>
      <header><h1>WebTermius</h1></header>
      <div className='search'><input placeholder='Search hosts…' value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      <h3>Hosts</h3>
      {filtered.map((h) => <button key={h.id} className={`host ${activeHostId === h.id ? 'active' : ''}`} onClick={() => { setActiveHostId(h.id); setState('idle'); }}><span><strong>{h.display_name}</strong><small>{h.ssh_username}@{h.hostname}</small></span><i className='dot on' /></button>)}
      <div className='recent'><h3>Status</h3><p>{state}</p><button onClick={()=>{localStorage.removeItem('token');setToken('');}}>Logout</button></div>
    </aside>

    <section className='wt-main'>
      <header className='tabs'><button className='active'>{activeHost?.display_name || 'No host'}<span className='green' /></button></header>
      <TerminalView token={token} host={activeHost} onState={setState} onFingerprint={setFingerprint} />
      <footer className='status'><span>🔒 SSH</span><span className='green'>● {state}</span><span>Auto</span></footer>
    </section>

    <aside className='wt-inspector'>
      <h2>Session Info</h2>
      <dl><dt>Host</dt><dd>{activeHost?.display_name || '-'}</dd><dt>Address</dt><dd>{activeHost?.hostname || '-'}</dd><dt>User</dt><dd>{activeHost?.ssh_username || '-'}</dd><dt>Port</dt><dd>{activeHost?.port || '-'}</dd></dl>
      <h3>Quick Actions</h3>
      <button>Upload file</button><button>Download file</button><button>New terminal</button>
    </aside>

    {fingerprint && <div className='modal'><div className='card'><h3>Trust Host Fingerprint?</h3><p>{fingerprint.value}</p><button onClick={async()=>{await fetch('/api/hosts'); setFingerprint(null);}}>Cancel</button><button onClick={()=>{window.dispatchEvent(new CustomEvent('trust-fingerprint',{detail:fingerprint}));setFingerprint(null);}}>Trust</button></div></div>}
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
