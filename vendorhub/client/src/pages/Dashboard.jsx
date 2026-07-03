import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../api.js';

const NAVY = '#1C3C6E';
const BLUE = '#29ABE2';

function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  const raf = useRef();
  useEffect(() => {
    let start = null;
    const from = 0;
    const step = (ts) => {
      if (!start) start = ts;
      const pct = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - pct, 3);
      setVal(Math.round(from + (target - from) * ease));
      if (pct < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return val;
}

const KPI_GRADIENTS = {
  navy:   'linear-gradient(135deg, #1C3C6E 0%, #2E5A9E 100%)',
  green:  'linear-gradient(135deg, #27AE60 0%, #2ECC71 100%)',
  orange: 'linear-gradient(135deg, #F39C12 0%, #F1C40F 100%)',
  red:    'linear-gradient(135deg, #E74C3C 0%, #E67E22 100%)',
  purple: 'linear-gradient(135deg, #8E44AD 0%, #9B59B6 100%)',
  teal:   'linear-gradient(135deg, #16A085 0%, #1ABC9C 100%)',
};

function KpiCard({ label, value, gradient, icon, onClick, sub, delay = 0 }) {
  const numVal = typeof value === 'number' ? value : null;
  const counted = useCountUp(numVal ?? 0, 900);
  const [hovered, setHovered] = useState(false);

  const displayVal = numVal !== null ? counted : value;

  return (
    <div
      className="anim-fadeInUp card-hover btn-press"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 16, padding: '22px 24px', flex: 1, minWidth: 160,
        background: gradient || KPI_GRADIENTS.navy,
        cursor: onClick ? 'pointer' : 'default',
        color: '#fff', position: 'relative', overflow: 'hidden',
        boxShadow: hovered ? '0 12px 32px rgba(28,60,110,0.25)' : '0 4px 16px rgba(28,60,110,0.15)',
        animationDelay: `${delay}ms`,
      }}
    >
      {/* Background pattern */}
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 100, height: 100,
        borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -30, right: 10, width: 70, height: 70,
        borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
        <div style={{ fontSize: 26, background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '4px 6px', lineHeight: 1 }}>{icon}</div>
      </div>
      <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 36, color: '#fff', lineHeight: 1, marginBottom: 6 }} className="count-up">
        {displayVal}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>{sub}</div>}
      {onClick && <div style={{ position: 'absolute', bottom: 12, right: 16, fontSize: 18, opacity: hovered ? 0.9 : 0.3, transition: 'opacity 0.2s' }}>→</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = { 'Empanelled': '#27AE60', 'In Evaluation': '#F39C12', 'On Hold': '#E74C3C', 'Archived': '#95A5A6' };
  const bg = { 'Empanelled': '#F0FFF4', 'In Evaluation': '#FFFBF0', 'On Hold': '#FFF5F5', 'Archived': '#F5F5F5' };
  return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: colors[status] || '#888', background: bg[status] || '#F5F5F5' }}>{status}</span>;
}

function DonutChart({ segments }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 200); return () => clearTimeout(t); }, []);

  if (!segments?.length) return null;
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 130, height: 130, borderRadius: '50%',
          background: `conic-gradient(${gradientParts.join(', ')})`,
          transition: 'transform 0.3s ease',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }} />
        <div style={{
          position: 'absolute', inset: 24, borderRadius: '50%',
          background: '#fff', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 24, color: NAVY, lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: 10, color: '#888', marginTop: 2, fontWeight: 500 }}>total</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {segments.map((s, i) => (
          <div key={i} className="anim-fadeIn" style={{ display: 'flex', alignItems: 'center', gap: 10, animationDelay: `${200 + i * 80}ms` }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0, boxShadow: `0 2px 6px ${s.color}55` }} />
            <span style={{ fontSize: 13, color: '#555' }}>{s.label}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginLeft: 6 }}>{s.count}</span>
            <span style={{ fontSize: 11, color: '#aaa' }}>({Math.round((s.count / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarRow({ label, value, max, color = BLUE, onClick, logo, delay = 0 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => { const t = setTimeout(() => setWidth((value / max) * 100), 150 + delay); return () => clearTimeout(t); }, [value, max, delay]);
  return (
    <div className="anim-fadeIn" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', animationDelay: `${delay}ms` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {logo && <div style={{ width: 22, height: 22, borderRadius: 6, background: logo.color || NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>{logo.initial}</div>}
          <span style={{ fontSize: 13, color: '#444', fontWeight: 500 }}>{label}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{typeof value === 'number' && value > 999 ? `₹${(value / 100000).toFixed(1)}L` : value}</span>
      </div>
      <div style={{ height: 7, background: '#F0F4FA', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${width}%`, background: `linear-gradient(90deg, ${color}, ${color}99)`, borderRadius: 4, transition: 'width 0.9s cubic-bezier(0.22, 1, 0.36, 1)' }} />
      </div>
    </div>
  );
}

function Card({ children, title, action, style }) {
  return (
    <div className="anim-fadeInUp" style={{ background: '#fff', borderRadius: 16, padding: 26, boxShadow: '0 4px 20px rgba(28,60,110,0.07)', border: '1px solid rgba(232,236,240,0.6)', ...style }}>
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h3 style={{ fontFamily: 'Montserrat', fontSize: 15, color: NAVY, fontWeight: 700, margin: 0 }}>{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ borderRadius: 16, padding: '22px 24px', flex: 1, minWidth: 160, background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
      <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 36, width: '40%', marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 10, width: '70%' }} />
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
        <div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ borderRadius: 16, height: 220 }} />)}
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="stagger" style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            <KpiCard label="Total Vendors" value={stats?.total || 0} gradient={KPI_GRADIENTS.navy} icon="🏢" onClick={() => navigate('/vendors')} sub="in the system" delay={0} />
            <KpiCard label="Empanelled" value={stats?.empanelled || 0} gradient={KPI_GRADIENTS.green} icon="✅" onClick={() => navigate('/vendors?status=Empanelled')} sub="active vendors" delay={60} />
            <KpiCard label="In Evaluation" value={stats?.inEval || 0} gradient={KPI_GRADIENTS.orange} icon="🔍" onClick={() => navigate('/vendors?status=In+Evaluation')} sub="under review" delay={120} />
            <KpiCard label="Expiring Soon" value={stats?.expiring || 0} gradient={KPI_GRADIENTS.red} icon="⚠️" onClick={() => navigate('/vendors?expiring=true')} sub="contracts in 90 days" delay={180} />
            {(stats?.openTasks > 0) && (
              <KpiCard label="Open Tasks" value={stats?.openTasks || 0} gradient={stats?.overdueTasks > 0 ? KPI_GRADIENTS.red : KPI_GRADIENTS.purple} icon="📋" onClick={() => navigate('/tasks')} sub={stats?.overdueTasks > 0 ? `${stats.overdueTasks} overdue` : 'action items'} delay={240} />
            )}
            {stats?.totalSpend > 0 && (
              <KpiCard label="Contract Value" value={`₹${(stats.totalSpend / 100000).toFixed(1)}L`} gradient={KPI_GRADIENTS.teal} icon="💰" onClick={() => navigate('/analytics')} sub="active contracts" delay={300} />
            )}
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <Card title="Vendor Status" style={{ animationDelay: '100ms' }}>
              {statusSegments.length === 0
                ? <p style={{ color: '#aaa', fontSize: 14 }}>No vendors yet.</p>
                : <DonutChart segments={statusSegments} />}
            </Card>

            <Card title="Top by Contract Value" style={{ animationDelay: '160ms' }}>
              {!stats?.topSpend?.length || stats.topSpend.every(s => !s.total)
                ? <p style={{ color: '#aaa', fontSize: 14 }}>No contract data yet.</p>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {stats.topSpend.filter(s => s.total > 0).map((s, i) => (
                      <BarRow key={s.id} label={s.name} value={s.total} max={maxSpend}
                        logo={{ color: s.logo_color, initial: s.logo_initial || s.name[0] }}
                        color={BLUE} onClick={() => navigate(`/vendors/${s.id}`)} delay={i * 80} />
                    ))}
                  </div>}
            </Card>
          </div>

          {/* Lower row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Card title="Domain Coverage" style={{ animationDelay: '220ms' }}>
              {!stats?.domains?.length
                ? <p style={{ color: '#aaa', fontSize: 14 }}>Add vendors with domains to see coverage.</p>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {stats.domains.map((d, i) => (
                      <BarRow key={i} label={d.domain} value={d.count} max={maxDomainCount}
                        color="#8E44AD" delay={i * 60} />
                    ))}
                  </div>}
            </Card>

            <Card title="Recently Added"
              action={<span onClick={() => navigate('/vendors')} style={{ fontSize: 13, color: BLUE, cursor: 'pointer', fontWeight: 600, transition: 'opacity 0.15s' }} onMouseEnter={e => e.currentTarget.style.opacity='0.7'} onMouseLeave={e => e.currentTarget.style.opacity='1'}>View all →</span>}
              style={{ animationDelay: '280ms' }}>
              {!stats?.recentVendors?.length
                ? <p style={{ color: '#aaa', fontSize: 14 }}>No vendors yet. <span onClick={() => navigate('/vendors/add')} style={{ color: BLUE, cursor: 'pointer', fontWeight: 600 }}>Add one →</span></p>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {stats.recentVendors.map((v, i) => (
                      <div key={v.id}
                        className="anim-fadeIn"
                        onClick={() => navigate(`/vendors/${v.id}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', transition: 'background 0.15s, transform 0.15s', animationDelay: `${i * 60}ms` }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#F5F8FF'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'none'; }}
                      >
                        <div style={{
                          width: 38, height: 38, borderRadius: 10,
                          background: v.logo_color || NAVY,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0,
                          boxShadow: `0 3px 10px ${v.logo_color || NAVY}55`,
                        }}>
                          {v.logo_initial || v.name[0]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</div>
                        </div>
                        <StatusBadge status={v.empanelment_status} />
                      </div>
                    ))}
                  </div>}
            </Card>
          </div>

          {/* Quick actions floating bar */}
          {stats?.total === 0 && (
            <div className="anim-fadeInUp" style={{ marginTop: 24, background: 'linear-gradient(135deg, #1C3C6E, #29ABE2)', borderRadius: 16, padding: '24px 32px', display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 8px 32px rgba(28,60,110,0.25)' }}>
              <div style={{ fontSize: 40 }}>🚀</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 18, color: '#fff', marginBottom: 6 }}>Welcome to VendorHub!</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>Get started by adding your first vendor to the system.</div>
              </div>
              <button
                className="btn-press"
                onClick={() => navigate('/vendors/add')}
                style={{ padding: '12px 28px', background: '#fff', color: NAVY, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}
              >
                + Add First Vendor
              </button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
