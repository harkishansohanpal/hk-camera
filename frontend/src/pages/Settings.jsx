import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../services/api';
import { Trash2, CreditCard, ChevronRight, Download, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ name: user?.name ?? '' });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [notifs, setNotifs] = useState({ emailAlerts: user?.emailAlerts ?? true, pushAlerts: user?.pushAlerts ?? true });
  const [doNotSell, setDoNotSell] = useState(user?.doNotSell ?? false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try { await userAPI.updateProfile({ name: profile.name }); await refreshUser(); toast.success('Profile updated'); }
    catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  }

  async function savePassword(e) {
    e.preventDefault();
    if (password.newPassword !== password.confirm) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    try {
      await userAPI.changePassword({ currentPassword: password.currentPassword, newPassword: password.newPassword });
      toast.success('Password changed. Please log in again.');
      await logout(); navigate('/login');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to change password'); }
    finally { setSaving(false); }
  }

  async function saveNotifications() { await userAPI.updateProfile(notifs); await refreshUser(); toast.success('Notification settings saved'); }

  async function handleExport() {
    setExporting(true);
    try {
      const { data } = await userAPI.exportData();
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'hk-camera-export.json'; a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  }

  async function handleDoNotSell() {
    const next = !doNotSell;
    setDoNotSell(next);
    try { await userAPI.updateDoNotSell({ doNotSell: next }); await refreshUser(); toast.success(next ? 'Do Not Sell enabled' : 'Do Not Sell disabled'); }
    catch { setDoNotSell(!next); toast.error('Failed to update'); }
  }

  async function handleDeleteAccount() {
    if (!confirm('This will permanently delete your account and all data. Are you absolutely sure?')) return;
    await userAPI.deleteAccount(); logout(); navigate('/login'); toast.success('Account deleted');
  }

  return (
    <div className="page-container max-w-xl animate-fade-in">
      <div className="page-header"><h1 className="page-title">Settings</h1></div>

      {/* Profile */}
      <div className="section-header">Profile</div>
      <div className="card-grouped">
        <form onSubmit={saveProfile} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-1">Display name</label>
            <input className="input" value={profile.name} onChange={(e) => setProfile({ name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-1">Email</label>
            <input className="input opacity-50 cursor-not-allowed" value={user?.email} disabled />
          </div>
          <button type="submit" className="btn-primary self-start text-sm" disabled={saving}>Save profile</button>
        </form>
      </div>

      {/* Password */}
      <div className="section-header">Security</div>
      <div className="card-grouped">
        <form onSubmit={savePassword} className="p-5 space-y-4">
          {[
            { key: 'currentPassword', label: 'Current password' },
            { key: 'newPassword',     label: 'New password' },
            { key: 'confirm',         label: 'Confirm new password' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-text-primary mb-1">{label}</label>
              <input type="password" className="input" value={password[key]}
                onChange={(e) => setPassword({ ...password, [key]: e.target.value })} required />
            </div>
          ))}
          <button type="submit" className="btn-primary self-start text-sm" disabled={saving}>Change password</button>
        </form>
      </div>

      {/* Notifications */}
      <div className="section-header">Notifications</div>
      <div className="card-grouped">
        {[
          { key: 'emailAlerts', label: 'Email alerts', desc: 'Receive motion & offline alerts by email' },
          { key: 'pushAlerts',  label: 'Push alerts',  desc: 'Receive browser push notifications' },
        ].map(({ key, label, desc }) => (
          <label key={key} className="list-row justify-between cursor-pointer">
            <div><p className="text-sm font-semibold text-text-primary">{label}</p><p className="text-xs text-text-secondary">{desc}</p></div>
            <input type="checkbox" className="sr-only" checked={notifs[key]} onChange={(e) => setNotifs((n) => ({ ...n, [key]: e.target.checked }))} />
            <div className={`toggle ${notifs[key] ? 'toggle-on' : 'toggle-off'}`}><span className="toggle-knob" /></div>
          </label>
        ))}
        <div className="px-5 py-3"><button onClick={saveNotifications} className="btn-primary text-sm">Save notifications</button></div>
      </div>

      {/* Billing */}
      <div className="section-header">Billing</div>
      <div className="card-grouped">
        <button onClick={() => navigate('/billing')} className="list-row w-full justify-between">
          <div className="flex items-center gap-3">
            <CreditCard size={16} className="text-ap-blue" />
            <div className="text-left"><p className="text-sm font-semibold text-text-primary">Subscription</p><p className="text-xs text-text-secondary">Manage your plan and payment methods</p></div>
          </div>
          <ChevronRight size={16} className="text-text-secondary" />
        </button>
      </div>

      {/* Privacy & Data */}
      <div className="section-header">Privacy & Data</div>
      <div className="card-grouped">
        <label className="list-row justify-between cursor-pointer">
          <div className="flex items-center gap-3">
            <Shield size={16} className="text-ap-blue" />
            <div><p className="text-sm font-semibold text-text-primary">Do Not Sell My Personal Information</p><p className="text-xs text-text-secondary">Under CCPA/CPRA, you can opt out of data sharing. We do not sell data.</p></div>
          </div>
          <input type="checkbox" className="sr-only" checked={doNotSell} onChange={handleDoNotSell} />
          <div className={`toggle ${doNotSell ? 'toggle-on' : 'toggle-off'}`}><span className="toggle-knob" /></div>
        </label>
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Download size={16} className="text-ap-blue" />
            <div><p className="text-sm font-semibold text-text-primary">Export My Data</p><p className="text-xs text-text-secondary">Download all your cameras, recordings, and alerts</p></div>
          </div>
          <button onClick={handleExport} disabled={exporting} className="btn-secondary text-xs px-4 py-2">
            {exporting ? 'Exporting\u2026' : 'Export'}
          </button>
        </div>
        <Link to="/privacy" className="list-row w-full justify-between">
          <div className="flex items-center gap-3">
            <Shield size={16} className="text-ap-blue" />
            <div className="text-left"><p className="text-sm font-semibold text-text-primary">Privacy Policy</p><p className="text-xs text-text-secondary">How we handle your data</p></div>
          </div>
          <ChevronRight size={16} className="text-text-secondary" />
        </Link>
      </div>

      {/* Danger Zone */}
      <div className="section-header text-ap-red">Danger Zone</div>
      <div className="card-grouped border border-ap-red/20">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2"><Trash2 size={16} className="text-ap-red" /><h2 className="text-sm font-bold text-ap-red">Delete Account</h2></div>
          <p className="text-text-secondary text-sm mb-4">Permanently delete your account and all associated cameras and recordings.</p>
          <button onClick={handleDeleteAccount} className="btn-destructive text-sm">Delete my account</button>
        </div>
      </div>
    </div>
  );
}
