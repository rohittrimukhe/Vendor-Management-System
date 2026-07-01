import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import api from '../api.js';

const NAVY = '#1C3C6E';
const BLUE = '#29ABE2';

const MODULES = [
  'Dashboard',
  'Vendor Directory',
  'Vendor Details',
  'Documents',
  'Contracts',
  'Performance',
  'Escalation Matrix',
  'Users',
  'Groups',
  'Permissions',
  'Backup & Recovery',
];

const ACCESS_LEVELS = ['Full', 'Read', 'None'];

const accessStyle = {
  Full: { background: '#e6f9f0', color: '#27AE60', border: '1px solid #27AE6040' },
  Read: { background: '#e8f4fd', color: BLUE, border: `1px solid ${BLUE}40` },
  None: { background: '#fef3f0', color: '#E74C3C', border: '1px solid #E74C3C40' },
};

export default function Permissions() {
  const [groups, setGroups] = useState([]);
  const [matrix, setMatrix] = useState({}); // { groupId: { module: access_level } }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [gd, pd] = await Promise.all([api.get('/api/groups'), api.get('/api/permissions')]);
    const gs = gd || [];
    setGroups(gs);

    // Build matrix from permissions
    const m = {};
    gs.forEach(g => {
      m[g.id] = {};
      MODULES.forEach(mod => { m[g.id][mod] = 'Read'; }); // default
    });
    (pd || []).forEach(p => {
      if (m[p.group_id]) m[p.group_id][p.module] = p.access_level;
    });
    setMatrix(m);
    setLoading(false);
  }

  function cycle(groupId, module) {
    const cur = matrix[groupId]?.[module] || 'Read';
    const next = ACCESS_LEVELS[(ACCESS_LEVELS.indexOf(cur) + 1) % ACCESS_LEVELS.length];
    setMatrix(prev => ({
      ...prev,
      [groupId]: { ...(prev[groupId] || {}), [module]: next }
    }));
    setSaved(false);
  }

  async function saveAll() {
    setSaving(true);
    try {
      // Build array of all permissions, skip System Administrator (id=1, index=0)
      const perms = [];
      Object.entries(matrix).forEach(([groupId, mods]) => {
        if (Number(groupId) === groups[0]?.id) return; // skip System Admin
        Object.entries(mods).forEach(([module, access_level]) => {
          perms.push({ group_id: Number(groupId), module, access_level });
        });
      });
      await api.put('/api/permissions', { permissions: perms });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert('Error saving permissions: ' + e.message);
    }
    setSaving(false);
  }

  if (loading) {
    return <Layout title="Permissions"><div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>Loading permissions...</div></Layout>;
  }

  const sysAdminGroup = groups[0];

  return (
    <Layout title="Permission Matrix">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat, sans-serif', color: NAVY, fontSize: 22, fontWeight: 700 }}>Permission Matrix</h1>
          <p style={{ color: '#888', fontSize: 14, marginTop: 2 }}>Click a cell to cycle through Full → Read → None</p>
        </div>
        <button onClick={saveAll} disabled={saving} style={{ background: saving ? '#aaa' : BLUE, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, cursor: 'pointer' }}>
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Permissions'}
        </button>
      </div>

      <div style={{ background: '#fff3cd', border: '1px solid #ffc107', color: '#856404', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500 }}>
        🔒 System Administrator group always has Full access to all modules and cannot be changed.
      </div>

      {saved && (
        <div style={{ background: '#e6f9f0', color: '#27AE60', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14, fontWeight: 600 }}>
          ✓ Permissions saved successfully
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
          <thead>
            <tr style={{ background: NAVY }}>
              <th style={{ padding: '14px 20px', textAlign: 'left', color: '#fff', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 13, width: 200 }}>
                Module
              </th>
              {groups.map(g => (
                <th key={g.id} style={{ padding: '14px 16px', textAlign: 'center', color: '#fff', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: g.color || BLUE, border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                      {g.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 11 }}>{g.name}</span>
                    {g.id === sysAdminGroup?.id && <span style={{ fontSize: 9, opacity: 0.8 }}>🔒 Locked</span>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((mod, i) => (
              <tr key={mod} style={{ borderBottom: '1px solid #f5f5f5', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '12px 20px', fontFamily: 'Open Sans, sans-serif', fontSize: 14, color: '#333', fontWeight: 500 }}>
                  {mod}
                </td>
                {groups.map(g => {
                  const isSysAdmin = g.id === sysAdminGroup?.id;
                  const level = isSysAdmin ? 'Full' : (matrix[g.id]?.[mod] || 'Read');
                  const s = accessStyle[level];
                  if (isSysAdmin) {
                    return (
                      <td key={g.id} style={{ padding: '12px 16px', textAlign: 'center', background: '#f5f5f5' }}>
                        <span style={{
                          ...accessStyle.Full,
                          borderRadius: 20,
                          padding: '4px 14px',
                          fontSize: 12,
                          fontWeight: 700,
                          fontFamily: 'Open Sans, sans-serif',
                          minWidth: 60,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          opacity: 0.85,
                        }}>
                          🔒 Full
                        </span>
                      </td>
                    );
                  }
                  return (
                    <td key={g.id} style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => cycle(g.id, mod)}
                        style={{
                          ...s,
                          borderRadius: 20,
                          padding: '4px 14px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: 'Open Sans, sans-serif',
                          transition: 'all 0.15s',
                          minWidth: 60,
                        }}
                      >
                        {level}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 20, fontSize: 13, color: '#666' }}>
        {ACCESS_LEVELS.map(l => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ ...accessStyle[l], borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{l}</span>
            <span>{l === 'Full' ? 'Create, Edit, Delete' : l === 'Read' ? 'View only' : 'No access'}</span>
          </div>
        ))}
      </div>
    </Layout>
  );
}
