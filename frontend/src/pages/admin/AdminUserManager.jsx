import { useState } from 'react';
import { Search, Shield, ShieldOff, Download, Trash2, Lock, Unlock, AlertTriangle } from 'lucide-react';
import adminAPI from '../../services/adminAPI';
import toast from 'react-hot-toast';

export default function AdminUserManager() {
  const [email, setEmail] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  async function handleLookup(e) {
    e.preventDefault();
    setLoading(true); setUser(null);
    try {
      const { data } = await adminAPI.lookupUser(email);
      setUser(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'User not found');
    } finally { setLoading(false); }
  }

  async function handleSuspend() {
    if (!suspendReason.trim()) { toast.error('Suspension reason required'); return; }
    try {
      await adminAPI.suspendUser(user.id, suspendReason);
      toast.success('User suspended');
      setUser((u) => ({ ...u, suspended: true, suspendedAt: new Date().toISOString(), suspensionReason: suspendReason }));
    } catch { toast.error('Failed to suspend'); }
  }

  async function handleUnsuspend() {
    try {
      await adminAPI.unsuspendUser(user.id);
      toast.success('User unsuspended');
      setUser((u) => ({ ...u, suspended: false, suspendedAt: null, suspensionReason: null }));
    } catch { toast.error('Failed to unsuspend'); }
  }

  async function handleLegalHold() {
    const next = !user.legalHold;
    try {
      await adminAPI.toggleLegalHold(user.id, next);
      toast.success(next ? 'Legal hold enabled' : 'Legal hold disabled');
      setUser((u) => ({ ...u, legalHold: next }));
    } catch { toast.error('Failed to toggle legal hold'); }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const { data } = await adminAPI.exportUser(user.id);
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `user-${user.id}-export.json`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  }

  async function handleDeleteRecording(recordingId) {
    if (!confirm('Delete this recording?')) return;
    try {
      await adminAPI.deleteRecording(recordingId);
      toast.success('Recording deleted');
      setUser((u) => ({
        ...u,
        cameras: u.cameras.map((c) => ({
          ...c,
          recordings: c.recordings.filter((r) => r.id !== recordingId),
        })),
      }));
    } catch { toast.error('Failed to delete recording'); }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-text-primary">User Management</h1>
        <p className="text-xs text-text-secondary mt-0.5">Look up users, suspend accounts, manage legal holds, and export data</p>
      </div>

      <form onSubmit={handleLookup} className="flex gap-2">
        <input type="email" placeholder="User email\u2026" value={email} onChange={(e) => setEmail(e.target.value)} required
          className="input flex-1 text-sm" />
        <button type="submit" className="btn-primary text-sm" disabled={loading}>
          <Search size={14} /> {loading ? 'Searching\u2026' : 'Look Up'}
        </button>
      </form>

      {!user && !loading && (
        <div className="card p-8 text-center">
          <Search size={24} className="mx-auto mb-3 text-ap-gray3" />
          <p className="text-sm text-text-secondary">Search for a user by email to manage their account</p>
        </div>
      )}

      {user && (
        <>
          <div className="card p-5 shadow-apple-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-text-primary">{user.name}</h2>
                <p className="text-xs text-text-secondary">{user.email} &middot; {user.role}</p>
              </div>
              <div className="flex items-center gap-2">
                {user.legalHold && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-ap-orange/10 text-ap-orange text-[10px] font-bold">
                    <Lock size={10} /> LEGAL HOLD
                  </span>
                )}
                {user.suspended && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-ap-red/10 text-ap-red text-[10px] font-bold">
                    <ShieldOff size={10} /> SUSPENDED
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div><span className="text-text-secondary">Created</span><p className="text-text-primary font-semibold">{new Date(user.createdAt).toLocaleDateString()}</p></div>
              <div><span className="text-text-secondary">Privacy consent</span><p className="text-text-primary font-semibold">{user.consentGivenAt ? new Date(user.consentGivenAt).toLocaleDateString() : '\u2014'}</p></div>
              <div><span className="text-text-secondary">Terms consent</span><p className="text-text-primary font-semibold">{user.termsConsentAt ? new Date(user.termsConsentAt).toLocaleDateString() : '\u2014'}</p></div>
              <div><span className="text-text-secondary">Consent IP</span><p className="text-text-primary font-semibold">{user.consentIp || '\u2014'}</p></div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-ap-separator">
              {user.suspended ? (
                <button onClick={handleUnsuspend} className="btn-secondary text-xs">
                  <Unlock size={12} /> Unsuspend Account
                </button>
              ) : (
                <>
                  <input type="text" placeholder="Suspension reason\u2026" value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)} className="input py-1.5 text-xs w-48" />
                  <button onClick={handleSuspend} className="btn-destructive text-xs">
                    <ShieldOff size={12} /> Suspend
                  </button>
                </>
              )}
              <button onClick={handleLegalHold} className={`text-xs ${user.legalHold ? 'btn-destructive' : 'btn-secondary'}`}>
                <Lock size={12} /> {user.legalHold ? 'Remove Legal Hold' : 'Enable Legal Hold'}
              </button>
              <button onClick={handleExport} disabled={exporting} className="btn-secondary text-xs">
                <Download size={12} /> {exporting ? 'Exporting\u2026' : 'Export All Data'}
              </button>
              {user.suspended && user.suspensionReason && (
                <div className="w-full flex items-center gap-2 text-xs text-ap-orange bg-ap-orange/5 rounded-lg px-3 py-2">
                  <AlertTriangle size={12} /> Suspended: {user.suspensionReason}
                  {user.suspendedAt && <span className="text-text-secondary">({new Date(user.suspendedAt).toLocaleString()})</span>}
                </div>
              )}
            </div>
          </div>

          {user.cameras.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-text-primary">Cameras ({user.cameras.length})</h3>
              {user.cameras.map((cam) => (
                <div key={cam.id} className="card p-4 shadow-apple-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{cam.name}</p>
                      <p className="text-[10px] text-text-secondary font-mono">{cam.streamKey}</p>
                    </div>
                    <span className="text-[10px] text-text-secondary">{cam.recordings.length} recordings</span>
                  </div>
                  {cam.recordings.length > 0 && (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {cam.recordings.map((rec) => (
                        <div key={rec.id} className="flex items-center justify-between bg-fill-input rounded-lg px-3 py-1.5 text-xs">
                          <div className="flex-1 min-w-0">
                            <span className="text-text-secondary">{new Date(rec.createdAt).toLocaleString()}</span>
                            <span className="text-text-secondary ml-2">({rec.duration || '?'}s, {rec.trigger})</span>
                          </div>
                          <button onClick={() => handleDeleteRecording(rec.id)}
                            className="text-ap-red hover:text-red-600 transition-colors flex-shrink-0 ml-2">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {user.alerts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-text-primary">Recent Alerts ({user.alerts.length})</h3>
              <div className="card p-3 shadow-apple-sm max-h-48 overflow-y-auto space-y-1">
                {user.alerts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg even:bg-fill-input">
                    <span className="text-text-secondary">{new Date(a.createdAt).toLocaleString()}</span>
                    <span className="text-text-primary">{a.type}</span>
                    <span className="text-text-secondary truncate max-w-[200px]">{a.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {user.subscription && (
            <div className="text-xs text-text-secondary">
              Subscription: <strong className="text-text-primary">{user.subscription.planId}</strong> ({user.subscription.status})
            </div>
          )}
        </>
      )}
    </div>
  );
}
