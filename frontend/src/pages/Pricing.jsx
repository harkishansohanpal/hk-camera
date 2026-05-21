import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader, ArrowLeft } from 'lucide-react';
import { subscriptionAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  useEffect(() => {
    subscriptionAPI.listPlans()
      .then(({ data }) => setPlans(data.data))
      .catch(() => toast.error('Failed to load plans'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSelect(priceId) {
    if (!user) { navigate('/register'); return; }
    setCheckoutLoading(priceId);
    try {
      const { data } = await subscriptionAPI.createCheckout(priceId);
      window.location.href = data.data.url;
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to start checkout');
    } finally {
      setCheckoutLoading(null);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><Loader size={24} className="animate-spin text-ap-blue" /></div>;
  }

  return (
    <div className="min-h-screen bg-ap-gray6 text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-12 animate-fade-in">
        <button onClick={() => navigate(-1)} className="btn-ghost text-sm mb-8 text-ap-gray hover:text-gray-900">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Simple, <span className="text-ap-blue">transparent</span> pricing</h1>
          <p className="text-ap-gray text-lg max-w-xl mx-auto">All plans include real-time streaming and motion detection. Upgrade as your needs grow.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const features = Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features || '[]');
            const isFree = plan.price === 0;

            return (
              <div key={plan.id} className={`card p-6 flex flex-col shadow-apple ${plan.highlighted ? 'ring-2 ring-ap-blue/30' : ''}`}>
                {plan.highlighted && <span className="text-ap-blue text-xs font-bold uppercase tracking-wider mb-2">Most Popular</span>}
                <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                <p className="text-ap-gray text-sm mb-4">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold tracking-tight text-gray-900">${(plan.price / 100).toFixed(0)}</span>
                  <span className="text-ap-gray text-sm ml-1">/month</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check size={16} className="text-ap-green mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{f}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => handleSelect(isFree ? null : plan.stripePriceId)}
                  disabled={checkoutLoading === plan.stripePriceId}
                  className={`btn w-full disabled:opacity-50 ${plan.highlighted ? 'btn-primary' : 'btn-secondary'}`}>
                  {checkoutLoading === plan.stripePriceId ? <Loader size={16} className="animate-spin" /> : isFree ? 'Get Started' : 'Subscribe'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
