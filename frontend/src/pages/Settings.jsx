import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { userAPI } from '../services/api';
import { Trash2, CreditCard, ChevronRight, Download, Shield, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import GlassSurface from '../components/GlassSurface';

export default function Settings() {
  const { user, refreshUser, logout } = useAuth();
  const { theme, toggleTheme, bgTone, setBgTone, glassStyle, setGlassStyle } = useTheme();
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
    try { await userAPI.updateProfile({ name: profile.name }); await refreshUser(); toast.success('Saved'); }
    catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  }

  async function savePassword(e) {
    e.preventDefault();
    if (password.newPassword !== password.confirm) { toast.error('Passwords don\'t match'); return; }
    setSaving(true);
    try {
      await userAPI.changePassword({ currentPassword: password.currentPassword, newPassword: password.newPassword });
      toast.success('Password changed. Please log in again.');
      await logout(); navigate('/login');
    } catch (err) { toast.error(err.response?.data?.message || 'Could not change password'); }
    finally { setSaving(false); }
  }


  async function handleExport() {
    setExporting(true);
    try {
      const { data } = await userAPI.exportData();
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'hk-camera-export.json'; a.click();
      URL.revokeObjectURL(url);
      toast.success('Downloaded');
    } catch { toast.error('Could not download'); }
    finally { setExporting(false); }
  }

  async function handleDoNotSell() {
    const next = !doNotSell;
    setDoNotSell(next);
    try { await userAPI.updateDoNotSell({ doNotSell: next }); await refreshUser(); toast.success('Saved'); }
    catch { setDoNotSell(!next); toast.error('Could not save'); }
  }

  async function handleDeleteAccount() {
    if (!confirm('This will permanently delete your account and everything in it. Are you sure?')) return;
    await userAPI.deleteAccount(); logout(); navigate('/login'); toast.success('Account deleted');
  }

  return (
    <div className="page-container max-w-xl animate-fade-in">
      <div className="page-header"><h1 className="page-title">Settings</h1></div>

      {/* Appearance */}
      <div className="section-header">Appearance</div>
      <GlassSurface className="card-grouped">
        <label className="list-row justify-between cursor-pointer">
          <div className="flex items-center gap-3">
            {theme === 'dark' ? <Moon size={16} className="text-ap-blue" /> : <Sun size={16} className="text-ap-blue" />}
            <div><p className="text-sm font-semibold text-text-primary">Theme</p><p className="text-xs text-text-secondary">Switch between light and dark</p></div>
          </div>
          <button onClick={toggleTheme} className="btn-secondary text-xs px-4 py-2 capitalize">{theme}</button>
        </label>
        <div className="px-5 py-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/30 border border-ap-separator text-[10px] font-bold">A</div>
            <div><p className="text-sm font-semibold text-text-primary">Background Tone</p><p className="text-xs text-text-secondary">Lighten or darken the page background</p></div>
          </div>
          <div className="flex items-center gap-3 pl-[2.5rem]">
            <span className="text-[11px] text-text-secondary w-6 text-right">Light</span>
            <input type="range" min="0" max="100" value={bgTone}
              onChange={(e) => setBgTone(Number(e.target.value))}
              className="flex-1 cursor-pointer"
              style={{ accentColor: 'var(--ap-blue)' }} />
            <span className="text-[11px] text-text-secondary w-6">Dark</span>
          </div>
        </div>
        <div className="px-5 py-3 flex items-center gap-4">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-ap-blue/10 text-ap-blue text-[10px] font-bold">G</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-text-primary">Glass Effect</p>
            <p className="text-xs text-text-secondary">Frosted (fast) or Liquid (Chrome, GPU)</p>
          </div>
          <div className="flex gap-1 bg-page rounded-lg p-0.5 border border-ap-separator">
            <button onClick={() => setGlassStyle('frosted')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${glassStyle === 'frosted' ? 'bg-ap-blue text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
              Frosted
            </button>
            <button onClick={() => setGlassStyle('liquid')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${glassStyle === 'liquid' ? 'bg-ap-blue text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
              Liquid
            </button>
          </div>
        </div>
      </GlassSurface>

      {/* Profile */}
      <div className="section-header">Profile</div>
      <GlassSurface className="card-grouped">
        <form onSubmit={saveProfile} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-1">Name</label>
            <input className="input" value={profile.name} onChange={(e) => setProfile({ name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-1">Email</label>
            <input className="input opacity-50 cursor-not-allowed" value={user?.email} disabled />
          </div>
          <button type="submit" className="btn-primary self-start text-sm" disabled={saving}>Save</button>
        </form>
      </GlassSurface>

      {/* Password */}
      <div className="section-header">Password</div>
      <GlassSurface className="card-grouped">
        <form onSubmit={savePassword} className="p-5 space-y-4">
          {[
            { key: 'currentPassword', label: 'Current Password' },
            { key: 'newPassword',     label: 'New Password' },
            { key: 'confirm',         label: 'Confirm New Password' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-text-primary mb-1">{label}</label>
              <input type="password" className="input" value={password[key]}
                onChange={(e) => setPassword({ ...password, [key]: e.target.value })} required />
            </div>
          ))}
          <button type="submit" className="btn-primary self-start text-sm" disabled={saving}>Update Password</button>
        </form>
      </GlassSurface>

      {/* Notifications */}
      <div className="section-header">Notifications</div>
      <GlassSurface className="card-grouped">
        {[
          { key: 'emailAlerts', label: 'Email alerts', desc: 'Get alerts by email' },
          { key: 'pushAlerts',  label: 'Push alerts',  desc: 'Get push notifications in your browser' },
        ].map(({ key, label, desc }) => (
          <label key={key} className="list-row justify-between cursor-pointer">
            <div><p className="text-sm font-semibold text-text-primary">{label}</p><p className="text-xs text-text-secondary">{desc}</p></div>
            <input type="checkbox" className="sr-only" checked={notifs[key]} onChange={async (e) => { const next = { ...notifs, [key]: e.target.checked }; setNotifs(next); try { await userAPI.updateProfile(next); await refreshUser(); } catch {} }} />
            <div className={`toggle ${notifs[key] ? 'toggle-on' : 'toggle-off'}`}><span className="toggle-knob" /></div>
          </label>
        ))}
      </GlassSurface>

      {/* Billing */}
      <div className="section-header">Billing</div>
      <GlassSurface className="card-grouped">
        <button onClick={() => navigate('/billing')} className="list-row w-full justify-between">
          <div className="flex items-center gap-3">
            <CreditCard size={16} className="text-ap-blue" />
            <div className="text-left"><p className="text-sm font-semibold text-text-primary">Subscription</p><p className="text-xs text-text-secondary">View or change your plan</p></div>
          </div>
          <ChevronRight size={16} className="text-text-secondary" />
        </button>
      </GlassSurface>

      {/* Privacy & Data */}
      <div className="section-header">Privacy</div>
      <GlassSurface className="card-grouped">
        <label className="list-row justify-between cursor-pointer">
          <div className="flex items-center gap-3">
            <Shield size={16} className="text-ap-blue" />
            <div><p className="text-sm font-semibold text-text-primary">Do Not Sell My Data</p><p className="text-xs text-text-secondary">Turn this on if you want to opt out of data sharing.</p></div>
          </div>
          <input type="checkbox" className="sr-only" checked={doNotSell} onChange={handleDoNotSell} />
          <div className={`toggle ${doNotSell ? 'toggle-on' : 'toggle-off'}`}><span className="toggle-knob" /></div>
        </label>
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Download size={16} className="text-ap-blue" />
            <div><p className="text-sm font-semibold text-text-primary">Export My Data</p><p className="text-xs text-text-secondary">Download a copy of everything</p></div>
          </div>
          <button onClick={handleExport} disabled={exporting} className="btn-secondary text-xs px-4 py-2">
            {exporting ? 'Downloading\u2026' : 'Download'}
          </button>
        </div>
        <Link to="/privacy" className="list-row w-full justify-between">
          <div className="flex items-center gap-3">
            <Shield size={16} className="text-ap-blue" />
            <div className="text-left"><p className="text-sm font-semibold text-text-primary">Privacy Policy</p><p className="text-xs text-text-secondary">Read our privacy policy</p></div>
          </div>
          <ChevronRight size={16} className="text-text-secondary" />
        </Link>
      </GlassSurface>

      {/* Danger Zone */}
      <div className="section-header text-ap-red">Delete Account</div>
      <GlassSurface className="card-grouped border border-ap-red/20">
        <div className="p-5">
          <p className="text-text-secondary text-sm mb-4">This permanently deletes your account, cameras, and recordings.</p>
          <button onClick={handleDeleteAccount} className="btn-destructive text-sm">Delete My Account</button>
        </div>
      </GlassSurface>
    </div>
  );
}
