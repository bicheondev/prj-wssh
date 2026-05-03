import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TerminalView } from './pages/TerminalView';
import { useSessionStore } from './state/sessions';
import './styles.css';

type Host = { id: string; display_name: string; hostname: string; port: number; ssh_username: string; group_name?: string; favorite?: number; identity_id?: string };
type Identity = { id: string; name: string; type: string; created_at: string };

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [hosts, setHosts] = useState<Host[]>([]); const [identities, setIdentities] = useState<Identity[]>([]);
  const [activeHostId, setActiveHostId] = useState(''); const [query, setQuery] = useState('');
  const [hostForm, setHostForm] = useState<any>(null); const [identityForm, setIdentityForm] = useState(false);
  const sessions = useSessionStore((s) => s.sessions); const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const addSession = useSessionStore((s) => s.addSession); const removeSession = useSessionStore((s) => s.removeSession); const setActive = useSessionStore((s) => s.setActive);

  const authHeaders = { Authorization: `Bearer ${token}` };
  const load = async () => { const h = await fetch('/api/hosts', { headers: authHeaders }).then(r => r.json()); setHosts(h); if (h[0] && !activeHostId) setActiveHostId(h[0].id); const ids = await fetch('/api/identities', { headers: authHeaders }).then(r=>r.json()); setIdentities(ids); };
  useEffect(() => { if (token) load(); }, [token]);

  const filtered = useMemo(() => hosts.filter((h) => `${h.display_name} ${h.hostname}`.toLowerCase().includes(query.toLowerCase())), [hosts, query]);
  const activeHost = hosts.find((h) => h.id === activeHostId);

  async function login(){const r=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})});if(!r.ok)return;const d=await r.json();localStorage.setItem('token',d.token);setToken(d.token)}
  const createTab=(connectOncePassword='')=>{if(!activeHost)return; addSession({id:crypto.randomUUID(),hostId:activeHost.id,hostLabel:activeHost.display_name,title:activeHost.display_name,state:'idle',createdAt:Date.now(),lastActivityAt:Date.now(), connectOncePassword} as any)};

  async function saveHost(f:any){const payload={displayName:f.display_name,hostname:f.hostname,port:Number(f.port),sshUsername:f.ssh_username,groupName:f.group_name,favorite:!!f.favorite,identityId:f.identity_id}; const method=f.id?'PUT':'POST'; const url=f.id?`/api/hosts/${f.id}`:'/api/hosts'; const r=await fetch(url,{method,headers:{...authHeaders,'content-type':'application/json'},body:JSON.stringify(payload)}); if(r.ok){setHostForm(null); load();}}
  async function deleteHost(id:string){if(!confirm('Delete host?'))return; await fetch(`/api/hosts/${id}`,{method:'DELETE',headers:authHeaders}); load();}
  async function saveIdentity(f:any){const r=await fetch('/api/identities',{method:'POST',headers:{...authHeaders,'content-type':'application/json'},body:JSON.stringify({name:f.name,type:'privateKey',secret:f.private_key,passphrase:f.passphrase})}); if(r.ok){setIdentityForm(false);load();}}

  if(!token) return <div className='auth'><h1>WebTermius</h1><input placeholder='email' value={email} onChange={e=>setEmail(e.target.value)}/><input type='password' placeholder='password' value={password} onChange={e=>setPassword(e.target.value)}/><button onClick={login}>Sign in</button></div>;
  return <div className='wt-app'><nav className='wt-rail'>{['⌘','🖥','📄','🔑','⚙'].map((i,idx)=><button key={idx} className={idx===1?'on':''}>{i}</button>)}</nav>
  <aside className='wt-sidebar'><h1>WebTermius</h1><div className='search'><input placeholder='Search hosts…' value={query} onChange={e=>setQuery(e.target.value)}/></div><div className='row'><button className='new-host' onClick={()=>setHostForm({display_name:'',hostname:'',port:22,ssh_username:'',group_name:'',favorite:false,identity_id:''})}>+ New Host</button><button className='new-host' onClick={()=>setIdentityForm(true)}>+ Identity</button></div><h3>Hosts</h3>{filtered.map(h=><div key={h.id} className={`host ${activeHostId===h.id?'active':''}`}><button onClick={()=>setActiveHostId(h.id)}><span><strong>{h.display_name}</strong><small>{h.ssh_username}@{h.hostname}</small></span></button><div className='actions'><a onClick={()=>setHostForm(h)}>✎</a><a onClick={()=>deleteHost(h.id)}>🗑</a></div></div>)}</aside>
  <section className='wt-main'><header className='tabs'>{sessions.map(s=><button key={s.id} className={s.id===activeSessionId?'active':''} onClick={()=>setActive(s.id)}>{s.title}<b onClick={e=>{e.stopPropagation();removeSession(s.id)}}>×</b></button>)}<button onClick={()=>createTab()}>＋</button><button onClick={()=>{const pw=prompt('Connect-once password (not saved):')||'';createTab(pw);}}>Connect once</button></header>
  <TerminalView token={token} sessions={sessions as any} activeSessionId={activeSessionId} hosts={hosts as any} scrollback={10000} fontFamily={'JetBrains Mono'} fontSize={13} identities={identities}/></section>
  <aside className='wt-inspector'><h2>Session Info</h2><p>Active host: {activeHost?.display_name||'-'}</p><h3>Identities</h3>{identities.map(i=><p key={i.id}>{i.name}</p>)}</aside>
  {hostForm&&<HostModal value={hostForm} onClose={()=>setHostForm(null)} onSave={saveHost} identities={identities} />}
  {identityForm&&<IdentityModal onClose={()=>setIdentityForm(false)} onSave={saveIdentity} />}
  </div>;
}

function HostModal({value,onClose,onSave,identities}:{value:any;onClose:()=>void;onSave:(v:any)=>void;identities:Identity[]}){const [f,set]=useState(value); return <div className='modal'><div className='card'><h3>{f.id?'Edit Host':'New Host'}</h3><input placeholder='Display name' value={f.display_name} onChange={e=>set({...f,display_name:e.target.value})}/><input placeholder='Hostname' value={f.hostname} onChange={e=>set({...f,hostname:e.target.value})}/><input placeholder='Port' value={f.port} onChange={e=>set({...f,port:e.target.value})}/><input placeholder='SSH username' value={f.ssh_username} onChange={e=>set({...f,ssh_username:e.target.value})}/><input placeholder='Group' value={f.group_name||''} onChange={e=>set({...f,group_name:e.target.value})}/><label><input type='checkbox' checked={!!f.favorite} onChange={e=>set({...f,favorite:e.target.checked})}/> Favorite</label><select value={f.identity_id||''} onChange={e=>set({...f,identity_id:e.target.value})}><option value=''>No identity</option>{identities.map(i=><option value={i.id} key={i.id}>{i.name}</option>)}</select><div><button onClick={onClose}>Cancel</button><button onClick={()=>onSave(f)}>Save</button></div></div></div>}
function IdentityModal({onClose,onSave}:{onClose:()=>void;onSave:(v:any)=>void}){const [f,set]=useState({name:'',private_key:'',passphrase:''});return <div className='modal'><div className='card'><h3>Add SSH Identity</h3><input placeholder='Name' value={f.name} onChange={e=>set({...f,name:e.target.value})}/><textarea placeholder='Private key' value={f.private_key} onChange={e=>set({...f,private_key:e.target.value})}/><input type='password' placeholder='Passphrase (optional)' value={f.passphrase} onChange={e=>set({...f,passphrase:e.target.value})}/><div><button onClick={onClose}>Cancel</button><button onClick={()=>onSave(f)}>Save encrypted</button></div></div></div>}

createRoot(document.getElementById('root')!).render(<App />);
