import { useState } from 'react';
import { Search, Shield, ShieldOff, Download, Trash2, Lock, Unlock, AlertTriangle, Mail, User, List, ChevronRight } from 'lucide-react';
import adminAPI from '../../services/adminAPI';
import toast from 'react-hot-toast';

const SEARCH_MODES = [
  { key: 'email', label: 'Email', icon: Mail, placeholder: 'Exact email\u2026' },
  { key: 'name', label: 'Name', icon: User, placeholder: 'Partial name or email\u2026' },
  { key: 'all', label: 'All', icon: List, placeholder: '' },
];

export default function AdminUserManager() {
  const [searchMode, setSearchMode] = useState('email');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const mode = SEARCH_MODES.find((m) => m.key === searchMode);

  async function handleSearch(p) {
    const pageNum = p || page;
    setLoading(true);
    setSelectedUser(null);
    try {
      const params = {};
      if (searchMode === 'email') {
        params.email = query.trim();
      } else if (searchMode === 'name') {
        params.q = query.trim();
        params.page = pageNum;
        params.limit = 50;
      } else {
        params.all = 'true';
        params.page = pageNum;
        params.limit = 50;
      }

      const { data } = await adminAPI.lookupUser(params);

      if (searchMode === 'email') {
        setSelectedUser(data.data);
        setUsers([]);
      } else {
        setUsers(data.data.users);
        setTotal(data.data.total);
        setPage(data.data.page);
        setHasMore(data.data.page * data.data.limit < data.data.total);
      }
    } catch (err) {
      if (searchMode === 'email') {
        toast.error(err.response?.data?.message || 'Could not find user');
      } else {
        toast.error(err.response?.data?.message || 'Search failed');
      }
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (searchMode === 'all') return;
    setPage(1);
    await handleSearch(1);
  }

  async function handleShowAll() {
    setSearchMode('all');
    setQuery('');
    setPage(1);
    await handleSearch(1);
  }

  async function loadUserDetail(userId) {
    setLoadingDetail(true);
    try {
      const user = users.find((u) => u.id === userId);
      if (!user) return;
      const { data } = await adminAPI.lookupUser({ email: user.email });
      setSelectedUser(data.data);
    } catch (err) {
      toast.error('Could not load user details');
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleSuspend() {
    if (!suspendReason.trim()) { toast.error('Please enter a reason'); return; }
    try {
      await adminAPI.suspendUser(selectedUser.id, suspendReason);
      toast.success('Saved');
      setSelectedUser((u) => ({ ...u, suspended: true, suspendedAt: new Date().toISOString(), suspensionReason: suspendReason }));
    } catch { toast.error('Could not suspend'); }
  }

  async function handleUnsuspend() {
    try {
      await adminAPI.unsuspendUser(selectedUser.id);
      toast.success('Saved');
      setSelectedUser((u) => ({ ...u, suspended: false, suspendedAt: null, suspensionReason: null }));
    } catch { toast.error('Could not unsuspend'); }
  }

  async function handleLegalHold() {
    const next = !selectedUser.legalHold;
    try {
      await adminAPI.toggleLegalHold(selectedUser.id, next);
      toast.success('Saved');
      setSelectedUser((u) => ({ ...u, legalHold: next }));
    } catch { toast.error('Could not update'); }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const { data } = await adminAPI.exportUser(selectedUser.id);
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `user-${selectedUser.id}-export.json`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Downloaded');
    } catch { toast.error('Could not download'); }
    finally { setExporting(false); }
  }

  async function handleDeleteRecording(recordingId) {
    if (!confirm('Delete this recording?')) return;
    try {
      await adminAPI.deleteRecording(recordingId);
      toast.success('Deleted');
      setSelectedUser((u) => ({
        ...u,
        cameras: u.cameras.map((c) => ({
          ...c,
          recordings: c.recordings.filter((r) => r.id !== recordingId),
        })),
      }));
    } catch { toast.error('Could not delete'); }
  }

  function backToList() {
    setSelectedUser(null);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-text-primary">Users</h1>
        <p className="text-xs text-text-secondary mt-0.5">Find users, suspend accounts, and manage data</p>
      </div>

      {/* ── Search mode tabs ─────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {SEARCH_MODES.map((m) => (
          <button key={m.key} onClick={() => { setSearchMode(m.key); setQuery(''); setUsers([]); setSelectedUser(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              searchMode === m.key
                ? 'bg-ap-blue/10 text-ap-blue'
                : 'text-text-secondary hover:text-text-primary hover:bg-card-hover'
            }`}>
            <m.icon size={14} /> {m.label}
          </button>
        ))}
      </div>

      {/* ── Search form ──────────────────────────────── */}
      {searchMode !== 'all' && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            {mode && <mode.icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />}
            <input type="text" placeholder={mode?.placeholder} value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input w-full text-sm pl-9" />
          </div>
          <button type="submit" className="btn-primary text-sm" disabled={loading || !query.trim()}>
            <Search size={14} /> {loading ? 'Searching\u2026' : 'Search'}
          </button>
        </form>
      )}

      {searchMode === 'all' && (
        <button onClick={handleShowAll} className="btn-primary text-sm" disabled={loading}>
          {loading ? 'Loading\u2026' : 'Show All Users'}
        </button>
      )}

      {/* ── User list (name / all mode) ──────────────── */}
      {!selectedUser && users.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-text-secondary">{total} user{total !== 1 ? 's' : ''} found</p>
          {users.map((u) => (
            <button key={u.id} onClick={() => loadUserDetail(u.id)}
              className="card w-full p-3 flex items-center gap-3 hover:bg-card-hover transition-colors text-left">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: 'color-mix(in srgb, var(--ap-blue) 10%, transparent)', color: 'var(--ap-blue)' }}>
                {u.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{u.name}</p>
                <p className="text-xs text-text-secondary truncate">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {u.suspended && (
                  <span className="text-[10px] font-bold text-ap-red bg-ap-red/10 px-1.5 py-0.5 rounded">SUSPENDED</span>
                )}
                {u.legalHold && (
                  <span className="text-[10px] font-bold text-ap-orange bg-ap-orange/10 px-1.5 py-0.5 rounded">HOLD</span>
                )}
                <ChevronRight size={14} className="text-text-secondary" />
              </div>
            </button>
          ))}
          {hasMore && (
            <button onClick={() => handleSearch(page + 1)} className="btn-secondary w-full text-xs" disabled={loading}>
              Load more ({total - page * 50} remaining)
            </button>
          )}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────── */}
      {!selectedUser && users.length === 0 && !loading && (
        <div className="card p-8 text-center">
          <Search size={24} className="mx-auto mb-3 text-ap-gray3" />
          <p className="text-sm text-text-secondary">
            {searchMode === 'email' && 'Enter an email to find a user'}
            {searchMode === 'name' && 'Search by name or email'}
            {searchMode === 'all' && 'Click "Show All Users" to list everyone'}
          </p>
        </div>
      )}

      {/* ── Loading state for detail ─────────────────── */}
      {loadingDetail && (
        <div className="card p-8 text-center">
          <p className="text-sm text-text-secondary">Loading user details\u2026</p>
        </div>
      )}

      {/* ── User detail ──────────────────────────────── */}
      {selectedUser && !loadingDetail && (
        <>
          <button onClick={backToList}
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors">
            <ChevronRight size={12} className="rotate-180" /> Back to results
          </button>

          <div className="card p-5 shadow-apple-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-text-primary">{selectedUser.name}</h2>
                <p className="text-xs text-text-secondary">{selectedUser.email} &middot; {selectedUser.role}</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedUser.legalHold && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-ap-orange/10 text-ap-orange text-[10px] font-bold">
                    <Lock size={10} /> LEGAL HOLD
                  </span>
                )}
                {selectedUser.suspended && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-ap-red/10 text-ap-red text-[10px] font-bold">
                    <ShieldOff size={10} /> SUSPENDED
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div><span className="text-text-secondary">Joined</span><p className="text-text-primary font-semibold">{new Date(selectedUser.createdAt).toLocaleDateString()}</p></div>
              <div><span className="text-text-secondary">Privacy agreed</span><p className="text-text-primary font-semibold">{selectedUser.consentGivenAt ? new Date(selectedUser.consentGivenAt).toLocaleDateString() : '\u2014'}</p></div>
              <div><span className="text-text-secondary">Terms agreed</span><p className="text-text-primary font-semibold">{selectedUser.termsConsentAt ? new Date(selectedUser.termsConsentAt).toLocaleDateString() : '\u2014'}</p></div>
              <div><span className="text-text-secondary">IP address</span><p className="text-text-primary font-semibold">{selectedUser.consentIp || '\u2014'}</p></div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-ap-separator">
              {selectedUser.suspended ? (
                  <button onClick={handleUnsuspend} className="btn-secondary text-xs">
                  <Unlock size={12} /> Unsuspend
                </button>
              ) : (
                <>
                  <input type="text" placeholder="Reason\u2026" value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)} className="input py-1.5 text-xs w-48" />
                  <button onClick={handleSuspend} className="btn-destructive text-xs">
                    <ShieldOff size={12} /> Suspend
                  </button>
                </>
              )}
              <button onClick={handleLegalHold} className={`text-xs ${selectedUser.legalHold ? 'btn-destructive' : 'btn-secondary'}`}>
                <Lock size={12} /> {selectedUser.legalHold ? 'Legal Hold Off' : 'Legal Hold On'}
              </button>
              <button onClick={handleExport} disabled={exporting} className="btn-secondary text-xs">
                <Download size={12} /> {exporting ? 'Exporting\u2026' : 'Export All'}
              </button>
              {selectedUser.suspended && selectedUser.suspensionReason && (
                <div className="w-full flex items-center gap-2 text-xs text-ap-orange bg-ap-orange/5 rounded-lg px-3 py-2">
                  <AlertTriangle size={12} /> Suspended: {selectedUser.suspensionReason}
                  {selectedUser.suspendedAt && <span className="text-text-secondary">({new Date(selectedUser.suspendedAt).toLocaleString()})</span>}
                </div>
              )}
            </div>
          </div>

          {selectedUser.cameras.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-text-primary">Cameras ({selectedUser.cameras.length})</h3>
              {selectedUser.cameras.map((cam) => (
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

          {selectedUser.alerts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-text-primary">Alerts ({selectedUser.alerts.length})</h3>
              <div className="card p-3 shadow-apple-sm max-h-48 overflow-y-auto space-y-1">
                {selectedUser.alerts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg even:bg-fill-input">
                    <span className="text-text-secondary">{new Date(a.createdAt).toLocaleString()}</span>
                    <span className="text-text-primary">{a.type}</span>
                    <span className="text-text-secondary truncate max-w-[200px]">{a.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedUser.subscription && (
            <div className="text-xs text-text-secondary">
              Subscription: <strong className="text-text-primary">{selectedUser.subscription.planId}</strong> ({selectedUser.subscription.status})
            </div>
          )}
        </>
      )}
    </div>
  );
}
