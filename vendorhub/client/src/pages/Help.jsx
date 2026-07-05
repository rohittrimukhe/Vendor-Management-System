import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout.jsx';

const NAVY = '#1C3C6E';
const BLUE = '#29ABE2';
const GREEN = '#27AE60';
const ORANGE = '#F39C12';
const RED = '#E74C3C';

// ── Mock screenshot component ──────────────────────────────────────────────
function Screen({ children, title, caption }) {
  return (
    <div style={{ margin: '16px 0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.13)', border: '1px solid #E0E6EF' }}>
      <div style={{ background: '#2C3E50', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57', display: 'inline-block' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FEBC2E', display: 'inline-block' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840', display: 'inline-block' }} />
        {title && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginLeft: 8 }}>{title}</span>}
      </div>
      <div style={{ background: '#F0F4FA', padding: 16 }}>{children}</div>
      {caption && <div style={{ background: '#fff', padding: '8px 14px', fontSize: 12, color: '#888', borderTop: '1px solid #F0F4F8', fontStyle: 'italic' }}>{caption}</div>}
    </div>
  );
}

function MockKpiRow() {
  const cards = [
    { label: 'Total Vendors', value: 24, color: '#1C3C6E', icon: '🏢' },
    { label: 'Empanelled', value: 18, color: '#27AE60', icon: '✅' },
    { label: 'In Evaluation', value: 4, color: '#F39C12', icon: '🔍' },
    { label: 'Expiring Soon', value: 3, color: '#E74C3C', icon: '⚠️' },
  ];
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {cards.map(c => (
        <div key={c.label} style={{ flex: 1, minWidth: 100, background: c.color, borderRadius: 10, padding: '12px 14px', color: '#fff' }}>
          <div style={{ fontSize: 9, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{c.label}</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{c.value}</div>
          <div style={{ fontSize: 16, marginTop: 4 }}>{c.icon}</div>
        </div>
      ))}
    </div>
  );
}

function MockVendorRow({ name, status, tier, domain, risk }) {
  const sc = { Empanelled: GREEN, 'In Evaluation': ORANGE, 'On Hold': RED, Archived: '#95A5A6' };
  const rc = { Low: GREEN, Medium: ORANGE, High: RED };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', borderRadius: 7, marginBottom: 4, border: '1px solid #F0F4F8' }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{name[0]}</div>
      <div style={{ flex: 1, fontWeight: 600, fontSize: 12, color: NAVY }}>{name}</div>
      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: sc[status] + '20', color: sc[status], fontWeight: 700 }}>{status}</span>
      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: '#EEF5FF', color: NAVY, fontWeight: 600 }}>{tier}</span>
      <span style={{ fontSize: 10, color: '#888' }}>{domain}</span>
      {risk && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: rc[risk] + '20', color: rc[risk], fontWeight: 700 }}>⚡ {risk}</span>}
    </div>
  );
}

function MockStatusDropdown() {
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 0, borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', border: '1px solid #E8ECF0', overflow: 'hidden', background: '#fff', minWidth: 160 }}>
      <div style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700, color: '#aaa', background: '#F8FAFC', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Change Status</div>
      {[['🔍','In Evaluation',ORANGE,true],['✅','Empanelled',GREEN,false],['⏸','On Hold',RED,false],['📦','Archived','#95A5A6',false]].map(([icon,s,c,active]) => (
        <div key={s} style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, background: active ? '#F8FAFC' : '#fff', borderBottom: '1px solid #F8F8F8' }}>
          <span style={{ fontSize: 13 }}>{icon}</span>
          <span style={{ fontSize: 12, fontWeight: active ? 700 : 400, color: active ? c : '#333' }}>{s}</span>
          {active && <span style={{ marginLeft: 'auto', fontSize: 10, color: c }}>✓ Current</span>}
        </div>
      ))}
    </div>
  );
}

function MockPermissionGrid() {
  const modules = ['Vendors', 'Documents', 'Contracts', 'Users'];
  const groups = ['Vendor Mgr', 'Finance', 'Viewer'];
  const vals = [['Full','Read','Read'],['Full','Read','None'],['Full','Full','Read'],['None','None','None']];
  const colors = { Full: GREEN, Read: ORANGE, None: '#ccc' };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '6px 10px', color: '#888', fontWeight: 600 }}>Module</th>
            {groups.map(g => <th key={g} style={{ padding: '6px 10px', color: NAVY, fontWeight: 700 }}>{g}</th>)}
          </tr>
        </thead>
        <tbody>
          {modules.map((m, i) => (
            <tr key={m} style={{ borderTop: '1px solid #F0F4F8' }}>
              <td style={{ padding: '6px 10px', fontWeight: 600, color: '#444' }}>{m}</td>
              {vals[i].map((v, j) => (
                <td key={j} style={{ textAlign: 'center', padding: '6px 10px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: colors[v] + '22', color: colors[v] }}>{v}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({ type = 'info', children }) {
  const cfg = {
    info:    { bg: '#EEF9FF', border: '#B3D9FF', icon: 'ℹ️', color: '#29ABE2' },
    tip:     { bg: '#F0FFF4', border: '#A3E4B8', icon: '💡', color: '#27AE60' },
    warning: { bg: '#FFFBF0', border: '#F6D860', icon: '⚠️', color: '#F39C12' },
    danger:  { bg: '#FFF5F5', border: '#FFCDD2', icon: '🚨', color: '#E74C3C' },
  };
  const c = cfg[type];
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: '12px 16px', margin: '12px 0', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{c.icon}</span>
      <div style={{ fontSize: 13, color: '#444', lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

function Step({ n, children }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', background: NAVY, color: '#fff', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{n}</div>
      <div style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

function Badge({ color = NAVY, bg, children }) {
  return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, color, background: bg || color + '18', margin: '0 2px' }}>{children}</span>;
}

// ── Section definitions ────────────────────────────────────────────────────
const sections = [
  { id: 'getting-started', icon: '🚀', title: 'Getting Started' },
  { id: 'dashboard', icon: '📊', title: 'Dashboard' },
  { id: 'vendors', icon: '🏢', title: 'Vendor Directory' },
  { id: 'vendor-detail', icon: '🔎', title: 'Vendor Detail Tabs' },
  { id: 'contracts', icon: '📄', title: 'Contracts & SLA' },
  { id: 'documents', icon: '📁', title: 'Documents' },
  { id: 'performance', icon: '⭐', title: 'Performance & Scoring' },
  { id: 'tasks', icon: '✅', title: 'Tasks' },
  { id: 'approvals', icon: '🔖', title: 'Approvals Workflow' },
  { id: 'analytics', icon: '📈', title: 'Spend Analytics' },
  { id: 'compare', icon: '⚖', title: 'Compare Vendors' },
  { id: 'users', icon: '👥', title: 'User Management' },
  { id: 'permissions', icon: '🔑', title: 'Groups & Permissions' },
  { id: 'backup', icon: '💾', title: 'Backup & Recovery' },
  { id: 'notifications', icon: '🔔', title: 'Notifications & Alerts' },
  { id: 'settings', icon: '⚙️', title: 'Settings & Email' },
  { id: 'update', icon: '🔄', title: 'System Updates' },
  { id: 'tips', icon: '💡', title: 'Tips & Best Practices' },
  { id: 'glossary', icon: '📖', title: 'Glossary' },
];

// ── Content renderers ──────────────────────────────────────────────────────
function GettingStarted() {
  return (
    <div>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.8, marginBottom: 20 }}>
        VendorHub is LRS Services' complete Vendor Management System. It centralises all vendor information — contacts, contracts, documents, performance scores, and compliance — in one secure place accessible to your entire team.
      </p>

      <h3 style={{ color: NAVY, marginBottom: 12 }}>First login</h3>
      <Step n={1}>Open your browser (Chrome or Edge recommended) and navigate to the VendorHub URL your IT team provided.</Step>
      <Step n={2}>Enter your <strong>Username</strong> and <strong>Password</strong>, then click <strong>Sign In</strong>.</Step>
      <Step n={3}>You will land on the Dashboard. Explore the left sidebar to navigate sections.</Step>

      <Callout type="tip">If you forgot your password, ask your System Administrator to reset it from <strong>Admin → Users → Reset PW</strong>.</Callout>

      <h3 style={{ color: NAVY, margin: '20px 0 12px' }}>What you can do in VendorHub</h3>
      {[
        ['🏢','Vendor Registry','Store all vendor info — GSTIN, contacts, contracts, certifications, documents'],
        ['📄','Contract Lifecycle','Track contract values, start/end dates, SLA terms, and renewals'],
        ['⭐','Performance Reviews','Rate vendors quarterly and track scores over time'],
        ['📈','Spend Analytics','See where your contract budget is going by vendor, tier, domain'],
        ['⚖','Vendor Comparison','Compare any two vendors side-by-side on any criteria'],
        ['✅','Task Management','Assign and track action items related to vendors'],
        ['🔖','Approval Workflow','Route new vendors through a manager review before they go live'],
        ['🔔','Smart Alerts','Get notified of expiring contracts, missing documents, overdue tasks'],
        ['👥','Team & Roles','Control exactly who can see or edit each section of the system'],
        ['💾','Backups','Schedule automatic backups — your data is always safe'],
      ].map(([icon, title, desc]) => (
        <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start', padding: '10px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #EEF2F8' }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
          <div><div style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>{title}</div><div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{desc}</div></div>
        </div>
      ))}
    </div>
  );
}

function DashboardHelp() {
  return (
    <div>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 16 }}>The Dashboard is your home screen. It gives you an at-a-glance view of the entire vendor portfolio.</p>

      <Screen title="Dashboard — KPI Cards" caption="Each coloured card is clickable — it takes you to a filtered vendor list.">
        <MockKpiRow />
      </Screen>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>KPI Cards explained</h3>
      {[
        ['🏢 Total Vendors', NAVY, 'Every vendor in the system regardless of status. Click to see the full list.'],
        ['✅ Empanelled', GREEN, 'Vendors that are fully approved and active. These are your live, working vendors.'],
        ['🔍 In Evaluation', ORANGE, 'Vendors currently being assessed. Not yet approved for use.'],
        ['⚠️ Expiring Soon', RED, 'Contracts that expire within the next 90 days. Take action before they lapse.'],
        ['📋 Open Tasks', '#8E44AD', 'Action items assigned to you or your team. Red badge = overdue tasks.'],
        ['💰 Contract Value', '#16A085', 'Total value of all active contracts. Click to go to Spend Analytics.'],
      ].map(([label, color, desc]) => (
        <div key={label} style={{ display: 'flex', gap: 12, marginBottom: 8, padding: '8px 14px', borderRadius: 8, background: color + '08', border: `1px solid ${color}20` }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0, marginTop: 4 }} />
          <div><strong style={{ fontSize: 13, color }}>{label}</strong><div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>{desc}</div></div>
        </div>
      ))}

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Vendor Status Donut Chart</h3>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>Shows the breakdown of your vendors by empanelment status. Hover over each segment to see counts and percentages. Instantly tells you your active vs. pending vs. paused vendor ratio.</p>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Top by Contract Value</h3>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>Bar chart of the top vendors ranked by total contract value. Click any bar to jump to that vendor's detail page.</p>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Domain Coverage</h3>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>Shows how many vendors you have per service domain (e.g. Cloud, IT Services, Consulting). Helps you spot gaps — if "Security" only has 1 vendor, you may need a backup.</p>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Recently Added</h3>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>The last 5 vendors added to the system. Click any row to go directly to that vendor.</p>
    </div>
  );
}

function VendorsHelp() {
  return (
    <div>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 16 }}>The Vendor Directory is your master list of all vendors. You can search, filter, sort, and manage vendors from here.</p>

      <Screen title="Vendor Directory" caption="Filters work together — combine status + tier + domain to narrow results.">
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {['🔍 Search name / GSTIN...', 'Status ▾', 'Tier ▾', 'Domain ▾', 'Type ▾'].map(f => (
            <div key={f} style={{ padding: '5px 12px', background: '#fff', borderRadius: 6, fontSize: 11, border: '1px solid #DDE2E8', color: '#555' }}>{f}</div>
          ))}
          <div style={{ marginLeft: 'auto', padding: '5px 12px', background: NAVY, borderRadius: 6, fontSize: 11, color: '#fff', fontWeight: 700 }}>+ Add Vendor</div>
        </div>
        <MockVendorRow name="Infosys Ltd" status="Empanelled" tier="Tier 1" domain="IT Services" risk="Low" />
        <MockVendorRow name="Wipro Technologies" status="In Evaluation" tier="Tier 2" domain="Cloud" risk="Medium" />
        <MockVendorRow name="HCL Services" status="Empanelled" tier="Tier 1" domain="Managed Services" risk="Low" />
      </Screen>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Adding a new vendor</h3>
      <Step n={1}>Click <strong>Vendors</strong> in the left sidebar, then click <strong>+ Add Vendor</strong> (top right).</Step>
      <Step n={2}><strong>Step 1 — Basic Info:</strong> Enter Vendor Name (required), GSTIN, Website, Address, Geographic Scope, Vendor Type, Empanelment Status, and Tier.</Step>
      <Step n={3}><strong>Step 2 — Domains & Tags:</strong> Add service domains (e.g. "Cloud", "IT Services") and optional tags (e.g. "ISO Certified", "Preferred").</Step>
      <Step n={4}><strong>Step 3 — Contact:</strong> Add at least one contact person with name, role, email, and phone.</Step>
      <Step n={5}>Click <strong>Save Vendor</strong>. You'll be taken to the vendor detail page.</Step>
      <Callout type="tip">Always add a GSTIN if available — it verifies the vendor is a registered Indian business and is required for GST compliance reporting.</Callout>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Understanding Empanelment Status</h3>
      {[
        ['🔍','In Evaluation',ORANGE,'Vendor is being assessed. Not yet approved. Default for newly added vendors.'],
        ['✅','Empanelled',GREEN,'Fully approved and active. Cleared for contracts and payments.'],
        ['⏸','On Hold',RED,'Temporarily paused — dispute, audit, or performance issue. Do not use.'],
        ['📦','Archived','#95A5A6','No longer active. History preserved but removed from active lists.'],
      ].map(([icon,status,color,desc]) => (
        <div key={status} style={{ display: 'flex', gap: 10, marginBottom: 8, padding: '8px 14px', borderRadius: 8, background: color + '08', border: `1px solid ${color}20` }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <div><strong style={{ fontSize: 13, color }}>{status}</strong><div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>{desc}</div></div>
        </div>
      ))}

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Changing status with the inline dropdown</h3>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 12 }}>On the vendor detail page, click the coloured status badge to open the status dropdown — no need to open the full edit form:</p>
      <Screen title="Status Dropdown" caption="Only users with Edit permission see the clickable dropdown.">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <MockStatusDropdown />
        </div>
      </Screen>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Bulk Actions</h3>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>Select multiple vendors using the checkboxes on the left of each row, then use the <strong>Bulk Actions</strong> bar that appears at the bottom of the screen to change status, tier, or delete multiple vendors at once.</p>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Saved Views (Filters)</h3>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>Set any combination of filters, then click <strong>💾 Save View</strong> to save this filter set with a name. Saved views appear as chips below the search bar — click any chip to instantly re-apply that filter combination.</p>
      <Callout type="tip">Example saved views: "Active Tier 1 Cloud vendors", "In Evaluation IT vendors", "Expiring contracts".</Callout>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Vendor Tiers</h3>
      {[
        ['Tier 1','Strategic, mission-critical vendors. High dependency, long-term relationships. Protect these at all costs.'],
        ['Tier 2','Important vendors used regularly but not critical to core operations.'],
        ['Tier 3','Occasional or low-priority vendors. Easy to replace.'],
      ].map(([t,d]) => (
        <div key={t} style={{ display: 'flex', gap: 10, marginBottom: 6, fontSize: 13 }}>
          <Badge color={NAVY}>{t}</Badge>
          <span style={{ color: '#555', lineHeight: 1.6 }}>{d}</span>
        </div>
      ))}

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Risk Score</h3>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>Each vendor automatically gets a risk score based on: missing documents, no contacts, expiring contracts, low performance scores, and no activity. Risk levels are <Badge color={GREEN}>Low</Badge> <Badge color={ORANGE}>Medium</Badge> <Badge color={RED}>High</Badge> <Badge color="#8B0000">Critical</Badge>.</p>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Export & Import</h3>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>Use the <strong>Export CSV</strong> button to download all vendor data to a spreadsheet. Use <strong>Import CSV</strong> to bulk-add vendors from a spreadsheet — download the sample CSV template first to see the correct column format.</p>
    </div>
  );
}

function VendorDetailHelp() {
  return (
    <div>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 16 }}>Click any vendor to open its detail page. The detail page has 11 tabs covering every aspect of the vendor relationship.</p>

      <Screen title="Vendor Detail — Tab Navigation" caption="Tabs: Overview · Contacts · Documents · Contracts & SLA · Performance · Escalation · Notes · Tasks · Onboarding · Timeline · Scorecard">
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
          {['Overview','Contacts','Documents','Contracts & SLA','Performance','Escalation','Notes','Tasks','Onboarding','Timeline','Scorecard'].map((t,i) => (
            <div key={t} style={{ padding: '5px 10px', fontSize: 11, borderRadius: 6, background: i === 0 ? NAVY : '#fff', color: i === 0 ? '#fff' : '#555', border: `1px solid ${i === 0 ? NAVY : '#DDE2E8'}`, fontWeight: i === 0 ? 700 : 400 }}>{t}</div>
          ))}
        </div>
        <div style={{ background: '#fff', borderRadius: 8, padding: 12, border: '1px solid #F0F4F8', fontSize: 12, color: '#555' }}>
          <div style={{ fontWeight: 700, color: NAVY, marginBottom: 4 }}>Overview tab shows:</div>
          <div>Company logo · Status badge (clickable) · Tier · Risk level · GSTIN · Website · Certifications · Domains · Tags · Summary</div>
        </div>
      </Screen>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Tab-by-tab guide</h3>
      {[
        ['Overview','🏢','Company profile card with all basic info. Click the status badge to change empanelment status. Click Edit to update any field.'],
        ['Contacts','👤','All contact persons at this vendor. Add name, designation, email, phone, LinkedIn. Mark one as Primary Contact. Use search to find the right person quickly.'],
        ['Documents','📁','Upload any file (PDF, Word, Excel, images). Drag & drop or click to browse. Supports up to 50 MB per file. Download or delete existing files. Tip: always upload the signed agreement and NDA here.'],
        ['Contracts & SLA','📄','All contracts with start/end dates, value (₹), and SLA terms. Contracts expiring within 90 days show a red warning badge. Use the Renew button to create a renewal. SLA compliance scores are tracked here.'],
        ['Performance','⭐','Add quarterly performance reviews with 1–5 star ratings across delivery, support, and price. The system calculates running averages. Trend charts show improvement or decline over time.'],
        ['Escalation','📞','Define your L1 → L2 → L3 escalation contacts at this vendor. Who to call first, who to escalate to if not resolved, and who the final authority is. Critical for Tier 1 vendors.'],
        ['Notes','📝','Free-form notes about this vendor — meeting minutes, decisions, reminders. Each note is timestamped and attributed to the user who wrote it.'],
        ['Tasks','✅','Action items specific to this vendor. Assign tasks to team members with due dates and priority levels. Track status: Open → In Progress → Done.'],
        ['Onboarding','🚀','Step-by-step onboarding checklist for new vendors. Track what has been completed (Agreement signed, NDA received, Bank details verified, etc.)'],
        ['Timeline','🕐','Complete activity history for this vendor — every edit, note, status change, document upload, and contract addition in chronological order.'],
        ['Scorecard','📊','Composite score combining performance ratings, risk factors, contract health, and compliance. Compare this vendor against your average. Use scoring criteria set in Admin → Scoring.'],
      ].map(([tab, icon, desc]) => (
        <div key={tab} style={{ marginBottom: 10, padding: '12px 16px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #EEF2F8' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: NAVY, marginBottom: 4 }}>{icon} {tab}</div>
          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>{desc}</div>
        </div>
      ))}

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>PDF Export</h3>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>Click the <strong>📄 Download PDF</strong> button in the top-right of any vendor page to generate a professional PDF report with all vendor information, contacts, contracts, certifications, and summary — ready to share with management.</p>
    </div>
  );
}

function ContractsHelp() {
  return (
    <div>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 16 }}>The Contracts & SLA tab tracks all agreements with a vendor — value, duration, terms, and compliance.</p>

      <h3 style={{ color: NAVY, margin: '0 0 12px' }}>Adding a contract</h3>
      <Step n={1}>Open the vendor → click <strong>Contracts & SLA</strong> tab.</Step>
      <Step n={2}>Click <strong>+ Add Contract</strong>.</Step>
      <Step n={3}>Fill in: Contract Name, Start Date, End Date, Value (₹), Status (Active / Expired / Pending).</Step>
      <Step n={4}>Add SLA terms: Response Time, Uptime %, Penalty clause, and any custom notes.</Step>
      <Step n={5}>Click <strong>Save Contract</strong>.</Step>

      <Callout type="warning">Always set an accurate End Date — the system uses this to calculate the "Expiring Soon" KPI card on the Dashboard and send email alerts 30 days before expiry.</Callout>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Contract renewal workflow</h3>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>When a contract is within 90 days of expiry, a <Badge color={RED}>⚠ Expiring</Badge> badge appears and a <strong>Renew</strong> button is shown. Click it to open a renewal form pre-filled with the current contract details — change the dates and value, then save as a new contract.</p>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>SLA (Service Level Agreement)</h3>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 8 }}>An SLA is a written promise from the vendor about service quality. Examples:</p>
      {[
        'Response Time: All tickets acknowledged within 4 business hours',
        'Uptime: System available 99.9% of the time (max 8.7 hours downtime/year)',
        'Resolution: P1 issues resolved within 4 hours, P2 within 24 hours',
        'Delivery: Orders delivered within 3 working days',
      ].map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 13, color: '#444' }}>
          <span style={{ color: BLUE, fontWeight: 700 }}>•</span>{s}
        </div>
      ))}
      <Callout type="tip">If a vendor violates an SLA, record it in the Performance tab as a review with a low score and notes describing the breach. This builds an evidence trail.</Callout>
    </div>
  );
}

function DocumentsHelp() {
  return (
    <div>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 16 }}>Store all vendor-related files securely in VendorHub — no more hunting through email or shared drives.</p>

      <h3 style={{ color: NAVY, margin: '0 0 12px' }}>Uploading a document</h3>
      <Step n={1}>Open the vendor → click the <strong>Documents</strong> tab.</Step>
      <Step n={2}>Drag and drop a file onto the upload area, OR click the area to open the file browser.</Step>
      <Step n={3}>The file uploads automatically and appears in the list with name, size, type, and upload date.</Step>

      <Callout type="info">Supported: all file types (PDF, Word, Excel, PowerPoint, images, ZIP, etc.). Maximum: 50 MB per file.</Callout>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Recommended documents to store per vendor</h3>
      {[
        ['NDA (Non-Disclosure Agreement)','Confidentiality agreement before sharing sensitive information'],
        ['MSA (Master Service Agreement)','Main framework contract defining the overall relationship'],
        ['Rate Card / SOW','Scope of work and pricing breakdown'],
        ['Empanelment Application','The vendor\'s original registration/application form'],
        ['GST Certificate','Confirms vendor GST registration'],
        ['Company PAN card','Tax identity document'],
        ['Bank Account Details Letter','Verified banking information for payments'],
        ['ISO / Quality Certifications','Any quality or security certifications they hold'],
        ['Insurance Certificate','Proof of liability insurance if required'],
      ].map(([name, desc]) => (
        <div key={name} style={{ display: 'flex', gap: 10, marginBottom: 8, padding: '8px 14px', background: '#F8FAFC', borderRadius: 7, border: '1px solid #EEF2F8' }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>📄</span>
          <div><div style={{ fontWeight: 600, fontSize: 13, color: NAVY }}>{name}</div><div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{desc}</div></div>
        </div>
      ))}
    </div>
  );
}

function PerformanceHelp() {
  return (
    <div>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 16 }}>Track vendor performance with periodic reviews. Scores drive the Vendor Scorecard and help identify underperforming vendors before they become problems.</p>

      <h3 style={{ color: NAVY, margin: '0 0 12px' }}>Adding a performance review</h3>
      <Step n={1}>Open the vendor → click the <strong>Performance</strong> tab.</Step>
      <Step n={2}>Click <strong>+ Add Review</strong>.</Step>
      <Step n={3}>Set the <strong>Overall Rating</strong> (1–5 stars) and the review period.</Step>
      <Step n={4}>Score the specific dimensions: On-Time Delivery (0–100%), Support Quality (0–100%), Price Competitiveness (0–100%).</Step>
      <Step n={5}>Add detailed notes describing what went well, what didn't, and any specific incidents.</Step>
      <Step n={6}>Click <strong>Save Review</strong>.</Step>

      <Callout type="tip">Review vendors at least quarterly. For Tier 1 vendors, monthly reviews are recommended.</Callout>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Vendor Scorecard</h3>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>The <strong>Scorecard</strong> tab combines performance reviews, risk factors, and contract health into a single composite score. Configure scoring weights in <strong>Admin → Scoring Criteria</strong> to match your organisation's priorities.</p>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Rating scale reference</h3>
      {[
        ['⭐⭐⭐⭐⭐ 5 stars','Exceptional — exceeds all expectations. Tier 1 candidate.'],
        ['⭐⭐⭐⭐ 4 stars','Good — meets expectations with minor gaps.'],
        ['⭐⭐⭐ 3 stars','Acceptable — meets minimum requirements. Watch closely.'],
        ['⭐⭐ 2 stars','Below average — needs improvement. Issue a formal notice.'],
        ['⭐ 1 star','Poor — serious issues. Consider putting vendor On Hold.'],
      ].map(([stars, desc]) => (
        <div key={stars} style={{ display: 'flex', gap: 10, marginBottom: 6, fontSize: 13 }}>
          <span style={{ minWidth: 180, fontWeight: 600, color: ORANGE }}>{stars}</span>
          <span style={{ color: '#555' }}>{desc}</span>
        </div>
      ))}
    </div>
  );
}

function TasksHelp() {
  return (
    <div>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 16 }}>Tasks let you assign and track action items related to vendors. Access your tasks from <strong>My Tasks</strong> in the sidebar, or manage vendor-specific tasks from the vendor's Tasks tab.</p>

      <h3 style={{ color: NAVY, margin: '0 0 12px' }}>Creating a task</h3>
      <Step n={1}>Go to <strong>My Tasks</strong> in the sidebar, OR open a vendor and click the <strong>Tasks</strong> tab.</Step>
      <Step n={2}>Click <strong>+ New Task</strong>.</Step>
      <Step n={3}>Enter: Title, Description, Assign To (team member), Due Date, Priority (Low / Medium / High / Critical).</Step>
      <Step n={4}>Click <strong>Save Task</strong>. The assigned person will see it in their My Tasks.</Step>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Task statuses</h3>
      {[
        ['Open','Task created, not yet started',BLUE],
        ['In Progress','Someone is actively working on it',ORANGE],
        ['Done','Task completed',GREEN],
        ['Cancelled','Task no longer needed','#95A5A6'],
      ].map(([s, d, c]) => (
        <div key={s} style={{ display: 'flex', gap: 10, marginBottom: 6, alignItems: 'center', fontSize: 13 }}>
          <Badge color={c}>{s}</Badge>
          <span style={{ color: '#555' }}>{d}</span>
        </div>
      ))}

      <Callout type="warning">Overdue tasks (past their due date and not Done) show a red badge on the Dashboard KPI card and in the sidebar. Review the My Tasks page regularly to keep things on track.</Callout>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Priority levels</h3>
      {[['Critical',RED],['High',ORANGE],['Medium',BLUE],['Low','#95A5A6']].map(([p,c]) => (
        <div key={p} style={{ display: 'flex', gap: 10, marginBottom: 4, alignItems: 'center', fontSize: 13 }}>
          <Badge color={c}>{p}</Badge>
          <span style={{ color: '#555' }}>{p === 'Critical' ? 'Drop everything — needs immediate attention' : p === 'High' ? 'Complete today or tomorrow' : p === 'Medium' ? 'Complete this week' : 'Complete this month when possible'}</span>
        </div>
      ))}
    </div>
  );
}

function ApprovalsHelp() {
  return (
    <div>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 16 }}>The Approval Workflow lets you require manager review before a vendor becomes fully active. This adds a governance layer to vendor onboarding.</p>

      <h3 style={{ color: NAVY, margin: '0 0 12px' }}>How approvals work</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20, padding: '14px 16px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #EEF2F8' }}>
        {[['➕','Add Vendor'],['→',null],['📤','Submit for Review'],['→',null],['👀','Manager Reviews'],['→',null],['✅ / ✗','Approved / Rejected']].map(([icon,label],i) => (
          label === null ? <span key={i} style={{ color: '#ccc', fontSize: 18 }}>{icon}</span> :
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20 }}>{icon}</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 4, fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      <Step n={1}><strong>Add Vendor:</strong> Create the vendor (it starts as "pending_review" if approval is enabled).</Step>
      <Step n={2}><strong>Submit for Review:</strong> On the vendor's Overview tab, click <strong>Submit for Approval</strong> to route it to a manager.</Step>
      <Step n={3}><strong>Manager reviews:</strong> The assigned reviewer sees a notification and pending badge. They go to <strong>Approvals</strong> in the sidebar.</Step>
      <Step n={4}><strong>Review the vendor:</strong> The manager can view all details, request corrections, and add review notes.</Step>
      <Step n={5}><strong>Approve or Reject:</strong> Click <strong>Approve</strong> (vendor becomes active) or <strong>Reject</strong> with a reason.</Step>

      <Callout type="info">The Approvals sidebar item shows a red badge with the count of vendors waiting for your review.</Callout>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Approval statuses</h3>
      {[
        ['Pending Review',ORANGE,'Submitted for approval, waiting for the reviewer'],
        ['Approved',GREEN,'Manager has approved — vendor is now active'],
        ['Rejected',RED,'Manager rejected — submitter must correct and resubmit'],
        ['No Approval',NAVY,'Vendor was not routed through approval workflow'],
      ].map(([s,c,d]) => (
        <div key={s} style={{ display: 'flex', gap: 10, marginBottom: 6, fontSize: 13, alignItems: 'center' }}>
          <Badge color={c}>{s}</Badge>
          <span style={{ color: '#555' }}>{d}</span>
        </div>
      ))}
    </div>
  );
}

function AnalyticsHelp() {
  return (
    <div>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 16 }}>Spend Analytics gives you a financial view of your vendor portfolio — where your contract budget is going and who your biggest vendors are.</p>

      <h3 style={{ color: NAVY, margin: '0 0 12px' }}>What Spend Analytics shows</h3>
      {[
        ['By Vendor','Bar chart of top vendors by total contract value. See your biggest spending relationships at a glance.'],
        ['By Tier','How contract value is distributed across Tier 1, 2, and 3 vendors.'],
        ['By Domain','Which service domains (Cloud, IT, Consulting) represent the most spend.'],
        ['By Type','Spend breakdown by vendor type (IT Company, Startup, Freelancer, etc.)'],
        ['Monthly Trend','Contract values over time — see if your vendor spend is growing or shrinking.'],
      ].map(([section, desc]) => (
        <div key={section} style={{ display: 'flex', gap: 10, marginBottom: 8, padding: '8px 14px', background: '#F8FAFC', borderRadius: 7, border: '1px solid #EEF2F8' }}>
          <span style={{ fontSize: 16 }}>📊</span>
          <div><div style={{ fontWeight: 600, fontSize: 13, color: NAVY }}>{section}</div><div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>{desc}</div></div>
        </div>
      ))}

      <Callout type="tip">All values shown in ₹ Lakhs (1L = ₹1,00,000). Click any bar to navigate directly to that vendor.</Callout>
    </div>
  );
}

function CompareHelp() {
  return (
    <div>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 16 }}>Compare Vendors lets you evaluate two vendors side-by-side across all criteria — useful when deciding between alternatives.</p>

      <Step n={1}>Click <strong>Compare Vendors</strong> in the sidebar.</Step>
      <Step n={2}>Select the first vendor from the left dropdown.</Step>
      <Step n={3}>Select the second vendor from the right dropdown.</Step>
      <Step n={4}>The comparison table appears immediately — scroll down to see all dimensions.</Step>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>What is compared</h3>
      {['Empanelment Status','Tier','Risk Level','Domain & Type','Contract Count & Total Value','Average Performance Score','Open Tasks & Escalation Contacts','Certifications & Documents Count'].map(item => (
        <div key={item} style={{ display: 'flex', gap: 8, marginBottom: 5, fontSize: 13 }}>
          <span style={{ color: BLUE, fontWeight: 700 }}>•</span>
          <span style={{ color: '#555' }}>{item}</span>
        </div>
      ))}
      <Callout type="tip">Use Compare when procurement is evaluating two bidders for the same service — the side-by-side view makes it easy to justify your selection decision.</Callout>
    </div>
  );
}

function UsersHelp() {
  return (
    <div>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 16 }}>Only System Administrators can manage users. Go to <strong>Admin → Users</strong> in the sidebar.</p>

      <h3 style={{ color: NAVY, margin: '0 0 12px' }}>Adding a user</h3>
      <Step n={1}>Click <strong>+ Add User</strong>.</Step>
      <Step n={2}>Fill in: Full Name, Email, Username (login ID), Password, Group (role), Department, and optional Reporting Manager.</Step>
      <Step n={3}>Click <strong>Add User</strong>. The account is immediately active.</Step>
      <Step n={4}>Tell the new user their username and password. Advise them to log in promptly.</Step>

      <Callout type="warning">Passwords are not emailed automatically. You must tell the user their credentials securely (in person or via secure message).</Callout>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Resetting a password</h3>
      <Step n={1}>Find the user in the Users table.</Step>
      <Step n={2}>Click <strong>Reset PW</strong>.</Step>
      <Step n={3}>Enter a new temporary password and click <strong>Reset Password</strong>.</Step>
      <Step n={4}>Inform the user of the new password.</Step>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Deactivating a user</h3>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>Click <strong>Deactivate</strong> on any user to disable their login. Their history and audit records are preserved. To re-enable, click <strong>Activate</strong>.</p>
      <Callout type="tip">Always deactivate users who leave the company — don't delete them, as their audit trail is valuable for compliance.</Callout>
    </div>
  );
}

function PermissionsHelp() {
  return (
    <div>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 16 }}>Groups define roles in your organisation. Permissions control exactly what each group can do in each module.</p>

      <h3 style={{ color: NAVY, margin: '0 0 12px' }}>Default groups</h3>
      {[
        ['System Administrator','Full access to everything. Cannot be restricted.','#E74C3C'],
        ['Vendor Manager','Full access to manage vendors and all vendor data.','#8E44AD'],
        ['Procurement Team','Can view and edit vendor information.','#29ABE2'],
        ['Finance Team','Read-only access to vendor and contract data.','#27AE60'],
        ['Viewer','View-only access. Cannot change anything.','#95A5A6'],
      ].map(([name,desc,color]) => (
        <div key={name} style={{ display: 'flex', gap: 10, marginBottom: 8, padding: '8px 14px', borderRadius: 8, background: color + '08', border: `1px solid ${color}20` }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0, marginTop: 4 }} />
          <div><div style={{ fontWeight: 700, fontSize: 13, color }}>{name}</div><div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>{desc}</div></div>
        </div>
      ))}

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Permission Matrix</h3>
      <Screen title="Permissions — Admin → Permissions" caption="Click any cell to cycle: Full → Read → None. Save when done.">
        <MockPermissionGrid />
      </Screen>

      <h3 style={{ color: NAVY, margin: '16px 0 10px' }}>Access levels</h3>
      {[
        ['Full',GREEN,'Can view, create, edit, and delete records in this module'],
        ['Read',ORANGE,'Can view records only — cannot create, edit, or delete'],
        ['None','#E74C3C','Cannot see this module at all — it is hidden from the sidebar'],
      ].map(([level,color,desc]) => (
        <div key={level} style={{ display: 'flex', gap: 10, marginBottom: 6, fontSize: 13, alignItems: 'center' }}>
          <Badge color={color}>{level}</Badge>
          <span style={{ color: '#555' }}>{desc}</span>
        </div>
      ))}

      <Callout type="tip">Recommended setup: Finance Team = "Read" on Vendors (can see but not change). Viewer = "Read" on everything. Vendor Manager = "Full" on Vendors but "None" on Admin modules.</Callout>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Creating a custom group</h3>
      <Step n={1}>Go to <strong>Admin → Groups & Roles</strong>.</Step>
      <Step n={2}>Click <strong>+ Add Group</strong>.</Step>
      <Step n={3}>Enter group name, description, default access level, and choose a colour.</Step>
      <Step n={4}>Click <strong>Create Group</strong>.</Step>
      <Step n={5}>Go to <strong>Admin → Permissions</strong> and set module-level access for the new group.</Step>
      <Step n={6}>Go to <strong>Admin → Users</strong> and assign this group to the relevant users.</Step>
    </div>
  );
}

function BackupHelp() {
  return (
    <div>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 16 }}>Go to <strong>Admin → Backup & Recovery</strong>. Your data is stored in a SQLite file on the server — backups create copies so you can recover if anything goes wrong.</p>

      <Callout type="danger">Without backups, a server crash or accidental deletion could permanently destroy all your vendor data. Run backups regularly — treat them like insurance.</Callout>

      <h3 style={{ color: NAVY, margin: '16px 0 10px' }}>Backup types</h3>
      {[
        ['Full Backup','Copies the database AND all uploaded files (documents). Creates a .zip. Recommended for complete protection. Larger file size.'],
        ['DB Only','Copies only the database (vendor records, contracts, users). Much faster and smaller. Does not include uploaded document files.'],
      ].map(([type,desc]) => (
        <div key={type} style={{ marginBottom: 10, padding: '10px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #EEF2F8' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: NAVY, marginBottom: 4 }}>💾 {type}</div>
          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>{desc}</div>
        </div>
      ))}

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Running a manual backup</h3>
      <Step n={1}>Click <strong>Backup & Recovery</strong> in the sidebar.</Step>
      <Step n={2}>Select backup type: <strong>Full Backup</strong> or <strong>DB Only</strong>.</Step>
      <Step n={3}>Click <strong>▶ Run Manual Backup</strong>.</Step>
      <Step n={4}>Wait 5–30 seconds (depending on data size).</Step>
      <Step n={5}>A green success message appears and the backup shows in the Backup History table below.</Step>
      <Step n={6}>Click <strong>⬇ Download</strong> to save a copy to your Desktop, USB drive, or Google Drive.</Step>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Scheduled (automatic) backups</h3>
      <Step n={1}>On the Backup page, find the <strong>Scheduled Backups</strong> section on the right.</Step>
      <Step n={2}>Choose <strong>Frequency</strong>: Daily, Weekly, or Monthly.</Step>
      <Step n={3}>Choose <strong>Time</strong>: e.g. 2:00 AM (when nobody is using the system).</Step>
      <Step n={4}>For Weekly — choose which day. For Monthly — choose which date.</Step>
      <Step n={5}>Click <strong>Save Schedule</strong>. Backups now run automatically.</Step>
      <Callout type="warning">The server must be running for scheduled backups to execute. If the server is off at the scheduled time, the backup will not run.</Callout>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Restoring from a backup</h3>
      <Callout type="danger">Restoring replaces ALL current data with the backup. Any data added after the backup date will be permanently lost. Run a fresh backup before restoring.</Callout>
      <Step n={1}>Find the backup in the Backup History table.</Step>
      <Step n={2}>Click <strong>↺ Restore</strong>.</Step>
      <Step n={3}>Read the warning and click <strong>Restore Now</strong>.</Step>
      <Step n={4}>The server restarts automatically. Wait 15 seconds then refresh your browser.</Step>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Where are backup files stored?</h3>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>In the <code style={{ background: '#F0F4FA', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>vendorhub/backups/</code> folder inside your VendorHub installation. Each filename includes a timestamp. Copy files to an external drive or cloud storage (Google Drive, OneDrive) periodically for off-site safety.</p>
    </div>
  );
}

function NotificationsHelp() {
  return (
    <div>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 16 }}>VendorHub automatically monitors your data and surfaces alerts for things that need attention. Click the 🔔 bell icon in the top-right header to see current alerts.</p>

      <h3 style={{ color: NAVY, margin: '0 0 12px' }}>Alert types</h3>
      {[
        ['🚨 Critical',RED,'Contracts expiring within 7 days, severely overdue tasks'],
        ['⚠️ Warning',ORANGE,'Contracts expiring within 30 days, overdue tasks, missing key documents'],
        ['ℹ️ Info',BLUE,'Vendor added for approval, upcoming contract renewals, scheduled backups completed'],
      ].map(([type,color,desc]) => (
        <div key={type} style={{ display: 'flex', gap: 10, marginBottom: 8, padding: '8px 14px', borderRadius: 8, background: color + '08', border: `1px solid ${color}20` }}>
          <span style={{ fontSize: 16 }}>{type.split(' ')[0]}</span>
          <div><div style={{ fontWeight: 700, fontSize: 13, color }}>{type}</div><div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>{desc}</div></div>
        </div>
      ))}

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Dismissing alerts</h3>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>Click <strong>✕</strong> on any alert to dismiss it. Click <strong>Clear all</strong> to dismiss all at once. Dismissed alerts don't reappear unless the underlying issue is still present after the next check.</p>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Email alerts</h3>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>If SMTP is configured in <strong>Admin → Settings</strong>, the system sends a daily email at 8 AM listing all critical alerts to admin users. Configure the SMTP settings and click "Send Test Email" to verify delivery.</p>
    </div>
  );
}

function SettingsHelp() {
  return (
    <div>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 16 }}>Go to <strong>Admin → Settings</strong> to configure system-wide options. Only System Administrators can access this page.</p>

      <h3 style={{ color: NAVY, margin: '0 0 12px' }}>SMTP Email Configuration</h3>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 12 }}>Configure an outgoing email server to receive automated alerts and notifications by email.</p>
      <Screen title="Settings — SMTP Configuration" caption="Use your company's SMTP server or a service like Gmail / Outlook 365.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[['SMTP Host','smtp.company.com'],['Port','587'],['Username','noreply@company.com'],['From Address','VendorHub <noreply@company.com>']].map(([label, ph]) => (
            <div key={label}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 4 }}>{label}</div>
              <div style={{ padding: '6px 10px', background: '#F8FAFC', borderRadius: 6, fontSize: 12, color: '#aaa', border: '1px solid #DDE2E8' }}>{ph}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, padding: '6px 14px', background: NAVY, borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 700, display: 'inline-block' }}>📧 Send Test Email</div>
      </Screen>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Backup schedule setting</h3>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>Choose Daily, Weekly, or Monthly automatic backup frequency. This setting is also configurable on the Backup page directly.</p>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Admin notification email</h3>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>Set a dedicated email address (e.g. <code style={{ background: '#F0F4FA', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>it-admin@lrsservices.com</code>) to receive all system alert emails in addition to individual admin users.</p>
    </div>
  );
}

function UpdateHelp() {
  return (
    <div>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 16 }}>Go to <strong>Admin → System Update</strong> to check for and apply updates from GitHub. Updates are applied as a ZIP download — no git installation required.</p>

      <h3 style={{ color: NAVY, margin: '0 0 12px' }}>Checking for updates</h3>
      <Step n={1}>Click <strong>🔍 Check for Updates</strong>.</Step>
      <Step n={2}>VendorHub contacts GitHub and compares your installed version with the latest.</Step>
      <Step n={3}>If up to date: green <strong>✅ You're up to date!</strong> banner with your version number.</Step>
      <Step n={4}>If updates exist: orange banner showing your current version vs. the latest commit, plus a list of recent changes.</Step>

      <h3 style={{ color: NAVY, margin: '20px 0 10px' }}>Applying an update</h3>
      <Step n={1}>Click <strong>⬇ Update to Latest</strong>.</Step>
      <Step n={2}>Confirm the prompt. The update begins in the background.</Step>
      <Step n={3}>Watch the live log as it: downloads the ZIP → extracts files → runs npm install → rebuilds the UI.</Step>
      <Step n={4}>The server restarts automatically. The page will auto-refresh after 10 seconds.</Step>

      <Callout type="tip">Your database, uploaded documents, and .env file are <strong>never touched</strong> during an update — only application code files are replaced. The version number increments automatically (e.g. v1.0.0 → v1.0.1) after each successful update.</Callout>
      <Callout type="warning">Always run a <strong>Full Backup</strong> before applying an update — just in case you need to roll back.</Callout>
    </div>
  );
}

function TipsHelp() {
  return (
    <div>
      <h3 style={{ color: NAVY, margin: '0 0 12px' }}>Top 10 tips for using VendorHub effectively</h3>
      {[
        ['Fill in GSTIN for every vendor','It verifies they are a legitimate registered Indian business and is required for GST compliance.'],
        ['Upload documents immediately','Don\'t wait — upload NDA, MSA, and Rate Card the day you onboard a vendor.'],
        ['Set accurate contract end dates','The system uses this to power the "Expiring Soon" dashboard card and email alerts 30 days before expiry.'],
        ['Add at least 2 contacts per Tier 1 vendor','Primary contact and a backup. You don\'t want to be stuck when one person is unavailable.'],
        ['Complete the Escalation Matrix for Tier 1 vendors','L1 → L2 → L3 contacts are critical during a service crisis.'],
        ['Run a Full Backup every Friday','Copy it to Google Drive or a USB drive. Treat it like insurance.'],
        ['Review vendor performance quarterly','Even a brief 5-minute review with a score keeps your data meaningful.'],
        ['Use Tags to add custom labels','"ISO 27001", "Preferred Vendor", "Under Review", "GST Compliant" — tags make filtering faster.'],
        ['Restrict permissions correctly','Finance team should have "Read" on Vendors — not "Full". Viewers should never see admin modules.'],
        ['Archive, don\'t delete','When a vendor relationship ends, set status to Archived. Never delete — historical records are legally valuable.'],
      ].map(([title, desc], i) => (
        <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, padding: '10px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #EEF2F8' }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: NAVY, color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
          <div><div style={{ fontWeight: 700, fontSize: 13, color: NAVY, marginBottom: 3 }}>{title}</div><div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>{desc}</div></div>
        </div>
      ))}

      <h3 style={{ color: NAVY, margin: '20px 0 12px' }}>Contract expiry checklist</h3>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 10 }}>When the Dashboard shows vendors in "Contracts Expiring (90d)":</p>
      {['Click the card to see all vendors with expiring contracts','Open each vendor → Contracts & SLA tab','Check if the contract needs renewal, renegotiation, or termination','If renewing: use the Renew button to create a new contract with updated dates','If ending: change vendor empanelment status to Archived','If renegotiating: add a note in the Notes tab documenting the negotiation'].map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5, fontSize: 13 }}>
          <span style={{ color: BLUE, fontWeight: 700 }}>✓</span>
          <span style={{ color: '#444' }}>{s}</span>
        </div>
      ))}
    </div>
  );
}

function GlossaryHelp() {
  const terms = [
    ['GSTIN','Goods and Services Tax Identification Number. A unique 15-digit number for every registered Indian business. Format: 2-digit state code + 10-digit PAN + 1-digit entity number + 1Z + 1-digit checksum.'],
    ['Empanelment','The official process of registering, vetting, and approving a vendor to provide services. An empanelled vendor has passed all compliance, legal, and capability checks.'],
    ['SLA','Service Level Agreement. A written contract clause defining minimum service quality: response time, uptime, delivery speed. Breach = penalty or right to terminate.'],
    ['Vendor Tier','Classification of strategic importance. Tier 1 = critical, Tier 2 = regular, Tier 3 = occasional. Used for risk management and review frequency decisions.'],
    ['Escalation Matrix','A defined contact chain at a vendor for issue resolution. L1 = account manager (24h), L2 = regional head (48h), L3 = CEO/director (critical issues).'],
    ['Risk Score','Automated score calculated from: missing documents, expiring contracts, low performance ratings, no contacts, overdue tasks. Low / Medium / High / Critical.'],
    ['Scorecard','Composite vendor health score combining performance reviews, risk, contract status, and compliance. Configurable weights in Admin → Scoring Criteria.'],
    ['Approval Workflow','Governance process requiring manager sign-off before a vendor is marked active. Prevents unauthorised vendors from entering the system.'],
    ['WAL Mode','Write-Ahead Logging — a SQLite setting that makes the database faster and more resilient to corruption. Enabled automatically.'],
    ['Domain','Service category a vendor operates in. Examples: IT Services, Cloud, Infrastructure, Consulting, Managed Security, Staffing.'],
    ['Geographic Scope','The area where a vendor can deliver services. Pan India, Regional (e.g. West), State-level, or International.'],
    ['Full Backup','A complete copy of the database file + all uploaded documents, packed into a ZIP file. The safest backup type.'],
    ['DB Only Backup','A copy of only the SQLite database file (all records, users, settings). Fast and small. Does not include uploaded documents.'],
    ['Audit Log','A tamper-evident record of every action in the system: who did what, when, to which record. Useful for compliance and troubleshooting.'],
    ['MSA','Master Service Agreement. The overarching contract defining the legal relationship with a vendor — payment terms, IP rights, liability, dispute resolution.'],
    ['NDA','Non-Disclosure Agreement. Legally prevents a vendor from sharing your confidential information with third parties.'],
    ['SOW','Statement of Work. A document defining the specific tasks, deliverables, timeline, and payment milestones for a project.'],
  ];
  return (
    <div>
      {terms.map(([term, def]) => (
        <div key={term} style={{ marginBottom: 10, padding: '10px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #EEF2F8' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: NAVY, marginBottom: 4 }}>{term}</div>
          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>{def}</div>
        </div>
      ))}
    </div>
  );
}

const RENDERERS = {
  'getting-started': GettingStarted,
  'dashboard': DashboardHelp,
  'vendors': VendorsHelp,
  'vendor-detail': VendorDetailHelp,
  'contracts': ContractsHelp,
  'documents': DocumentsHelp,
  'performance': PerformanceHelp,
  'tasks': TasksHelp,
  'approvals': ApprovalsHelp,
  'analytics': AnalyticsHelp,
  'compare': CompareHelp,
  'users': UsersHelp,
  'permissions': PermissionsHelp,
  'backup': BackupHelp,
  'notifications': NotificationsHelp,
  'settings': SettingsHelp,
  'update': UpdateHelp,
  'tips': TipsHelp,
  'glossary': GlossaryHelp,
};

// ── Main component ──────────────────────────────────────────────────────────
export default function Help() {
  const [active, setActive] = useState('getting-started');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const contentRef = useRef();

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.opacity = '0';
      contentRef.current.style.transform = 'translateY(8px)';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (contentRef.current) {
            contentRef.current.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
            contentRef.current.style.opacity = '1';
            contentRef.current.style.transform = 'none';
          }
        });
      });
    }
  }, [active]);

  const currentSection = sections.find(s => s.id === active);
  const Renderer = RENDERERS[active];

  return (
    <Layout title="Help & Guide">
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', maxWidth: 1100, margin: '0 auto' }}>

        {/* Sidebar */}
        <div style={{ width: 210, flexShrink: 0, background: '#fff', borderRadius: 14, boxShadow: '0 4px 20px rgba(28,60,110,0.07)', border: '1px solid rgba(232,236,240,0.6)', padding: '14px 0', position: 'sticky', top: 24 }}>
          <div style={{ padding: '0 16px 10px', fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Help Topics</div>
          <div style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
            {sections.map(s => {
              const isActive = active === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => { setActive(s.id); setSearch(''); }}
                  style={{
                    padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                    background: isActive ? BLUE + '14' : 'transparent',
                    borderLeft: `3px solid ${isActive ? BLUE : 'transparent'}`,
                    color: isActive ? NAVY : '#666',
                    fontWeight: isActive ? 700 : 400,
                    fontSize: 13, transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F5F8FF'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: 15, flexShrink: 0 }}>{s.icon}</span>
                  <span style={{ lineHeight: 1.3 }}>{s.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header banner */}
          <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #2a5298 60%, #29ABE2 100%)`, borderRadius: 16, padding: '28px 32px', marginBottom: 24, color: '#fff', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ position: 'absolute', bottom: -20, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
            <div style={{ fontSize: 28, marginBottom: 6 }}>📚</div>
            <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.3px' }}>VendorHub Help & User Guide</h1>
            <p style={{ opacity: 0.8, fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>Complete documentation for every feature — from daily use to administration. Built for LRS Services (West) Mumbai.</p>
            <div style={{ position: 'relative' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search help topics... (e.g. 'backup', 'add vendor', 'SLA', 'permissions')"
                style={{ width: '100%', padding: '11px 16px 11px 40px', borderRadius: 10, border: 'none', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'rgba(255,255,255,0.18)', color: '#fff', backdropFilter: 'blur(4px)' }}
              />
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, opacity: 0.7 }}>🔍</span>
              {search && <span onClick={() => setSearch('')} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.6, fontSize: 14 }}>✕</span>}
            </div>
          </div>

          {/* Quick nav chips (when not searching) */}
          {!search && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {sections.map(s => (
                <div
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', background: active === s.id ? NAVY : '#fff', color: active === s.id ? '#fff' : '#555', border: `1px solid ${active === s.id ? NAVY : '#DDE2E8'}`, fontWeight: active === s.id ? 700 : 400, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  {s.icon} {s.title}
                </div>
              ))}
            </div>
          )}

          {/* Search results */}
          {search.trim() ? (
            <div>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>Showing sections matching "<strong>{search}</strong>"</div>
              {sections.filter(s => s.title.toLowerCase().includes(search.toLowerCase())).map(s => {
                const R = RENDERERS[s.id];
                return (
                  <div key={s.id} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 4px 20px rgba(28,60,110,0.07)', border: '1px solid rgba(232,236,240,0.6)', padding: 24, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid #F0F4F8' }}>
                      <span style={{ fontSize: 22 }}>{s.icon}</span>
                      <h2 style={{ fontFamily: 'Montserrat', color: NAVY, fontSize: 17, fontWeight: 700, margin: 0 }}>{s.title}</h2>
                      <button onClick={() => { setActive(s.id); setSearch(''); }} style={{ marginLeft: 'auto', fontSize: 12, color: BLUE, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Open section →</button>
                    </div>
                    <R />
                  </div>
                );
              })}
              {sections.filter(s => s.title.toLowerCase().includes(search.toLowerCase())).length === 0 && (
                <div style={{ background: '#fff', borderRadius: 14, padding: 40, textAlign: 'center', color: '#aaa' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🤔</div>
                  <div style={{ fontWeight: 600, color: '#555', marginBottom: 6 }}>No results for "{search}"</div>
                  <div style={{ fontSize: 13 }}>Try "backup", "vendor", "SLA", "permissions", or "tasks"</div>
                  <button onClick={() => setSearch('')} style={{ marginTop: 16, padding: '8px 20px', background: NAVY, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Clear search</button>
                </div>
              )}
            </div>
          ) : (
            /* Section content */
            <div ref={contentRef} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 4px 20px rgba(28,60,110,0.07)', border: '1px solid rgba(232,236,240,0.6)', padding: '26px 30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, paddingBottom: 18, borderBottom: '2px solid #F0F4F8' }}>
                <span style={{ fontSize: 28 }}>{currentSection?.icon}</span>
                <h2 style={{ fontFamily: 'Montserrat', color: NAVY, fontSize: 20, fontWeight: 800, margin: 0 }}>{currentSection?.title}</h2>
              </div>
              {Renderer && <Renderer />}

              {/* Prev / Next navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 20, borderTop: '1px solid #F0F4F8', gap: 12 }}>
                {(() => {
                  const idx = sections.findIndex(s => s.id === active);
                  const prev = sections[idx - 1];
                  const next = sections[idx + 1];
                  return (
                    <>
                      {prev ? (
                        <button onClick={() => setActive(prev.id)} style={{ padding: '9px 16px', border: '1px solid #DDE2E8', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                          ← {prev.icon} {prev.title}
                        </button>
                      ) : <div />}
                      {next && (
                        <button onClick={() => setActive(next.id)} style={{ padding: '9px 16px', border: '1px solid #DDE2E8', borderRadius: 8, background: NAVY, cursor: 'pointer', fontSize: 13, color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {next.icon} {next.title} →
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '14px 20px', marginTop: 16, fontSize: 12, color: '#aaa', textAlign: 'center', border: '1px solid #EEF2F8' }}>
            VendorHub — Built for LRS Services (West) Mumbai &nbsp;·&nbsp; For IT support, contact your System Administrator
          </div>
        </div>
      </div>
    </Layout>
  );
}
