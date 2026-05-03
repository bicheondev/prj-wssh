import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TerminalView } from './pages/TerminalView';
import './styles.css';

type Host = { name: string; user: string; addr: string; fav?: boolean; group: string; status: 'online' | 'idle' };
const hosts: Host[] = [
  { name: 'prod-web-01', user: 'root', addr: '203.0.113.10', fav: true, group: 'Favorites', status: 'online' },
  { name: 'prod-db-01', user: 'ubuntu', addr: '203.0.113.11', fav: true, group: 'Favorites', status: 'online' },
  { name: 'bastion', user: 'ec2-user', addr: '203.0.113.5', fav: true, group: 'Favorites', status: 'online' },
  { name: 'prod-app-01', user: 'ubuntu', addr: '10.0.1.10', group: 'Production', status: 'online' },
  { name: 'prod-cache', user: 'ubuntu', addr: '10.0.1.20', group: 'Production', status: 'idle' }
];

function App() {
  const [active, setActive] = useState('prod-web-01');
  const [query, setQuery] = useState('');
  const [tabs, setTabs] = useState(['prod-web-01', 'prod-db-01', 'bastion']);
  const filtered = useMemo(() => hosts.filter((h) => h.name.includes(query) || h.addr.includes(query)), [query]);
  const activeHost = hosts.find((h) => h.name === active) ?? hosts[0];

  return <div className='wt-app'>
    <nav className='wt-rail'>{['⌘', '🖥', '📄', '🔑', '⚙'].map((i,idx)=><button key={idx} className={idx===1?'on':''}>{i}</button>)}</nav>
    <aside className='wt-sidebar'>
      <header><h1>WebTermius</h1></header>
      <div className='search'><input placeholder='Search hosts…' value={query} onChange={(e)=>setQuery(e.target.value)} /></div>
      <h3>Hosts</h3>
      {['Favorites','Production'].map((g)=><div key={g}><h4>{g}</h4>{filtered.filter(h=>h.group===g).map(h=><button key={h.name} className={`host ${active===h.name?'active':''}`} onClick={()=>setActive(h.name)}><span><strong>{h.name}</strong><small>{h.user}@{h.addr}</small></span><i className={h.status==='online'?'dot on':'dot'} /></button>)}</div>)}
      <div className='recent'><h3>Recent Sessions</h3><p>prod-web-01 · 2m ago</p><p>bastion · 10m ago</p></div>
    </aside>

    <section className='wt-main'>
      <header className='tabs'>{tabs.map(t=><button key={t} className={t===active?'active':''} onClick={()=>setActive(t)}>{t}<span className='green' /></button>)}<button onClick={()=>setTabs([...tabs, `new-${tabs.length}`])}>＋</button></header>
      <TerminalView host={activeHost.name} />
      <footer className='status'><span>🔒 SSH</span><span className='green'>● connected</span><span>Auto</span></footer>
    </section>

    <aside className='wt-inspector'>
      <h2>Session Info</h2>
      <dl><dt>Host</dt><dd>{activeHost.name}</dd><dt>Address</dt><dd>{activeHost.addr}</dd><dt>User</dt><dd>{activeHost.user}</dd><dt>Port</dt><dd>22</dd></dl>
      <h3>Quick Actions</h3>
      <button>Upload file</button><button>Download file</button><button>New terminal</button><button className='danger'>End session</button>
    </aside>
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
