import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../api.js';

function KpiCard({ label, value, color, icon, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '20px 24px',
        boxShadow: hovered && onClick ? '0 4px 16px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.06)',
        flex: 1,
        cursor: onClick ? 'pointer' : 'default',
        border: hovered && onClick ? `2px solid ${color}40` : '2px solid transparent',
        transition: 'all 0.18s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 22, background: color + '18', padding: '6px 8px', borderRadius: 8 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 32, color: color }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = { 'Empanelled': '#27AE60', 'In Evaluation': '#F39C12', 'On Hold': '#E74C3C', 'Archived': '#95A5A6' };
  const bg = { 'Empanelled': '#F0FFF4', 'In Evaluation': '#FFFBF0', 'On Hold': '#FFF5F5', 'Archived': '#F5F5F5' };
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: colors[status] || '#888', background: bg[status] || '#F5F5F5' }}>{status}</span>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/dashboard/stats').then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  const maxDomainCount = stats?.domains?.length ? Math.max(...stats.domains.map(d => d.count)) : 1;

  return (
    <Layout title="Dashboard">
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>Loading dashboard...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 28 }}>
            <KpiCard label="Total Vendors" value={stats?.total || 0} color="#1C3C6E" icon="🏢" onClick={() => navigate('/vendors')} />
            <KpiCard label="Empanelled" value={stats?.empanelled || 0} color="#27AE60" icon="✅" onClick={() => navigate('/vendors?status=Empanelled')} />
            <KpiCard label="In Evaluation" value={stats?.inEval || 0} color="#F39C12" icon="🔍" onClick={() => navigate('/vendors?status=In+Evaluation')} />
            <KpiCard label="Contracts Expiring (90d)" value={stats?.expiring || 0} color="#E74C3C" icon="⚠️" onClick={() => navigate('/vendors?expiring=true')} />
          </div>

          {/* Lower row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Domain Coverage */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontFamily: 'Montserrat', fontSize: 15, color: '#1C3C6E', marginBottom: 20 }}>Domain Coverage</h3>
              {!stats?.domains?.length ? (
                <p style={{ color: '#aaa', fontSize: 14 }}>No domain data yet. Add vendors with domains to see coverage.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {stats.domains.map((d, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: '#444' }}>{d.domain}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1C3C6E' }}>{d.count}</span>
                      </div>
                      <div style={{ height: 8, background: '#F0F4F8', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(d.count / maxDomainCount) * 100}%`, background: '#29ABE2', borderRadius: 4, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recently Added */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontFamily: 'Montserrat', fontSize: 15, color: '#1C3C6E' }}>Recently Added Vendors</h3>
                <span onClick={() => navigate('/vendors')} style={{ fontSize: 13, color: '#29ABE2', cursor: 'pointer', fontWeight: 600 }}>View all →</span>
              </div>
              {!stats?.recentVendors?.length ? (
                <p style={{ color: '#aaa', fontSize: 14 }}>No vendors yet. <span onClick={() => navigate('/vendors/add')} style={{ color: '#29ABE2', cursor: 'pointer' }}>Add your first vendor.</span></p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {stats.recentVendors.map(v => (
                    <div key={v.id} onClick={() => navigate(`/vendors/${v.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F5F6FA'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: v.logo_color || '#1C3C6E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                        {v.logo_initial || v.name[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#1C3C6E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{v.domains?.slice(0, 2).join(', ') || v.vendor_type || 'No domains'}</div>
                      </div>
                      <StatusBadge status={v.empanelment_status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
