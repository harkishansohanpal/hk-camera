import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
      toast.success('Welcome to HK Camera!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-hk-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-hk-500/30">
            <Camera size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create account</h1>
          <p className="text-slate-400 text-sm mt-1">Start monitoring in minutes</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {[
              { key: 'name',     label: 'Full name', type: 'text',     placeholder: 'Jane Smith' },
              { key: 'email',    label: 'Email',     type: 'email',    placeholder: 'jane@example.com' },
              { key: 'password', label: 'Password',  type: 'password', placeholder: 'Min 8 characters' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
                <input type={type} className="input" placeholder={placeholder} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required />
              </div>
            ))}
            <button type="submit" className="btn-primary w-full mt-1" disabled={loading}>
              {loading ? 'Creating account\u2026' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-400 text-sm mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-hk-400 hover:text-hk-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
