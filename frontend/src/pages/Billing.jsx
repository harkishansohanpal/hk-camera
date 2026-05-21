import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Loader, ExternalLink, XCircle, CheckCircle } from 'lucide-react';
import { subscriptionAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function Billing() {
  const navigate = useNavigate();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    subscriptionAPI.getMine().then(({ data }) => setSub(data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handlePortal() {
    try { const { data } = await subscriptionAPI.createPortal(); window.location.href = data.data.url; }
    catch (err) { toast.error('Failed to open billing portal'); }
  }

  async function handleCancel() {
    if (!confirm('Cancel your subscription? You will lose access at the end of the billing period.')) return;
    try { await subscriptionAPI.cancel(); toast.success('Subscription will cancel at period end'); setSub((s) => ({ ...s, cancelAtPeriodEnd: true })); }
    catch (err) { toast.error('Failed to cancel subscription'); }
  }

  if (loading) {
    return <div className="page-container max-w-2xl flex items-center justify-center min-h-[50vh]"><Loader size={24} className="animate-spin text-ap-blue" /></div>;
  }

  return (
    <div className="page-container max-w-2xl animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate('/settings')} className="w-10 h-10 flex items-center justify-center text-ap-gray hover:text-gray-900 hover:bg-ap-gray6 rounded-xl transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Billing</h1>
      </div>

      {!sub ? (
        <div className="card text-center py-12 shadow-apple">
          <CreditCard size={40} className="text-ap-gray3 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No active subscription</h2>
          <p className="text-ap-gray text-sm mb-6">You are on the Free plan. Upgrade to unlock more features.</p>
          <button onClick={() => navigate('/pricing')} className="btn-primary text-sm px-5">View Plans</button>
        </div>
      ) : (
        <>
          <div className="card-grouped">
            <div className="list-row justify-between">
              <span className="text-sm text-ap-gray">Plan</span>
              <span className="text-sm font-semibold text-gray-900">{sub.plan?.name || 'Unknown'}</span>
            </div>
            <div className="list-row justify-between">
              <span className="text-sm text-ap-gray">Status</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                sub.status === 'ACTIVE' ? 'bg-ap-green/10 text-ap-green' :
                sub.status === 'TRIALING' ? 'bg-ap-blue/10 text-ap-blue' :
                sub.status === 'PAST_DUE' ? 'bg-ap-red/10 text-ap-red' :
                'bg-ap-gray5 text-ap-gray'
              }`}>
                {sub.status === 'ACTIVE' ? 'Active' : sub.status === 'TRIALING' ? 'Trial' : sub.status === 'PAST_DUE' ? 'Past Due' : sub.status === 'CANCELED' ? 'Canceled' : sub.status}
              </span>
            </div>
            {sub.currentPeriodEnd && (
              <div className="list-row justify-between">
                <span className="text-sm text-ap-gray">{sub.cancelAtPeriodEnd ? 'Expires' : 'Renews'}</span>
                <span className="text-sm font-semibold text-gray-900">{new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 pt-6">
            <button onClick={handlePortal} className="btn-secondary text-sm"><ExternalLink size={16} /> Manage in Stripe</button>
            {!sub.cancelAtPeriodEnd && sub.status === 'ACTIVE' && (
              <button onClick={handleCancel} className="btn-destructive text-sm"><XCircle size={16} /> Cancel Subscription</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
