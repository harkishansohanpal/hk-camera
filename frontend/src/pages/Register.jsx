import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import TurnstileWidget from '../components/TurnstileWidget';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ name: '', email: '', password: '' });
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!consent) {
      toast.error('Please accept the Privacy Policy and Terms');
      return;
    }
    if (!turnstileToken) {
      toast.error('Please complete the security check');
      return;
    }
    setLoading(true);
    try {
      await register({ ...form, consent, turnstileToken });
      navigate('/dashboard');
      toast.success('Welcome to HK Camera!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create account. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-page px-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-ap-blue rounded-2xl flex items-center justify-center mb-4 shadow-apple shadow-ap-blue/20">
            <Camera size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Create Account</h1>
          <p className="text-text-secondary text-sm mt-1">Get started in minutes</p>
        </div>

        <div className="card p-6 shadow-apple">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {[
              { key: 'name',     label: 'Full Name', type: 'text',     placeholder: 'Jane Smith' },
              { key: 'email',    label: 'Email',     type: 'email',    placeholder: 'jane@example.com' },
              { key: 'password', label: 'Password',  type: 'password', placeholder: 'At least 8 characters' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-semibold text-text-primary mb-1.5">{label}</label>
                <input type={type} className="input" placeholder={placeholder}
                  value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required />
              </div>
            ))}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-ap-gray4 bg-card text-ap-blue focus:ring-ap-blue/30 cursor-pointer flex-shrink-0" />
              <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors leading-relaxed">
                I agree to the{' '}
                <Link to="/privacy" className="text-ap-blue hover:text-blue-700 font-semibold underline">Privacy Policy</Link>{' '}
                and{' '}
                <Link to="/terms" className="text-ap-blue hover:text-blue-700 font-semibold underline">Terms</Link>
              </span>
            </label>
            <TurnstileWidget onToken={setTurnstileToken} onExpire={() => setTurnstileToken(null)} />
            <button type="submit" className="btn-primary w-full mt-1" disabled={loading}>
              {loading ? 'Creating account\u2026' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-text-secondary text-sm mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-ap-blue hover:text-blue-700 font-semibold">Log In</Link>
        </p>
      </div>
    </main>
  );
}
