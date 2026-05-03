import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { TerminalView } from './pages/TerminalView';
import { SettingsPage } from './pages/SettingsPage';
import './styles.css';

function App() {
  return <BrowserRouter><div className='app'><aside><h2>Hosts</h2><Link to='/'>Terminal</Link><Link to='/settings'>Settings</Link></aside><main><Routes><Route path='/' element={<TerminalView/>}/><Route path='/settings' element={<SettingsPage/>}/></Routes></main></div></BrowserRouter>;
}
createRoot(document.getElementById('root')!).render(<App />);
