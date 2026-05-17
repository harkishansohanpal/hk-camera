import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../services/api';
import { User, Lock, Bell, Trash2, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile]     = useState({ name: user?.name ?? '' });
  const [password, setPassword]   = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [notifs, setNotifs]       = useState({ emailAlerts: user?.emailAlerts ?? true, pushAlerts: user?.pushAlerts ?? true });
  const [saving, setSaving]       = useState(false);

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await userAPI.updateProfile({ name: profile.name });
      await refreshUser();
      toast.success('Profile updated');
    } catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  }

  async function savePassword(e) {
    e.preventDefault();
    if (password.newPassword !== password.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await userAPI.changePassword({ currentPassword: password.currentPassword, newPassword: password.newPassword });
      toast.success('Password changed. Please log in again.');
      await logout();
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setSaving(false); }
  }

  async function saveNotifications() {
    await userAPI.updateProfile(notifs);
    await refreshUser();
    toast.success('Notification settings saved');
  }

  async function handleDeleteAccount() {
    if (!confirm('This will permanently delete your account and all data. Are you absolutely sure?')) return;
    await userAPI.deleteAccount();
    logout();
    navigate('/login');
    toast.success('Account deleted');
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-4 sm:gap-6 px-0 sm:px-1">
      <h1 className="text-xl sm:text-2xl font-bold text-white">Settings</h1>

      {/* Profile */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <User size={16} className="text-hk-400" />
          <h2 className="text-sm sm:text-base font-semibold text-white">Profile</h2>
        </div>
        <form onSubmit={saveProfile} className="flex flex-col gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1">Display name</label>
            <input className="input text-sm" value={profile.name} onChange={(e) => setProfile({ name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1">Email</label>
            <input className="input text-sm opacity-60 cursor-not-allowed" value={user?.email} disabled />
          </div>
          <button type="submit" className="btn-primary w-full sm:w-auto sm:self-start text-sm" disabled={saving}>Save profile</button>
        </form>
      </div>

      {/* Password */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Lock size={16} className="text-hk-400" />
          <h2 className="text-sm sm:text-base font-semibold text-white">Change Password</h2>
        </div>
        <form onSubmit={savePassword} className="flex flex-col gap-3 sm:gap-4">
          {[
            { key: 'currentPassword', label: 'Current password' },
            { key: 'newPassword',     label: 'New password' },
            { key: 'confirm',         label: 'Confirm new password' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1">{label}</label>
              <input
                type="password" className="input text-sm"
                value={password[key]} onChange={(e) => setPassword({ ...password, [key]: e.target.value })}
                required
              />
            </div>
          ))}
          <button type="submit" className="btn-primary w-full sm:w-auto sm:self-start text-sm" disabled={saving}>Change password</button>
        </form>
      </div>

      {/* Notifications */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Bell size={16} className="text-hk-400" />
          <h2 className="text-sm sm:text-base font-semibold text-white">Notifications</h2>
        </div>
        <div className="flex flex-col gap-2 sm:gap-3">
          {[
            { key: 'emailAlerts', label: 'Email alerts', desc: 'Receive motion & offline alerts by email' },
            { key: 'pushAlerts',  label: 'Push alerts',  desc: 'Receive browser push notifications' },
          ].map(({ key, label, desc }) => (
            <label key={key} className="flex items-center justify-between cursor-pointer gap-2 min-h-[44px]">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-300">{label}</p>
                <p className="text-[10px] sm:text-xs text-slate-500">{desc}</p>
              </div>
              <div className="relative flex-shrink-0">
                <input
                  type="checkbox" className="sr-only"
                  checked={notifs[key]}
                  onChange={(e) => setNotifs((n) => ({ ...n, [key]: e.target.checked }))}
                />
                <div className={`flex items-center w-10 h-6 rounded-full transition-colors cursor-pointer px-0.5 ${notifs[key] ? 'bg-hk-500' : 'bg-slate-600'}`}>
                  <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${notifs[key] ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>
            </label>
          ))}
          <button onClick={saveNotifications} className="btn-primary self-start mt-1 text-sm">Save notifications</button>
        </div>
      </div>

      {/* Billing */}
      <div className="card">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <CreditCard size={16} className="text-hk-400" />
          <h2 className="text-sm sm:text-base font-semibold text-white">Billing</h2>
        </div>
        <p className="text-slate-400 text-xs sm:text-sm mb-3 sm:mb-4">Manage your subscription and payment methods.</p>
        <button onClick={() => navigate('/billing')} className="btn-primary text-sm">View billing</button>
      </div>

      {/* Danger zone */}
      <div className="card border-red-500/30">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <Trash2 size={16} className="text-red-400" />
          <h2 className="text-sm sm:text-base font-semibold text-red-400">Danger Zone</h2>
        </div>
        <p className="text-slate-400 text-xs sm:text-sm mb-3 sm:mb-4">Permanently delete your account and all associated cameras and recordings.</p>
        <button onClick={handleDeleteAccount} className="btn-danger text-sm">Delete my account</button>
      </div>
    </div>
  );
}
