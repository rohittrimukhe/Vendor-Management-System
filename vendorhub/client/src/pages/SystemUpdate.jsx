import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout.jsx';
import api from '../api.js';

const NAVY = '#1C3C6E';
const btnPrimary = (bg) => ({ padding: '10px 22px', background: bg || NAVY, color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 14, fontWeight: 700 });
const btnSecondary = { padding: '10px 20px', border: '1px solid #DDE2E8', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#555' };

const LOG_COLORS = { info: '#555', success: '#27AE60', error: '#E74C3C', restart: '#8E44AD' };
const LOG_ICONS = { info: '›', success: '✓', error: '✗', restart: '↺' };

function VersionBadge({ label, sha, extra, color }) {
  return (
    <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 180 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
      <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color: color || NAVY }}>{sha || '—'}</div>
      {extra && <div style={{ fontSize: 12, color: '#aaa' }}>{extra}</div>}
    </div>
  );
}

export default function SystemUpdate() {
  const [current, setCurrent] = useState(null);
  const [check, setCheck] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateLog, setUpdateLog] = useState([]);
  const [updateDone, setUpdateDone] = useState(false);
  const logRef = useRef();
  const pollRef = useRef();

  useEffect(() => {
    api.get('/api/update/current').then(setCurrent).catch(() => {});
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [updateLog]);

  const checkForUpdates = async () => {
    setChecking(true);
    setCheckError('');
    setCheck(null);
    try {
      const d = await api.get('/api/update/check');
      setCheck(d);
    } catch (e) {
      setCheckError(e.message || 'Failed to check for updates');
    }
    setChecking(false);
  };

  const startUpdate = async () => {
    if (!window.confirm('This will pull the latest code from GitHub, reinstall dependencies, and rebuild the app.\n\nYour data (database, uploads) will NOT be affected.\n\nThe server will restart automatically after the update.\n\nProceed?')) return;
    setUpdating(true);
    setUpdateLog([]);
    setUpdateDone(false);

    try {
      await api.post('/api/update/apply', {});
    } catch (e) {
      setUpdateLog(prev => [...prev, { ts: new Date().toISOString(), msg: 'Failed to start update: ' + e.message, type: 'error' }]);
      setUpdating(false);
      return;
    }

    // Poll log endpoint
    pollRef.current = setInterval(async () => {
      try {
        const d = await api.get('/api/update/log');
        setUpdateLog(d.log || []);
        const hasRestart = (d.log || []).some(l => l.type === 'restart' && l.msg === 'RESTART_REQUIRED');
        const hasError = (d.log || []).some(l => l.type === 'error');
        if (hasRestart || hasError || !d.inProgress) {
          clearInterval(pollRef.current);
          setUpdating(false);
          if (hasRestart) setUpdateDone(true);
        }
      } catch {
        // Server may have restarted — that's OK
        clearInterval(pollRef.current);
        setUpdating(false);
        setUpdateDone(true);
      }
    }, 1000);
  };

  // Normalise server response field names
  const remoteSha      = check?.latestCommit?.sha || check?.remoteSha || null;
  const remoteBranch   = check?.remoteBranch || 'main';
  const newCommits     = check?.recentCommits || check?.newCommits || [];
  const upToDate       = check?.upToDate;
  // Only treat as "has updates" when we actually have a valid remote SHA to compare
  const hasUpdates     = check && !upToDate && !!remoteSha;
  const githubUnreachable = check && !remoteSha;
  const newCommitsCount = check?.newCommitsCount ?? newCommits.length;

  return (
    <Layout title="System Update">
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 22, color: NAVY, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>🔄</span> System Update
          </h2>
          <p style={{ color: '#666', fontSize: 13, marginTop: 6 }}>
            Check for the latest version on GitHub and apply updates with one click. Your database and uploaded files are never touched during an update.
          </p>
        </div>

        {/* No-git info banner */}
        {current && !current.hasGit && (
          <div style={{ background: '#F0F8FF', border: '1px solid #B3D9FF', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#29ABE2', marginBottom: 4 }}>ℹ️ Git-free update mode</div>
            <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
              Git is not installed on this machine — that's fine. Updates are downloaded directly as a ZIP from GitHub and applied automatically. No Git installation required.
            </div>
          </div>
        )}

        {/* Current version card */}
        {current && (
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: '22px 24px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Installed Version</div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <VersionBadge label="App Version" sha={`v${current.version}`} color={NAVY} />
              <VersionBadge label="Commit SHA" sha={current.sha} extra={current.message} />
              <VersionBadge label="Branch" sha={current.branch} extra={current.date?.split('T')[0]} />
            </div>
            {current.message && (
              <div style={{ marginTop: 14, background: '#F8FAFC', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#555' }}>
                <span style={{ color: '#888', fontWeight: 600 }}>Last commit: </span>{current.message}
                {current.author && <span style={{ color: '#aaa' }}> — by {current.author}</span>}
              </div>
            )}
          </div>
        )}

        {/* Check for updates section */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: '22px 24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em' }}>GitHub Updates</div>
            <button onClick={checkForUpdates} disabled={checking || updating} style={btnPrimary()}>
              {checking ? '⏳ Checking...' : '🔍 Check for Updates'}
            </button>
          </div>

          {checkError && (
            <div style={{ background: '#FFF5F5', border: '1px solid #FFCDD2', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#E74C3C' }}>
              ✗ {checkError}
            </div>
          )}

          {check && !checkError && (
            <div>
              {/* GitHub unreachable — API returned no SHA (rate limit / network) */}
              {githubUnreachable && (
                <div style={{ background: '#FFF8E1', border: '1px solid #FFD54F', borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <span style={{ fontSize: 28 }}>⚠️</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#E67E22' }}>Could not reach GitHub</div>
                    <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>
                      GitHub API did not return version info — you may be rate-limited (60 requests/hour for unauthenticated). Try again in a few minutes.
                    </div>
                  </div>
                </div>
              )}
              {/* Status banner — only when GitHub actually responded with a SHA */}
              {!githubUnreachable && upToDate ? (
                <div style={{ background: '#F0FFF4', border: '1px solid #A3E4B8', borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <span style={{ fontSize: 28 }}>✅</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#27AE60' }}>You're up to date!</div>
                    <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>
                      Local commit <code style={{ background: '#E8F5E9', padding: '1px 5px', borderRadius: 3, fontSize: 12 }}>{check.localSha}</code> matches latest on <strong>{remoteBranch}</strong>
                    </div>
                  </div>
                </div>
              ) : !githubUnreachable && hasUpdates ? (
                <div style={{ background: '#FFFBF0', border: '1px solid #F39C1260', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                    <span style={{ fontSize: 28 }}>🆕</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#E67E22' }}>{newCommitsCount} new commit{newCommitsCount !== 1 ? 's' : ''} available</div>
                      <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>
                        Your version: <code style={{ background: '#FFF3CD', padding: '1px 5px', borderRadius: 3, fontSize: 12 }}>{check.localSha}</code>
                        {' → '}
                        Latest: <code style={{ background: '#D4EDDA', padding: '1px 5px', borderRadius: 3, fontSize: 12 }}>{remoteSha}</code>
                        {' on '}<strong>{remoteBranch}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Commit list */}
                  {newCommits.length > 0 && (
                    <div style={{ background: '#fff', border: '1px solid #F0E0B0', borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
                      <div style={{ padding: '8px 12px', background: '#FFF8E1', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #F0E0B0' }}>
                        What's New
                      </div>
                      {newCommits.map((c, i) => (
                        <div key={c.sha} style={{ display: 'flex', gap: 10, padding: '9px 14px', borderBottom: i < newCommits.length - 1 ? '1px solid #F8F0D8' : 'none', alignItems: 'flex-start' }}>
                          <code style={{ fontSize: 11, color: '#29ABE2', fontFamily: 'monospace', flexShrink: 0, marginTop: 2, background: '#EEF9FF', padding: '1px 5px', borderRadius: 3 }}>{c.sha}</code>
                          <span style={{ fontSize: 13, color: '#444', lineHeight: 1.4 }}>{c.message}</span>
                        </div>
                      ))}
                      {newCommitsCount > 20 && (
                        <div style={{ padding: '8px 14px', fontSize: 12, color: '#aaa', background: '#FFFBF0' }}>…and {newCommitsCount - 20} more commits</div>
                      )}
                    </div>
                  )}

                  {/* Release info from GitHub */}
                  {check.release && (
                    <div style={{ background: '#EEF5FF', borderRadius: 8, padding: '12px 16px', marginBottom: 14 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: NAVY, marginBottom: 4 }}>Release: {check.release.name || check.release.tag}</div>
                      {check.release.body && <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{check.release.body.slice(0, 600)}{check.release.body.length > 600 ? '…' : ''}</div>}
                    </div>
                  )}

                  {/* Update button */}
                  <button onClick={startUpdate} disabled={updating} style={{ ...btnPrimary('#27AE60'), display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>⬇️</span>
                    {updating ? 'Updating...' : `Update to Latest (${newCommitsCount} commit${newCommitsCount !== 1 ? 's' : ''})`}
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {!check && !checkError && !checking && (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#aaa', fontSize: 13 }}>
              Click "Check for Updates" to compare your installation with the latest version on GitHub.
            </div>
          )}
        </div>

        {/* Update progress log */}
        {(updating || updateLog.length > 0) && (
          <div style={{ background: '#0D1117', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '12px 16px', background: '#161B22', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#8B949E', fontWeight: 600 }}>Update Log</span>
              {updating && <span style={{ fontSize: 12, color: '#F39C12' }}>⏳ Running...</span>}
              {updateDone && <span style={{ fontSize: 12, color: '#27AE60', fontWeight: 700 }}>✓ Complete</span>}
            </div>
            <div ref={logRef} style={{ padding: '16px', maxHeight: 340, overflowY: 'auto', fontFamily: 'monospace', fontSize: 13 }}>
              {updateLog.filter(l => l.msg !== 'RESTART_REQUIRED').map((l, i) => (
                <div key={i} style={{ marginBottom: 6, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: '#555', flexShrink: 0, fontSize: 11 }}>{l.ts?.split('T')[1]?.slice(0, 8)}</span>
                  <span style={{ color: LOG_COLORS[l.type] || '#8B949E', flexShrink: 0 }}>{LOG_ICONS[l.type] || '›'}</span>
                  <span style={{ color: LOG_COLORS[l.type] || '#C9D1D9' }}>{l.msg}</span>
                </div>
              ))}
              {updating && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                  <span style={{ color: '#555', fontSize: 11 }}></span>
                  <span style={{ color: '#F39C12', animation: 'pulse 1s infinite' }}>● working...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Post-update restart notice */}
        {updateDone && (
          <div style={{ background: '#F0FFF4', border: '1px solid #A3E4B8', borderRadius: 12, padding: '20px 24px', marginBottom: 20, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 32 }}>🎉</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#27AE60', marginBottom: 6 }}>Update applied successfully!</div>
              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7 }}>
                The server is restarting now. This page will automatically refresh in a few seconds.
                If it doesn't reload, <button onClick={() => window.location.reload()} style={{ background: 'none', border: 'none', color: '#29ABE2', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, textDecoration: 'underline' }}>click here to refresh</button>.
              </div>
              <AutoRefresh />
            </div>
          </div>
        )}

        {/* Safety info */}
        <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>What happens during an update</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {[
              ['🔒', 'Data Safe', 'Your database and uploaded files are in gitignored directories — they are never touched'],
              ['⬇️', 'Pull Code', 'Latest code is fetched from GitHub and merged into your installation'],
              ['📦', 'Dependencies', 'npm install runs to add/update any new packages'],
              ['🏗️', 'Rebuild UI', 'The client bundle is rebuilt with the latest frontend code'],
              ['🔁', 'Auto Restart', 'The server restarts automatically (or use PM2 / service manager)'],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{title}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function AutoRefresh() {
  const [countdown, setCountdown] = useState(10);
  useEffect(() => {
    const t = setInterval(() => setCountdown(c => {
      if (c <= 1) { clearInterval(t); window.location.reload(); return 0; }
      return c - 1;
    }), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ marginTop: 8, fontSize: 12, color: '#aaa' }}>Auto-refreshing in {countdown}s…</div>
  );
}
