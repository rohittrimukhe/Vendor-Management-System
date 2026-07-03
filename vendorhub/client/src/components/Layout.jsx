import React, { useContext } from 'react';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import { ThemeContext } from '../App.jsx';

export default function Layout({ children, title }) {
  const { dark } = useContext(ThemeContext);
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: dark ? '#0D1117' : '#F5F6FA' }}>
      <Sidebar />
      <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header title={title} />
        <main style={{ flex: 1, padding: 24 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
