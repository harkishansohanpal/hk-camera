const logger = require('../config/logger');
const { prisma } = require('../config/database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    logger.error('Stripe webhook signature verification failed', { error: err.message });
    return res.status(400).json({ success: false, message: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata.userId;
        const stripeSubscriptionId = session.subscription;
        const customerId = session.customer;

        if (!userId) break;

        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const priceId = subscription.items.data[0].price.id;
        const plan = await prisma.plan.findUnique({ where: { stripePriceId: priceId } });
        if (!plan) break;

        await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });

        await prisma.subscription.upsert({
          where: { userId },
          update: {
            planId: plan.id,
            stripeSubscriptionId,
            stripeCustomerId: customerId,
            status: 'ACTIVE',
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: false,
          },
          create: {
            userId,
            planId: plan.id,
            stripeSubscriptionId,
            stripeCustomerId: customerId,
            status: 'ACTIVE',
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        });

        logger.info('Subscription activated', { userId, planId: plan.id });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (!subId) break;

        const subscription = await stripe.subscriptions.retrieve(subId);
        await prisma.subscription.update({
          where: { stripeSubscriptionId: subId },
          data: {
            status: 'ACTIVE',
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        });
        break;
      }

      case 'invoice.payment_failed': {
        const failedInvoice = event.data.object;
        const failedSubId = failedInvoice.subscription;
        if (!failedSubId) break;

        await prisma.subscription.update({
          where: { stripeSubscriptionId: failedSubId },
          data: { status: 'PAST_DUE' },
        });
        logger.warn('Subscription payment failed', { stripeSubscriptionId: failedSubId });
        break;
      }

      case 'customer.subscription.updated': {
        const updatedSub = event.data.object;
        const statusMap = {
          active: 'ACTIVE', past_due: 'PAST_DUE', canceled: 'CANCELED',
          incomplete: 'INCOMPLETE', trialing: 'TRIALING',
        };
        await prisma.subscription.update({
          where: { stripeSubscriptionId: updatedSub.id },
          data: {
            status: statusMap[updatedSub.status] || 'INCOMPLETE',
            currentPeriodStart: new Date(updatedSub.current_period_start * 1000),
            currentPeriodEnd: new Date(updatedSub.current_period_end * 1000),
            cancelAtPeriodEnd: updatedSub.cancel_at_period_end,
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const deletedSub = event.data.object;
        const dbSub = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: deletedSub.id } });
        if (dbSub) {
          await prisma.subscription.delete({ where: { id: dbSub.id } });
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    logger.error('Stripe webhook handler error', { error: err.message });
    res.status(500).json({ received: false });
  }
}

module.exports = { handleWebhook };
