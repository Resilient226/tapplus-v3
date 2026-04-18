// api/subscribe.js
// POST /api/subscribe  — create Stripe checkout session
// POST /api/subscribe?action=verify — verify session after redirect
// POST /api/subscribe?action=portal  — billing portal

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { db } = require('../lib/firebase');
const { handleCors, ok, err, getSession } = require('../lib/utils');

// ── Price config ─────────────────────────────────────────────────────────────
// These map to Stripe Price IDs — create these in your Stripe dashboard
// or they get created on first run via the /setup endpoint
const PLANS = {
  pilot: {
    name:        'World Cup Pilot',
    price:       6900,       // $69/month in cents
    interval:    'month',
    setupFee:    15000,      // $150
    description: '3-month pilot, locks in World Cup pricing',
    months:      3,
  },
  annual: {
    name:        'Annual',
    price:       106800,     // $1,068/year (= $89 x 12)
    interval:    'year',
    setupFee:    19900,      // $199
    description: 'Best value — billed $1,068/year ($89/mo)',
  },
  monthly: {
    name:        'Monthly',
    price:       10900,      // $109/month
    interval:    'month',
    setupFee:    24900,      // $249
    description: 'No commitment, billed monthly',
  },
};

const CARD_PRICES = {
  branded: 1199,   // $11.99 Tap+ branded
  custom:  1599,   // $15.99 custom printed
};

const CARDS_INCLUDED = 12; // included in setup fee

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  const { action } = req.query;

  // ── Verify session after Stripe redirect ─────────────────────────────────
  if (action === 'verify' && req.method === 'POST') {
    const { sessionId, bizId } = req.body || {};
    if (!sessionId || !bizId) return err(res, 'sessionId and bizId required');

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') {
        return err(res, 'Payment not completed', 402);
      }

      // Activate the business
      await db.collection('businesses').doc(bizId).update({
        subscriptionStatus: 'active',
        stripeCustomerId:   session.customer,
        stripeSessionId:    sessionId,
        plan:               session.metadata.plan,
        subscribedAt:       Date.now(),
        trialEndsAt:        session.metadata.plan === 'pilot'
                              ? Date.now() + (90 * 24 * 60 * 60 * 1000)
                              : null,
        cardOrder: {
          branded: parseInt(session.metadata.brandedCards || 0),
          custom:  parseInt(session.metadata.customCards || 0),
          status:  'pending',
          orderedAt: Date.now(),
        },
      });

      return ok(res, {
        activated: true,
        plan: session.metadata.plan,
        cardOrder: {
          branded: parseInt(session.metadata.brandedCards || 0),
          custom:  parseInt(session.metadata.customCards || 0),
        },
      });
    } catch (e) {
      console.error('Verify error:', e.message);
      return err(res, 'Verification failed: ' + e.message, 500);
    }
  }

  // ── Billing portal ───────────────────────────────────────────────────────
  if (action === 'portal' && req.method === 'POST') {
    const { bizId, returnUrl } = req.body || {};
    if (!bizId) return err(res, 'bizId required');

    const doc = await db.collection('businesses').doc(bizId).get();
    if (!doc.exists) return err(res, 'Business not found', 404);

    const customerId = doc.data().stripeCustomerId;
    if (!customerId) return err(res, 'No billing account found', 404);

    const portal = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: returnUrl || `${process.env.APP_URL}/dashboard`,
    });

    return ok(res, { url: portal.url });
  }

  // ── Create checkout session ──────────────────────────────────────────────
  if (req.method !== 'POST') return err(res, 'Method not allowed', 405);

  const {
    plan,
    bizId,
    bizName,
    brandedCards = 0,
    customCards  = 0,
    successUrl,
    cancelUrl,
  } = req.body || {};

  if (!plan || !PLANS[plan]) return err(res, 'Invalid plan');
  if (!bizId)                  return err(res, 'bizId required');

  const planConfig = PLANS[plan];

  // Build line items
  const lineItems = [];

  // Setup fee (one-time)
  lineItems.push({
    price_data: {
      currency:     'usd',
      product_data: {
        name:        `${planConfig.name} — Setup Fee`,
        description: `Includes ${CARDS_INCLUDED} Tap+ branded cards`,
      },
      unit_amount: planConfig.setupFee,
    },
    quantity: 1,
  });

  // Subscription (recurring)
  lineItems.push({
    price_data: {
      currency:     'usd',
      product_data: {
        name:        `Tap+ ${planConfig.name}`,
        description: planConfig.description,
      },
      unit_amount:  planConfig.price,
      recurring: {
        interval: planConfig.interval,
        ...(plan === 'pilot' ? { interval_count: 1 } : {}),
      },
    },
    quantity: 1,
  });

  // Extra branded cards (beyond the 12 included)
  const extraBranded = Math.max(0, brandedCards - CARDS_INCLUDED);
  const extraCustom  = Math.max(0, customCards);

  if (extraBranded > 0) {
    lineItems.push({
      price_data: {
        currency:     'usd',
        product_data: { name: 'Tap+ Branded Cards', description: 'NFC review cards — Tap+ design' },
        unit_amount:  CARD_PRICES.branded,
      },
      quantity: extraBranded,
    });
  }

  if (extraCustom > 0) {
    lineItems.push({
      price_data: {
        currency:     'usd',
        product_data: { name: 'Custom Printed Cards', description: 'NFC review cards — your branding' },
        unit_amount:  CARD_PRICES.custom,
      },
      quantity: extraCustom,
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode:               'subscription',
      payment_method_types: ['card'],
      line_items:         lineItems,
      success_url:        successUrl || `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}&biz=${bizId}`,
      cancel_url:         cancelUrl  || `${process.env.APP_URL}/subscribe?biz=${bizId}`,
      metadata: {
        bizId,
        bizName:      bizName || '',
        plan,
        brandedCards: String(brandedCards),
        customCards:  String(customCards),
      },
      subscription_data: {
        metadata: { bizId, plan },
        ...(plan === 'pilot' ? {
          trial_period_days: 0,
        } : {}),
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    });

    return ok(res, { url: session.url, sessionId: session.id });
  } catch (e) {
    console.error('Stripe error:', e.message);
    return err(res, 'Checkout failed: ' + e.message, 500);
  }
};