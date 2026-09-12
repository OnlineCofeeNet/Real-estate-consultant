import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import Layout from './components/Layout';
import { AuthGate, ProtectedRoute } from './components/AuthGate';
import { hasActiveSession, touchSession } from './services/auth';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Contracts from './pages/Contracts';
import Finance from './pages/Finance';
import Properties from './pages/Properties';
import Settings from './pages/Settings';
import Help from './pages/Help';
import { doAutoBackup, checkAndRestoreAutoBackup } from './utils/BackupManager';
import { useAutoMessages } from './hooks/useAutoMessages';

export default function App() {
  useAutoMessages();
  useEffect(() => {
    checkAndRestoreAutoBackup();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') doAutoBackup();
      if (document.visibilityState === 'visible' && hasActiveSession()) touchSession();
    };
    const handleBeforeUnload = () => doAutoBackup();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => { document.removeEventListener('visibilitychange', handleVisibilityChange); window.removeEventListener('beforeunload', handleBeforeUnload); };
  }, []);
  useEffect(() => {
    let lastTouch = 0;
    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => { const now = Date.now(); if (now - lastTouch < 60_000) return; lastTouch = now; if (hasActiveSession()) touchSession(); };
    activityEvents.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));
    return () => activityEvents.forEach(event => window.removeEventListener(event, handleActivity));
  }, []);
  const settings = useLiveQuery(() => db.settings.get(1));
  useEffect(() => { if (settings) document.body.className = `${settings.theme}-theme ${settings.font}-font ${settings.darkMode ? 'dark-mode' : ''}`; }, [settings]);
  return <BrowserRouter><Toaster position="top-center" /><Routes><Route element={<AuthGate />}><Route element={<Layout />}>
    <Route index element={<Dashboard />} />
    <Route element={<ProtectedRoute permission="contracts" />}><Route path="contracts" element={<Contracts />} /></Route>
    <Route element={<ProtectedRoute permission="finance" />}><Route path="finance" element={<Finance />} /></Route>
    <Route element={<ProtectedRoute permission="customers" />}><Route path="customers" element={<Customers />} /></Route>
    <Route element={<ProtectedRoute permission="properties" />}><Route path="properties" element={<Properties />} /></Route>
    <Route element={<ProtectedRoute permission="settings" />}><Route path="settings" element={<Settings />} /></Route>
    <Route path="help" element={<Help />} />
  </Route></Route></Routes></BrowserRouter>;
}
