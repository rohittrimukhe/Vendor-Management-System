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
      </div>
    </div>
  );
}
