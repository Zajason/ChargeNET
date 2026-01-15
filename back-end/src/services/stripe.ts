import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

// Shared Stripe client for the backend
const stripe = new Stripe(secretKey);

export default stripe;
