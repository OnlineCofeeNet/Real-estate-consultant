/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Contracts from './pages/Contracts';
import Settings from './pages/Settings';
import Help from './pages/Help';
import { useAutoMessages } from './hooks/useAutoMessages';

export default function App() {
  useAutoMessages();
  const settings = useLiveQuery(() => db.settings.get(1));

  useEffect(() => {
    if (settings) {
      document.body.className = `${settings.theme}-theme ${settings.font}-font ${settings.darkMode ? 'dark-mode' : ''}`;
    }
  }, [settings]);

  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="customers" element={<Customers />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help" element={<Help />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
