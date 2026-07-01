import React, { useState } from 'react';
import Layout from '../components/Layout.jsx';

const NAVY = '#1C3C6E';
const BLUE = '#29ABE2';

const sections = [
  {
    id: 'getting-started',
    icon: '🚀',
    title: 'Getting Started',
    topics: [
      {
        q: 'What is VendorHub?',
        a: `VendorHub is a Vendor Management System built for LRS Services Pvt Ltd. It helps you:
• Keep a central list of all vendors (suppliers, contractors, service providers)
• Store their contacts, documents, contracts, and performance scores
• Control who in your company can see or edit information
• Run and schedule backups of all your data

Think of it as a smart digital filing cabinet for all your vendor relationships.`
      },
      {
        q: 'How do I log in?',
        a: `Go to http://localhost:8080 in your browser. Enter your Username and Password, then click Sign In.

Your username and password were created either during the Setup Wizard (for the first admin account) or by your System Administrator.

If you forgot your password, ask your System Administrator to reset it from the Users page.`
      },
      {
        q: 'What do I see after logging in?',
        a: `You land on the Dashboard — your home screen. It shows:
• 4 summary boxes (KPI cards) at the top showing key counts
• A Domain Coverage chart on the left
• Recently Added Vendors on the right

Click any of the 4 boxes to jump to a filtered list of vendors.`
      },
    ]
  },
  {
    id: 'dashboard',
    icon: '📊',
    title: 'Dashboard',
    topics: [
      {
        q: 'What do the 4 boxes (KPI cards) mean?',
        a: `Total Vendors — The total number of vendors in the system regardless of status.

Empanelled — Vendors that have been approved and are actively used by LRS Services. "Empanelled" means officially registered and cleared for use.

In Evaluation — Vendors currently being assessed or trialed. They are not yet approved for use.

Contracts Expiring (90d) — Contracts with vendors that will expire within the next 90 days. This is a warning so you can take action before they expire.

Click any box to jump to a filtered vendor list.`
      },
      {
        q: 'What is Domain Coverage?',
        a: `Domain Coverage shows which categories of services your vendors cover and how many vendors you have in each category.

For example:
• IT Services — 5 vendors
• Cloud — 3 vendors
• Consulting — 2 vendors

This helps you see if you have enough vendors in each area or if a category needs more options.`
      },
    ]
  },
  {
    id: 'vendors',
    icon: '🏢',
    title: 'Vendor Directory',
    topics: [
      {
        q: 'How do I add a new vendor?',
        a: `1. Click "Vendors" in the left sidebar
2. Click the "+ Add Vendor" button (top right)
3. Fill in Step 1 — Basic Info:
   • Vendor Name (required)
   • GSTIN — their tax registration number
   • Website, Address, Geographic Scope
   • Vendor Type — what kind of company they are
   • Empanelment Status — current approval stage
   • Tier — how important/strategic this vendor is
4. Click "Next" → Step 2 — add Service Domains and Tags
5. Click "Next" → Step 3 — add a Contact Person
6. Click "Save Vendor"`
      },
      {
        q: 'What does Empanelment Status mean?',
        a: `This is the approval stage of the vendor:

• Empanelled — Fully approved and active. You can work with them.
• In Evaluation — Being assessed. Not yet cleared for use.
• On Hold — Temporarily paused, maybe due to a dispute or review.
• Archived — No longer active. Kept for historical records only.`
      },
      {
        q: 'What do Tier 1 / Tier 2 / Tier 3 mean?',
        a: `Tiers show how strategic or important a vendor is to LRS Services:

• Tier 1 — Strategic, critical vendors. High dependency, long-term relationships.
• Tier 2 — Important vendors used regularly but not critical.
• Tier 3 — Occasional or low-priority vendors. Easy to replace.

This helps you know which vendor relationships to protect and prioritize.`
      },
      {
        q: 'How do I search and filter vendors?',
        a: `On the Vendor Directory page:
• Search box — Type any part of the vendor name, GSTIN, or summary
• Domain dropdown — Filter by service domain (e.g. Cloud, IT Services)
• Tier dropdown — Filter by Tier 1, 2, or 3
• Status dropdown — Filter by Empanelled, In Evaluation, etc.
• Type dropdown — Filter by vendor type

All filters work together — you can combine them.`
      },
      {
        q: 'What are the 6 tabs inside a vendor?',
        a: `When you click a vendor, you see 6 tabs:

1. Overview — Company info, GSTIN, website, domains, tags, and certifications
2. Contacts — All contact persons at that vendor (name, role, email, phone)
3. Documents — Uploaded files like proposals, agreements, brochures
4. Contracts & SLA — Contract details with start/end dates, value, and SLA terms
5. Performance — Ratings and reviews given to this vendor
6. Escalation Matrix — Who to contact if there's a problem (L1, L2, L3 support)`
      },
      {
        q: 'What is an Escalation Matrix?',
        a: `An Escalation Matrix tells you who to contact when there is a problem with a vendor, and in what order.

Example:
• L1 — Account Manager (first point of contact for normal issues)
• L2 — Regional Head (escalate if L1 doesn't resolve in 24 hours)
• L3 — CEO / Director (escalate for critical or legal issues)

This ensures you always know who to call and there is no confusion during a crisis.`
      },
      {
        q: 'What is SLA?',
        a: `SLA stands for Service Level Agreement. It is a written promise from the vendor about the quality and speed of their service.

Examples:
• "We will respond to support tickets within 4 hours"
• "System uptime will be 99.9%"
• "Deliveries will happen within 3 business days"

If the vendor breaks the SLA, you have written proof to take action. You store SLA details in the Contracts & SLA tab.`
      },
      {
        q: 'How do I upload documents for a vendor?',
        a: `1. Open a vendor → click the "Documents" tab
2. Drag and drop a file onto the upload area, OR click the area to browse
3. The file uploads automatically
4. You will see it listed with name, size, type, and upload date
5. Click "Download" to save it, or "Delete" to remove it

Supported: all file types (PDF, Word, Excel, PPT, images, etc.)
Maximum file size: 50 MB per file`
      },
      {
        q: 'How do I add a performance review for a vendor?',
        a: `1. Open the vendor → click the "Performance" tab
2. Click "+ Add Review"
3. Set the Overall Rating (1–5 stars)
4. Set scores for:
   • On-Time Delivery (0–100%)
   • Support Quality (0–100%)
   • Price Competitiveness (0–100%)
5. Add Notes (optional)
6. Click Save

The system will automatically calculate the average across all reviews.`
      },
    ]
  },
  {
    id: 'users',
    icon: '👥',
    title: 'User Management',
    topics: [
      {
        q: 'How do I add a new user (colleague)?',
        a: `Only System Administrators can add users.

1. Click "Users" in the left sidebar under Administration
2. Click "+ Add User"
3. Fill in:
   • Full Name
   • Email
   • Username (they will use this to log in)
   • Password (they should change it on first login)
   • Group / Role — which permission group they belong to
   • Department — e.g. IT, Finance, Procurement
   • Reporting Manager — their manager in the system (optional)
4. Click "Add User"`
      },
      {
        q: 'How do I reset a user\'s password?',
        a: `1. Go to Users page
2. Find the user in the table
3. Click the "Reset PW" button
4. Type a new temporary password
5. Click "Reset Password"
6. Tell the user their new password verbally or via email — it is not sent automatically`
      },
      {
        q: 'How do I deactivate a user who left the company?',
        a: `1. Go to Users page
2. Find the user
3. Click "Deactivate"
4. Their account is disabled — they can no longer log in
5. Their data (history, audit records) is preserved

To re-enable: click "Activate" on the same user.`
      },
      {
        q: 'What is a Reporting Manager?',
        a: `A Reporting Manager is the user's direct supervisor in the system. When you create a user, you can select another existing user as their manager.

This helps organize your company hierarchy within VendorHub and can be used in future features like approval workflows.`
      },
    ]
  },
  {
    id: 'groups',
    icon: '🛡',
    title: 'Groups & Roles',
    topics: [
      {
        q: 'What is a Group?',
        a: `A Group (also called a Role) is a label you assign to users that controls what they can see and do in VendorHub.

The 5 default groups are:
• System Administrator — Can do everything. Full access to all features.
• Vendor Manager — Full access to manage vendors.
• Procurement Team — Can view and edit vendor information.
• Finance Team — Can read vendor and contract information.
• Viewer — Can only view information, cannot change anything.

You can create your own groups too.`
      },
      {
        q: 'How do I create a new Group?',
        a: `1. Click "Groups & Roles" in the sidebar
2. Click "+ Add Group"
3. Enter:
   • Group Name
   • Description (what this group is for)
   • Default Access Level (Full / Read / None)
   • Colour — pick a colour to identify the group
4. Click "Create Group"
5. Then go to the Permissions page to set exactly which modules this group can access`
      },
    ]
  },
  {
    id: 'permissions',
    icon: '🔑',
    title: 'Permissions',
    topics: [
      {
        q: 'What is the Permission Matrix?',
        a: `The Permission Matrix is a grid that shows:
• Rows = Modules (sections of the app like Vendors, Documents, Users, etc.)
• Columns = Groups (roles like Finance Team, Viewer, etc.)
• Each cell = what that group can do in that module

The three access levels are:
• Full — Can view, create, edit, and delete
• Read — Can only view (cannot make changes)
• None — Cannot see this section at all`
      },
      {
        q: 'How do I change permissions?',
        a: `1. Click "Permissions" in the sidebar
2. You will see the grid
3. Click any cell to cycle through: Full → Read → None → Full...
4. Make all your changes
5. Click "Save Permissions" at the top right

Note: The System Administrator group always has Full access to everything and cannot be changed — this protects the admin account.`
      },
      {
        q: 'Why can\'t I change System Administrator permissions?',
        a: `The System Administrator group is locked with Full access to all modules. This is a safety feature — if you could accidentally remove admin access from all admins, no one would be able to log in and fix it. The lock prevents this situation.`
      },
    ]
  },
  {
    id: 'backup',
    icon: '💾',
    title: 'Backup & Recovery',
    topics: [
      {
        q: 'Why should I back up?',
        a: `Your VendorHub data (all vendors, contacts, documents, contracts) is stored in a file on your computer. If the computer crashes, gets infected by a virus, or the file gets corrupted, you could lose everything.

A backup is a copy of that file saved somewhere safe. If something goes wrong, you can restore from the backup and recover your data.`
      },
      {
        q: 'What is a Full Backup vs DB Only?',
        a: `Full Backup — Copies both the database (all vendor records) AND all uploaded files (documents you uploaded for vendors). Creates a .zip file. Recommended for complete protection.

DB Only — Copies only the database file. Much faster and smaller, but does not include uploaded documents. Good for quick daily backups if documents don't change often.`
      },
      {
        q: 'How do I run a manual backup?',
        a: `1. Click "Backup & Recovery" in the sidebar
2. Select backup type: Full Backup or DB Only
3. Click "▶ Run Manual Backup"
4. Wait a few seconds
5. You will see a green success message and the backup appears in Backup History below
6. Click "⬇ Download" to save a copy to your Desktop or USB drive`
      },
      {
        q: 'How do I set up automatic (scheduled) backups?',
        a: `1. Go to Backup & Recovery page
2. In the "Scheduled Backups" section on the right:
   • Choose Frequency: Daily, Weekly, or Monthly
   • Choose Time: e.g. 2:00 AM (recommended — when nobody is using the system)
   • For Weekly: choose which day (e.g. Sunday)
   • For Monthly: choose which day of the month (e.g. 1st)
3. Click "Save Schedule"

The server will automatically run the backup at that time. Make sure the server is running (the black terminal window is open).`
      },
      {
        q: 'How do I restore from a backup?',
        a: `⚠ WARNING: Restoring will replace ALL your current data with the backup. Any data added after the backup was taken will be lost.

1. Go to Backup & Recovery page
2. Find the backup you want to restore in the Backup History table
3. Click "↺ Restore" next to it
4. Read the warning carefully
5. Click "Restore Now" to confirm
6. The server will restart automatically
7. Refresh your browser after 10–15 seconds

Before restoring, consider running a manual backup of the current state first.`
      },
      {
        q: 'Where are backup files stored?',
        a: `Backups are stored in the "backups" folder inside your VendorHub installation folder.

For example: C:\\VendorHub\\Vendor-Management-System\\vendorhub\\backups\\

Each backup file has a timestamp in the name so you know when it was taken.

You should also periodically copy backup files to an external hard drive, USB drive, or cloud storage (Google Drive, OneDrive) for extra safety.`
      },
    ]
  },
  {
    id: 'glossary',
    icon: '📖',
    title: 'Glossary of Terms',
    topics: [
      {
        q: 'GSTIN',
        a: 'Goods and Services Tax Identification Number. A unique 15-digit number assigned to every registered business in India under the GST system. Used to verify a vendor is a legitimate registered company.'
      },
      {
        q: 'Empanelment',
        a: 'The process of officially registering and approving a vendor to provide services to LRS Services. An "Empanelled" vendor has completed all checks and is cleared for use.'
      },
      {
        q: 'SLA (Service Level Agreement)',
        a: 'A written agreement between LRS Services and a vendor that defines the expected quality, speed, and availability of their service. Example: "Support tickets resolved within 4 hours."'
      },
      {
        q: 'Vendor Tier',
        a: 'A classification of how important a vendor is. Tier 1 = critical/strategic, Tier 2 = regularly used, Tier 3 = occasional or low-priority.'
      },
      {
        q: 'Escalation Matrix',
        a: 'A defined sequence of contacts at a vendor to reach when issues cannot be resolved at the current level. L1 = first contact, L2 = supervisor, L3 = top management.'
      },
      {
        q: 'Geographic Scope',
        a: 'The area where a vendor operates. Options: Pan India (all of India), Regional (specific region), State-Level (one state), International (outside India).'
      },
      {
        q: 'Domain',
        a: 'The category of service a vendor provides. Examples: IT Services, Cloud, Consulting, Infrastructure, Managed Services.'
      },
      {
        q: 'Permission Matrix',
        a: 'A table that defines what each user group (role) can do in each section of VendorHub. Access levels: Full (create/edit/delete), Read (view only), None (no access).'
      },
      {
        q: 'Audit Log',
        a: 'A record of every action taken in the system — who did what and when. Helps track changes and identify if something was changed incorrectly.'
      },
      {
        q: 'Full Backup',
        a: 'A complete copy of all data including the database and all uploaded files (documents). The safest backup type.'
      },
      {
        q: 'WAL Mode',
        a: 'Write-Ahead Logging — a technical SQLite setting that makes the database faster and more reliable. Enabled automatically in VendorHub.'
      },
    ]
  },
  {
    id: 'tips',
    icon: '💡',
    title: 'Tips & Best Practices',
    topics: [
      {
        q: 'Top 10 tips for using VendorHub effectively',
        a: `1. Always fill in the GSTIN — it helps verify vendors are legitimate
2. Upload key documents (NDA, MSA, Rate Card) to the Documents tab immediately after onboarding a vendor
3. Set contract end dates accurately — the dashboard will warn you 90 days before expiry
4. Add at least 2 contacts per vendor (primary and backup)
5. Use the Escalation Matrix for every Tier 1 vendor
6. Run a full backup every Friday before leaving office
7. Add performance reviews quarterly — at minimum annually
8. Use Tags to add custom labels (e.g. "ISO Certified", "Preferred", "Under Review")
9. Set the correct Tier when adding a vendor — review it annually
10. Use Groups to restrict access — Finance team doesn't need to delete vendors`
      },
      {
        q: 'What should I do when a vendor contract is about to expire?',
        a: `1. The Dashboard will show a warning in "Contracts Expiring (90d)"
2. Click that box to see all expiring contracts
3. Open each vendor and check the Contracts & SLA tab
4. Decide: renew, renegotiate, or let it lapse
5. If renewing: update the contract end date after signing
6. If ending: change vendor status to "Archived"`
      },
      {
        q: 'What to do when a vendor is no longer being used?',
        a: `Don't delete vendors — archive them instead.

1. Open the vendor
2. Click Edit
3. Change Empanelment Status to "Archived"
4. Save

This preserves all their history (documents, contracts, performance reviews) for future reference, while removing them from active lists.`
      },
    ]
  },
];

export default function Help() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [openTopics, setOpenTopics] = useState({});
  const [search, setSearch] = useState('');

  function toggleTopic(key) {
    setOpenTopics(prev => ({ ...prev, [key]: !prev[key] }));
  }

  const filtered = search.trim()
    ? sections.map(s => ({
        ...s,
        topics: s.topics.filter(t =>
          t.q.toLowerCase().includes(search.toLowerCase()) ||
          t.a.toLowerCase().includes(search.toLowerCase())
        )
      })).filter(s => s.topics.length > 0)
    : sections;

  const activeData = search.trim()
    ? filtered
    : filtered.filter(s => s.id === activeSection);

  return (
    <Layout title="Help & Guide">
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* Left sidebar nav */}
        {!search.trim() && (
          <div style={{ width: 220, flexShrink: 0, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '16px 0', position: 'sticky', top: 24 }}>
            <div style={{ padding: '0 16px 12px', fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1 }}>Help Topics</div>
            {sections.map(s => (
              <div
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: activeSection === s.id ? BLUE + '15' : 'transparent',
                  borderLeft: activeSection === s.id ? `3px solid ${BLUE}` : '3px solid transparent',
                  color: activeSection === s.id ? NAVY : '#555',
                  fontWeight: activeSection === s.id ? 600 : 400,
                  fontSize: 14,
                  transition: 'all 0.15s',
                }}
              >
                <span>{s.icon}</span>
                <span>{s.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #2a5298 100%)`, borderRadius: 12, padding: '28px 32px', marginBottom: 24, color: '#fff' }}>
            <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
              VendorHub Help & User Guide
            </h1>
            <p style={{ opacity: 0.8, fontSize: 14, marginBottom: 20 }}>
              Everything you need to know about using VendorHub — for first-time users and daily reference.
            </p>
            <div style={{ position: 'relative' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search help topics... (e.g. 'backup', 'add vendor', 'SLA')"
                style={{
                  width: '100%', padding: '12px 16px 12px 40px',
                  borderRadius: 8, border: 'none', fontSize: 14,
                  outline: 'none', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.15)', color: '#fff',
                }}
              />
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, opacity: 0.7 }}>🔍</span>
            </div>
          </div>

          {/* Search results or section content */}
          {search.trim() && filtered.length === 0 && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: '#aaa' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🤔</div>
              <p>No results found for "<strong>{search}</strong>"</p>
              <p style={{ fontSize: 13, marginTop: 8 }}>Try different keywords or browse the topics on the left.</p>
            </div>
          )}

          {(search.trim() ? filtered : activeData).map(section => (
            <div key={section.id} style={{ marginBottom: 24 }}>
              {(search.trim() || activeData.length > 1) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <span style={{ fontSize: 22 }}>{section.icon}</span>
                  <h2 style={{ fontFamily: 'Montserrat, sans-serif', color: NAVY, fontSize: 18, fontWeight: 700 }}>{section.title}</h2>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {section.topics.map((t, i) => {
                  const key = `${section.id}-${i}`;
                  const isOpen = openTopics[key] || !!search.trim();
                  return (
                    <div key={key} style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden', border: isOpen ? `1px solid ${BLUE}40` : '1px solid #f0f0f0' }}>
                      <div
                        onClick={() => toggleTopic(key)}
                        style={{
                          padding: '14px 20px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: isOpen ? NAVY + '06' : '#fff',
                          transition: 'background 0.15s',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: NAVY, fontSize: 14, fontFamily: 'Open Sans, sans-serif' }}>
                          {t.q}
                        </span>
                        <span style={{ fontSize: 18, color: BLUE, flexShrink: 0, marginLeft: 12 }}>
                          {isOpen ? '−' : '+'}
                        </span>
                      </div>

                      {isOpen && (
                        <div style={{ padding: '0 20px 16px', borderTop: `1px solid ${NAVY}10` }}>
                          <div style={{ paddingTop: 14 }}>
                            {t.a.split('\n').map((line, li) => {
                              if (line.startsWith('•')) {
                                return (
                                  <div key={li} style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
                                    <span style={{ color: BLUE, flexShrink: 0, fontWeight: 700 }}>•</span>
                                    <span style={{ color: '#444', fontSize: 14, lineHeight: 1.6 }}>{line.slice(1).trim()}</span>
                                  </div>
                                );
                              }
                              if (line.match(/^\d+\./)) {
                                return (
                                  <div key={li} style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
                                    <span style={{ color: BLUE, flexShrink: 0, fontWeight: 700, minWidth: 20 }}>{line.split('.')[0]}.</span>
                                    <span style={{ color: '#444', fontSize: 14, lineHeight: 1.6 }}>{line.split('.').slice(1).join('.').trim()}</span>
                                  </div>
                                );
                              }
                              if (!line.trim()) return <div key={li} style={{ height: 8 }} />;
                              return <p key={li} style={{ color: '#444', fontSize: 14, lineHeight: 1.7, marginBottom: 6 }}>{line}</p>;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Footer */}
          <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '16px 20px', marginTop: 8, fontSize: 13, color: '#888', textAlign: 'center' }}>
            VendorHub v1.0.0 — Built for LRS Services Pvt Ltd &nbsp;|&nbsp; For IT support contact your System Administrator
          </div>
        </div>
      </div>
    </Layout>
  );
}
