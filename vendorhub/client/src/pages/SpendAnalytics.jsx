import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../api.js';

const NAVY = '#1C3C6E';
const BLUE = '#29ABE2';
const COLORS = ['#1C3C6E','#29ABE2','#27AE60','#F39C12','#8E44AD','#E74C3C','#16A085','#E67E22'];

function fmt(v) {
  if (!v) return '₹0';
  if (v >= 10000000) return `₹${(v/10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v/100000).toFixed(1)}L`;
  return `₹${Number(v).toLocaleString('en-IN')}`;
}

function HBar({ label, value, max, color, sub }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: '#444', fontWeight: 500 }}>{label}</span>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{fmt(value)}</span>
          {sub && <span style={{ fontSize: 11, color: '#aaa', marginLeft: 6 }}>{sub}</span>}
        </div>
      </div>
      <div style={{ height: 10, background: '#EEF0F4', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 5, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function MiniDonut({ segments, size = 100 }) {
  if (!segments?.length) return null;
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (!total) return null;
  let cum = 0;
  const parts = segments.map(s => {
    const pct = (s.value / total) * 100;
    const start = cum;
    cum += pct;
    return `${s.color} ${start.toFixed(1)}% ${cum.toFixed(1)}%`;
  });
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{ width: size, height: size, borderRadius: '50%', background: `conic-gradient(${parts.join(', ')})` }} />
      <div style={{ position: 'absolute', inset: size * 0.2, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <span style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: size * 0.18, color: NAVY }}>{segments.length}</span>
        <span style={{ fontSize: size * 0.1, color: '#aaa' }}>types</span>
      </div>
    </div>
  );
}

export default function SpendAnalytics() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/analytics/spend').then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout title="Spend Analytics"><div style={{ padding: 60, textAlign: 'center', color: '#888' }}>Loading analytics...</div></Layout>;
  if (!data) return <Layout title="Spend Analytics"><div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>No data available.</div></Layout>;

  const { byTier, byType, byDomain, topVendors, monthly, expiringSoon, totals } = data;
  const maxTier = Math.max(...byTier.map(x => x.total), 1);
  const maxType = Math.max(...byType.map(x => x.total), 1);
  const maxDomain = Math.max(...byDomain.map(x => x.total), 1);
  const maxVendor = Math.max(...topVendors.map(x => x.total), 1);
  const maxMonthly = Math.max(...monthly.map(x => x.total), 1);

  const tierSegments = byTier.map((t, i) => ({ label: t.tier, value: t.total, color: COLORS[i % COLORS.length] }));

  const card = (label, value, sub, color = NAVY) => (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', flex: 1 }}>
      <div style={{ fontSize: 12, color: '#888', fontWeight: 500, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 28, color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{sub}</div>}
    </div>
  );

  return (
    <Layout title="Spend Analytics">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', color: NAVY, fontSize: 22, fontWeight: 700, margin: 0 }}>Spend Analytics</h1>
          <p style={{ color: '#888', fontSize: 13, margin: '4px 0 0' }}>Active contract value across your vendor portfolio</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {card('Active Contract Value', fmt(totals?.active_value), `${totals?.active_count || 0} active contracts`, '#27AE60')}
        {card('All-Time Contract Value', fmt(totals?.all_time_value), `${totals?.all_count || 0} total contracts`, NAVY)}
        {card('Vendors with Contracts', topVendors.filter(v => v.total > 0).length, 'across portfolio', BLUE)}
        {card('Expiring in 90 days', expiringSoon.length, 'contracts at risk', '#E74C3C')}
      </div>

      {/* Main charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* By Tier */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontFamily: 'Montserrat', fontSize: 15, color: NAVY, marginBottom: 20 }}>Spend by Tier</h3>
          {!byTier.length || byTier.every(t => !t.total)
            ? <p style={{ color: '#aaa', fontSize: 14 }}>No contract data yet.</p>
            : byTier.filter(t => t.total > 0).map((t, i) => (
              <HBar key={t.tier} label={t.tier} value={t.total} max={maxTier} color={COLORS[i]} sub={`${t.vendors} vendors`} />
            ))
          }
        </div>

        {/* By Type */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontFamily: 'Montserrat', fontSize: 15, color: NAVY, marginBottom: 20 }}>Spend by Vendor Type</h3>
          {!byType.length || byType.every(t => !t.total)
            ? <p style={{ color: '#aaa', fontSize: 14 }}>No contract data yet.</p>
            : (
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <MiniDonut segments={byType.filter(t => t.total > 0).map((t, i) => ({ label: t.type, value: t.total, color: COLORS[i % COLORS.length] }))} size={110} />
                <div style={{ flex: 1 }}>
                  {byType.filter(t => t.total > 0).map((t, i) => (
                    <div key={t.type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#555', flex: 1 }}>{t.type}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{fmt(t.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
        </div>
      </div>

      {/* Monthly trend */}
      {monthly.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Montserrat', fontSize: 15, color: NAVY, marginBottom: 20 }}>Monthly Contract Value Trend (Last 12 Months)</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
            {monthly.map((m, i) => {
              const h = Math.max((m.total / maxMonthly) * 100, 4);
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div title={`${m.month}: ${fmt(m.total)}`} style={{ width: '100%', height: `${h}%`, background: BLUE, borderRadius: '3px 3px 0 0', transition: 'height 0.5s', cursor: 'default' }} />
                  <span style={{ fontSize: 9, color: '#aaa', transform: 'rotate(-40deg)', transformOrigin: 'top left', whiteSpace: 'nowrap', marginTop: 4 }}>{m.month?.slice(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Top vendors */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontFamily: 'Montserrat', fontSize: 15, color: NAVY, marginBottom: 20 }}>Top Vendors by Spend</h3>
          {topVendors.filter(v => v.total > 0).length === 0
            ? <p style={{ color: '#aaa', fontSize: 14 }}>No spend data.</p>
            : topVendors.filter(v => v.total > 0).map((v, i) => (
              <div key={v.id} onClick={() => navigate(`/vendors/${v.id}`)} style={{ cursor: 'pointer', marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 5, background: v.logo_color || NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>{v.logo_initial || v.name[0]}</div>
                    <span style={{ fontSize: 13, color: '#444' }}>{v.name}</span>
                    <span style={{ fontSize: 11, color: '#aaa' }}>{v.contract_count} contracts</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{fmt(v.total)}</span>
                </div>
                <div style={{ height: 7, background: '#F0F4F8', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${(v.total / maxVendor) * 100}%`, background: COLORS[i % COLORS.length], borderRadius: 3, transition: 'width 0.6s' }} />
                </div>
              </div>
            ))
          }
        </div>

        {/* Expiring contracts */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontFamily: 'Montserrat', fontSize: 15, color: NAVY, marginBottom: 20 }}>Contracts Expiring Soon</h3>
          {expiringSoon.length === 0
            ? <p style={{ color: '#aaa', fontSize: 14 }}>No contracts expiring in the next 90 days.</p>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {expiringSoon.map(c => {
                  const urgent = c.days_left <= 30;
                  return (
                    <div key={c.id} onClick={() => navigate(`/vendors/${c.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, background: urgent ? '#FFF5F5' : '#FFFBF0', border: `1px solid ${urgent ? '#FFCDD2' : '#F0E6C0'}`, cursor: 'pointer' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 7, background: c.logo_color || NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{c.logo_initial || c.name[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: NAVY }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>{c.type || 'Contract'} • {c.end_date}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: urgent ? '#E74C3C' : '#F39C12' }}>{c.days_left}d left</div>
                        <div style={{ fontSize: 11, color: '#888' }}>{fmt(c.value)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      </div>

      {/* Domain spend */}
      {byDomain.some(d => d.total > 0) && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginTop: 20 }}>
          <h3 style={{ fontFamily: 'Montserrat', fontSize: 15, color: NAVY, marginBottom: 20 }}>Spend by Service Domain</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
            {byDomain.filter(d => d.total > 0).map((d, i) => (
              <HBar key={d.domain} label={d.domain} value={d.total} max={maxDomain} color={COLORS[i % COLORS.length]} />
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
