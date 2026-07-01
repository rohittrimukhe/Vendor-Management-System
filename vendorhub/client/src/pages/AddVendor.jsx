import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../api.js';

const STEPS = ['Basic Info', 'Domains & Tags', 'Contact Person'];

const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #DDE2E8', borderRadius: 6, fontSize: 14, outline: 'none' };
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 5 };
const errStyle = { color: '#E74C3C', fontSize: 12, marginTop: 3 };

export default function AddVendor() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [basic, setBasic] = useState({
    name: '', gstin: '', website: '', address: '', geo_scope: 'Pan India',
    vendor_type: 'IT Services', empanelment_status: 'In Evaluation', tier: 'Tier 2',
  });

  const [domainsInput, setDomainsInput] = useState('');
  const [domains, setDomains] = useState([]);
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState([]);
  const [summary, setSummary] = useState('');

  const [contacts, setContacts] = useState([{ name: '', role: '', email: '', phone: '' }]);

  const addDomain = () => {
    const d = domainsInput.trim();
    if (d && !domains.includes(d)) setDomains([...domains, d]);
    setDomainsInput('');
  };

  const addTag = () => {
    const t = tagsInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagsInput('');
  };

  const validateStep = () => {
    const errs = {};
    if (step === 0 && !basic.name.trim()) errs.name = 'Vendor name is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const vendor = await api.post('/api/vendors', {
        ...basic,
        domains,
        tags,
        summary,
        contacts: contacts.filter(c => c.name.trim()),
      });
      navigate(`/vendors/${vendor.id}`);
    } catch (e) {
      setErrors({ submit: e.message });
    } finally {
      setLoading(false);
    }
  };

  const chipStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EEF5FF', color: '#1C3C6E', padding: '4px 10px', borderRadius: 20, fontSize: 13, fontWeight: 500, margin: '3px' };
  const removeBtn = (onClick) => <span onClick={onClick} style={{ cursor: 'pointer', fontSize: 12, color: '#888', marginLeft: 2 }}>✕</span>;

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div style={{ display: 'grid', gap: 18 }}>
            <div>
              <label style={labelStyle}>Vendor Name <span style={{ color: '#E74C3C' }}>*</span></label>
              <input style={{ ...inputStyle, borderColor: errors.name ? '#E74C3C' : '#DDE2E8' }} value={basic.name} onChange={e => setBasic({ ...basic, name: e.target.value })} placeholder="e.g. TechCorp Solutions Pvt Ltd" />
              {errors.name && <p style={errStyle}>{errors.name}</p>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>GSTIN</label>
                <input style={inputStyle} value={basic.gstin} onChange={e => setBasic({ ...basic, gstin: e.target.value })} placeholder="22AAAAA0000A1Z5" />
              </div>
              <div>
                <label style={labelStyle}>Website</label>
                <input style={inputStyle} value={basic.website} onChange={e => setBasic({ ...basic, website: e.target.value })} placeholder="https://vendor.com" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Address</label>
              <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={basic.address} onChange={e => setBasic({ ...basic, address: e.target.value })} placeholder="Full office address" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Geographic Scope</label>
                <select style={inputStyle} value={basic.geo_scope} onChange={e => setBasic({ ...basic, geo_scope: e.target.value })}>
                  <option>Pan India</option><option>Regional</option><option>International</option><option>State-Level</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Vendor Type</label>
                <select style={inputStyle} value={basic.vendor_type} onChange={e => setBasic({ ...basic, vendor_type: e.target.value })}>
                  <option>IT Services</option><option>IT Products</option><option>Consulting</option><option>Infrastructure</option><option>Cloud Services</option><option>Managed Services</option><option>Other</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Empanelment Status</label>
                <select style={inputStyle} value={basic.empanelment_status} onChange={e => setBasic({ ...basic, empanelment_status: e.target.value })}>
                  <option>Empanelled</option><option>In Evaluation</option><option>On Hold</option><option>Archived</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Tier</label>
                <select style={inputStyle} value={basic.tier} onChange={e => setBasic({ ...basic, tier: e.target.value })}>
                  <option>Tier 1</option><option>Tier 2</option><option>Tier 3</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div style={{ display: 'grid', gap: 24 }}>
            <div>
              <label style={labelStyle}>Service Domains</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input style={{ ...inputStyle, flex: 1 }} value={domainsInput} onChange={e => setDomainsInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDomain())} placeholder="e.g. Cloud Services, ERP, Networking" />
                <button onClick={addDomain} style={{ padding: '10px 18px', background: '#1C3C6E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>Add</button>
              </div>
              <div style={{ minHeight: 36 }}>
                {domains.map((d, i) => (
                  <span key={i} style={chipStyle}>{d}{removeBtn(() => setDomains(domains.filter((_, j) => j !== i)))}</span>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Tags</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input style={{ ...inputStyle, flex: 1 }} value={tagsInput} onChange={e => setTagsInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="e.g. ISO-27001, CMMI-L3, Preferred" />
                <button onClick={addTag} style={{ padding: '10px 18px', background: '#1C3C6E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Add</button>
              </div>
              <div style={{ minHeight: 36 }}>
                {tags.map((t, i) => (
                  <span key={i} style={{ ...chipStyle, background: '#F0F4FF', color: '#555' }}>{t}{removeBtn(() => setTags(tags.filter((_, j) => j !== i)))}</span>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Summary / Description</label>
              <textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} value={summary} onChange={e => setSummary(e.target.value)} placeholder="Brief description of the vendor's capabilities, specializations, and history..." />
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <p style={{ color: '#666', fontSize: 13, marginBottom: 18 }}>Add at least one contact person for this vendor. You can add more contacts later.</p>
            {contacts.map((c, i) => (
              <div key={i} style={{ background: '#F8FAFC', borderRadius: 8, padding: '18px', marginBottom: 14, border: '1px solid #E8ECF0', position: 'relative' }}>
                {i > 0 && <span onClick={() => setContacts(contacts.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 12, right: 14, cursor: 'pointer', color: '#E74C3C', fontSize: 18 }}>✕</span>}
                <div style={{ fontWeight: 600, fontSize: 13, color: '#444', marginBottom: 12 }}>Contact {i + 1}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Name</label>
                    <input style={inputStyle} value={c.name} onChange={e => setContacts(contacts.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Contact name" />
                  </div>
                  <div>
                    <label style={labelStyle}>Role</label>
                    <input style={inputStyle} value={c.role} onChange={e => setContacts(contacts.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} placeholder="Account Manager" />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input style={inputStyle} type="email" value={c.email} onChange={e => setContacts(contacts.map((x, j) => j === i ? { ...x, email: e.target.value } : x))} placeholder="contact@vendor.com" />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input style={inputStyle} value={c.phone} onChange={e => setContacts(contacts.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))} placeholder="+91-XXXXXXXXXX" />
                  </div>
                </div>
              </div>
            ))}
            <button onClick={() => setContacts([...contacts, { name: '', role: '', email: '', phone: '' }])} style={{ padding: '9px 18px', border: '1px dashed #29ABE2', borderRadius: 6, background: '#F0FAFF', color: '#29ABE2', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              + Add Another Contact
            </button>
          </div>
        );
    }
  };

  return (
    <Layout title="Add Vendor">
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Progress steps */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <React.Fragment key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: i <= step ? '#1C3C6E' : '#DDE2E8', color: i <= step ? '#fff' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{i < step ? '✓' : i + 1}</div>
                <span style={{ fontSize: 14, fontWeight: i === step ? 600 : 400, color: i === step ? '#1C3C6E' : '#888' }}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: i < step ? '#1C3C6E' : '#DDE2E8', margin: '0 12px' }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Montserrat', color: '#1C3C6E', marginBottom: 20, fontSize: 17 }}>{STEPS[step]}</h3>
          {renderStep()}
          {errors.submit && <p style={{ color: '#E74C3C', marginTop: 16, fontSize: 13 }}>{errors.submit}</p>}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button
            onClick={() => step === 0 ? navigate('/vendors') : setStep(s => s - 1)}
            style={{ padding: '10px 22px', border: '1px solid #DDE2E8', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#555' }}
          >
            {step === 0 ? '← Cancel' : '← Back'}
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => { if (validateStep()) setStep(s => s + 1); }} style={{ padding: '10px 28px', background: '#1C3C6E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              Next →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} style={{ padding: '10px 28px', background: loading ? '#7A9CC6' : '#27AE60', color: '#fff', border: 'none', borderRadius: 6, cursor: loading ? 'wait' : 'pointer', fontSize: 14, fontWeight: 600 }}>
              {loading ? 'Saving...' : '✓ Save Vendor'}
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}
