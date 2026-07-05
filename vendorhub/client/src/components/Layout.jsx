import React, { useContext, useEffect, useRef } from 'react';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import { ThemeContext } from '../App.jsx';

export default function Layout({ children, title }) {
  const { dark } = useContext(ThemeContext);
  const mainRef = useRef();

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.classList.remove('page-enter');
      void mainRef.current.offsetWidth;
      mainRef.current.classList.add('page-enter');
    }
  }, [title]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: dark ? '#0D1117' : '#F0F4FA' }}>
      <Sidebar />
      <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header title={title} />
        <main ref={mainRef} className="page-enter" style={{ flex: 1, padding: 28 }}>
          {children}
        </main>
        <footer style={{
          borderTop: dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(232,236,240,0.8)',
          background: dark ? 'rgba(13,17,23,0.8)' : 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(8px)',
          padding: '12px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        }}>
          <span style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.3)' : '#aaa', fontWeight: 500 }}>
            © 2026 LRS Services (West) Mumbai · All Rights Reserved
          </span>
          <span style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.2)' : '#ccc' }}>
            VendorHub · Powered by LRS Services Pvt Ltd
          </span>
        </footer>
      </div>
    </div>
  );
}
