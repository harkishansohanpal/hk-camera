import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Loader, ExternalLink, XCircle } from 'lucide-react';
import { subscriptionAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function Billing() {
  const navigate = useNavigate();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    subscriptionAPI.getMine()
      .then(({ data }) => setSub(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handlePortal() {
    try {
      const { data } = await subscriptionAPI.createPortal();
      window.location.href = data.data.url;
    } catch (err) {
      toast.error('Failed to open billing portal');
    }
  }

  async function handleCancel() {
    if (!confirm('Cancel your subscription? You will lose access at the end of the billing period.')) return;
    try {
      await subscriptionAPI.cancel();
      toast.success('Subscription will cancel at period end');
      setSub((s) => ({ ...s, cancelAtPeriodEnd: true }));
    } catch (err) {
      toast.error('Failed to cancel subscription');
    }
  }

  if (loading) {
    return (
      <div className="page-container max-w-2xl flex items-center justify-center min-h-[50vh]">
        <Loader size={24} className="animate-spin text-hk-400" />
      </div>
    );
  }

  return (
    <div className="page-container max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate('/settings')} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-white">Billing</h1>
      </div>

      {!sub ? (
        <div className="card text-center py-12">
          <CreditCard size={40} className="text-slate-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">No active subscription</h2>
          <p className="text-slate-400 text-sm mb-6">You are on the Free plan. Upgrade to unlock more features.</p>
          <button
            onClick={() => navigate('/pricing')}
            className="bg-hk-500 hover:bg-hk-600 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            View Plans
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-medium text-slate-400 mb-1">Plan</h3>
            <p className="text-lg font-semibold text-white">{sub.plan?.name || 'Unknown'}</p>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-slate-400 mb-1">Status</h3>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              sub.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
              sub.status === 'TRIALING' ? 'bg-blue-500/20 text-blue-400' :
              sub.status === 'PAST_DUE' ? 'bg-red-500/20 text-red-400' :
              'bg-slate-700 text-slate-400'
            }`}>
              {sub.status === 'ACTIVE' ? 'Active' :
               sub.status === 'TRIALING' ? 'Trial' :
               sub.status === 'PAST_DUE' ? 'Past Due' :
               sub.status === 'CANCELED' ? 'Canceled' :
               sub.status}
            </span>
          </div>

          {sub.currentPeriodEnd && (
            <div className="card">
              <h3 className="text-sm font-medium text-slate-400 mb-1">
                {sub.cancelAtPeriodEnd ? 'Expires' : 'Renews'}
              </h3>
              <p className="text-white font-medium">
                {new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={handlePortal}
              className="bg-slate-700 hover:bg-slate-600 text-white font-medium px-6 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink size={16} />
              Manage in Stripe
            </button>
            {!sub.cancelAtPeriodEnd && sub.status === 'ACTIVE' && (
              <button
                onClick={handleCancel}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium px-6 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <XCircle size={16} />
                Cancel Subscription
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
