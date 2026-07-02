import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../api.js';

const NAVY = '#1C3C6E';
const BLUE = '#29ABE2';

function KpiCard({ label, value, color, icon, onClick, sub }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff', borderRadius: 12, padding: '20px 24px',
        boxShadow: hovered && onClick ? '0 4px 16px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.06)',
        flex: 1, cursor: onClick ? 'pointer' : 'default',
        border: hovered && onClick ? `2px solid ${color}40` : '2px solid transparent',
        transition: 'all 0.18s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 22, background: color + '18', padding: '6px 8px', borderRadius: 8 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 32, color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = { 'Empanelled': '#27AE60', 'In Evaluation': '#F39C12', 'On Hold': '#E74C3C', 'Archived': '#95A5A6' };
  const bg = { 'Empanelled': '#F0FFF4', 'In Evaluation': '#FFFBF0', 'On Hold': '#FFF5F5', 'Archived': '#F5F5F5' };
  return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: colors[status] || '#888', background: bg[status] || '#F5F5F5' }}>{status}</span>;
}

function DonutChart({ segments }) {
  if (!segments || !segments.length) return null;
  const total = segments.reduce((s, x) => s + x.count, 0);
  if (!total) return null;
  let cumulative = 0;
  const gradientParts = segments.map(s => {
    const pct = (s.count / total) * 100;
    const start = cumulative;
    cumulative += pct;
    return `${s.color} ${start.toFixed(1)}% ${cumulative.toFixed(1)}%`;
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ width: 120, height: 120, borderRadius: '50%', background: `conic-gradient(${gradientParts.join(', ')})` }} />
        <div style={{ position: 'absolute', inset: 22, borderRadius: '50%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 22, color: NAVY, lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>total</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#444' }}>{s.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginLeft: 8 }}>{s.count}</span>
            <span style={{ fontSize: 11, color: '#aaa' }}>({Math.round((s.count / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
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
  const maxSpend = stats?.topSpend?.length ? Math.max(...stats.topSpend.map(s => s.total)) : 1;

  const statusSegments = stats ? [
    { label: 'Empanelled', count: stats.empanelled || 0, color: '#27AE60' },
    { label: 'In Evaluation', count: stats.inEval || 0, color: '#F39C12' },
    { label: 'On Hold', count: stats.onHold || 0, color: '#E74C3C' },
    { label: 'Archived', count: stats.archived || 0, color: '#95A5A6' },
  ].filter(s => s.count > 0) : [];

  return (
    <Layout title="Dashboard">
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>Loading dashboard...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            <KpiCard label="Total Vendors" value={stats?.total || 0} color={NAVY} icon="🏢" onClick={() => navigate('/vendors')} />
            <KpiCard label="Empanelled" value={stats?.empanelled || 0} color="#27AE60" icon="✅" onClick={() => navigate('/vendors?status=Empanelled')} />
            <KpiCard label="In Evaluation" value={stats?.inEval || 0} color="#F39C12" icon="🔍" onClick={() => navigate('/vendors?status=In+Evaluation')} />
            <KpiCard label="Expiring (90d)" value={stats?.expiring || 0} color="#E74C3C" icon="⚠️" sub="contracts expiring" onClick={() => navigate('/vendors?expiring=true')} />
            {(stats?.openTasks > 0 || stats?.overdueTasks > 0) && (
              <KpiCard label="Open Tasks" value={stats?.openTasks || 0} color={stats?.overdueTasks > 0 ? '#E74C3C' : '#8E44AD'} icon="📋" sub={stats?.overdueTasks > 0 ? `${stats.overdueTasks} overdue` : 'action items'} onClick={() => navigate('/tasks')} />
            )}
            {stats?.totalSpend > 0 && (
              <KpiCard label="Active Contract Value" value={`₹${(stats.totalSpend / 100000).toFixed(1)}L`} color="#16A085" icon="💰" sub="total active contracts" onClick={() => navigate('/analytics')} />
            )}
          </div>

          {/* Middle row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontFamily: 'Montserrat', fontSize: 15, color: NAVY, marginBottom: 20 }}>Vendor Status Distribution</h3>
              {statusSegments.length === 0 ? (
                <p style={{ color: '#aaa', fontSize: 14 }}>No vendors yet.</p>
              ) : (
                <DonutChart segments={statusSegments} />
              )}
            </div>

            <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontFamily: 'Montserrat', fontSize: 15, color: NAVY, marginBottom: 20 }}>Top Vendors by Contract Value</h3>
              {!stats?.topSpend?.length || stats.topSpend.every(s => !s.total) ? (
                <p style={{ color: '#aaa', fontSize: 14 }}>No contract values recorded yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {stats.topSpend.filter(s => s.total > 0).map(s => (
                    <div key={s.id} onClick={() => navigate(`/vendors/${s.id}`)} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 22, height: 22, borderRadius: 5, background: s.logo_color || NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>{s.logo_initial || s.name[0]}</div>
                          <span style={{ fontSize: 13, color: '#444' }}>{s.name}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>₹{(s.total / 100000).toFixed(1)}L</span>
                      </div>
                      <div style={{ height: 6, background: '#F0F4F8', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${(s.total / maxSpend) * 100}%`, background: BLUE, borderRadius: 3, transition: 'width 0.6s' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lower row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontFamily: 'Montserrat', fontSize: 15, color: NAVY, marginBottom: 20 }}>Domain Coverage</h3>
              {!stats?.domains?.length ? (
                <p style={{ color: '#aaa', fontSize: 14 }}>No domain data yet. Add vendors with domains to see coverage.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {stats.domains.map((d, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 13, color: '#444' }}>{d.domain}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{d.count}</span>
                      </div>
                      <div style={{ height: 7, background: '#F0F4F8', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(d.count / maxDomainCount) * 100}%`, background: BLUE, borderRadius: 4, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontFamily: 'Montserrat', fontSize: 15, color: NAVY }}>Recently Added Vendors</h3>
                <span onClick={() => navigate('/vendors')} style={{ fontSize: 13, color: BLUE, cursor: 'pointer', fontWeight: 600 }}>View all →</span>
              </div>
              {!stats?.recentVendors?.length ? (
                <p style={{ color: '#aaa', fontSize: 14 }}>No vendors yet. <span onClick={() => navigate('/vendors/add')} style={{ color: BLUE, cursor: 'pointer' }}>Add your first vendor.</span></p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {stats.recentVendors.map(v => (
                    <div key={v.id} onClick={() => navigate(`/vendors/${v.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F5F6FA'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ width: 38, height: 38, borderRadius: 9, background: v.logo_color || NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                        {v.logo_initial || v.name[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</div>
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
