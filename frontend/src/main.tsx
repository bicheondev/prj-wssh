import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TerminalView } from './pages/TerminalView';
import './styles.css';

function App(){const [tab,setTab]=useState('terminal');const [query,setQuery]=useState(''); const hosts=useMemo(()=>[],[]);
return <div className='shell'><aside><h1>WebSSH</h1><input placeholder='Search hosts' value={query} onChange={e=>setQuery(e.target.value)}/><button>+ New Host</button><h3>Favorites</h3><h3>Groups</h3><h3>Recent Sessions</h3><div className='profile'>Account</div></aside><section><header><div className='tabs'><button onClick={()=>setTab('terminal')}>Terminal</button><button>+ Tab</button><button>Split</button></div><button>Settings</button></header>{tab==='terminal'&&<TerminalView/>}</section><aside className='right'><h3>Session Info</h3><h3>Host Info</h3><h3>Quick Actions</h3><h3>Terminal Settings</h3></aside></div>}
createRoot(document.getElementById('root')!).render(<App/>);
