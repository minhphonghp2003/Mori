import React from 'react';
import { AppProvider } from './context/AppContext';
import { MobileShell } from './components/layout/MobileShell';

export default function App() {
  return (
    <AppProvider>
      <MobileShell />
    </AppProvider>
  );
}
