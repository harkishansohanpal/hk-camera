const logger = require('../config/logger');
const { getPrisma } = require('../config/database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function listPlans(req, res) {
  const prisma = getPrisma();
  const plans = await prisma.plan.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
  });
  res.json({ success: true, data: plans.map(p => ({ ...p, features: JSON.parse(p.features) })) });
}

async function getMySubscription(req, res) {
  const prisma = getPrisma();
  const sub = await prisma.subscription.findUnique({
    where: { userId: req.user.id },
    include: { plan: true },
  });
  res.json({ success: true, data: sub ? { ...sub, plan: sub.plan ? { ...sub.plan, features: JSON.parse(sub.plan.features) } : null } : null });
}

async function createCheckoutSession(req, res) {
  const prisma = getPrisma();
  const { priceId } = req.body;
  if (!priceId) return res.status(400).json({ success: false, message: 'priceId is required' });

  const plan = await prisma.plan.findUnique({ where: { stripePriceId: priceId } });
  if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  let customerId = user.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.CLIENT_URL}/settings?billing=success`,
    cancel_url: `${process.env.CLIENT_URL}/pricing`,
    subscription_data: {
      metadata: { userId: user.id },
    },
  });

  res.json({ success: true, data: { url: session.url } });
}

async function createPortalSession(req, res) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user.stripeCustomerId) {
    return res.status(400).json({ success: false, message: 'No billing customer found' });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.CLIENT_URL}/settings`,
  });

  res.json({ success: true, data: { url: session.url } });
}

async function cancelSubscription(req, res) {
  const prisma = getPrisma();
  const sub = await prisma.subscription.findUnique({ where: { userId: req.user.id } });
  if (!sub) return res.status(404).json({ success: false, message: 'No active subscription' });

  await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { cancelAtPeriodEnd: true },
  });

  res.json({ success: true, message: 'Subscription will cancel at period end' });
}

async function seedPlans(req, res) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Only available in development' });
  }

  const prisma = getPrisma();
  const plans = [
    { name: 'Free', description: 'Basic camera monitoring', price: 0, interval: 'MONTHLY', features: JSON.stringify(['1 camera', '1 day recording history', 'Pixel-diff detection', 'Email alerts']), stripePriceId: 'free_plan', sortOrder: 0, highlighted: false },
    { name: 'Pro', description: 'For serious home security', price: 999, interval: 'MONTHLY', features: JSON.stringify(['Up to 5 cameras', '30 day recording history', 'ML object detection', 'Two-way audio', 'Email + push alerts', 'Cloud recordings']), stripePriceId: 'price_pro_monthly', sortOrder: 1, highlighted: true },
    { name: 'Enterprise', description: 'For power users & small biz', price: 2999, interval: 'MONTHLY', features: JSON.stringify(['Unlimited cameras', '90 day recording history', 'ML object detection', 'Two-way audio', 'All alert types', 'Priority support', 'Custom integrations']), stripePriceId: 'price_enterprise_monthly', sortOrder: 2, highlighted: false },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { stripePriceId: plan.stripePriceId },
      update: plan,
      create: plan,
    });
  }

  res.json({ success: true, message: 'Plans seeded' });
}

module.exports = { listPlans, getMySubscription, createCheckoutSession, createPortalSession, cancelSubscription, seedPlans };
