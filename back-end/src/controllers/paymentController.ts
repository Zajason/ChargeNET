import { Request, Response } from 'express';
import { PaymentStatus } from '@prisma/client';
import prisma from '../prisma/client.ts';
import stripe from '../services/stripe.ts';
import { z } from 'zod';

const setupIntentSchema = z.object({});
const saveMethodSchema = z.object({
  paymentMethodId: z.string().min(1, 'paymentMethodId is required'),
});
const executePaymentSchema = z.object({
  sessionId: z.number().int().positive(),
  amountEur: z.number().positive().optional(),
});

const ensureStripeCustomer = async (userId: number) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    metadata: { appUserId: String(userId) },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
};

export const createSetupIntent = async (req: Request, res: Response) => {
  const parseResult = setupIntentSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: z.treeifyError(parseResult.error) });
  }

  try {
    const userId = req.userId!;
    const customerId = await ensureStripeCustomer(userId);

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
    });

    return res.status(201).json({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    console.error('createSetupIntent error:', error);
    return res.status(500).json({ error: 'Failed to create setup intent' });
  }
};

export const savePaymentMethod = async (req: Request, res: Response) => {
  const parsed = saveMethodSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: z.treeifyError(parsed.error) });
  }

  try {
    const userId = req.userId!;
    const { paymentMethodId } = parsed.data;
    const customerId = await ensureStripeCustomer(userId);

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (!paymentMethod || paymentMethod.type !== 'card') {
      return res.status(400).json({ error: 'Unsupported payment method type' });
    }

    if (paymentMethod.customer && paymentMethod.customer !== customerId) {
      return res.status(409).json({ error: 'Payment method already linked to another customer' });
    }

    if (!paymentMethod.customer) {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    }

    const card = paymentMethod.card;
    const last4 = card?.last4 ?? '****';

    const existing = await prisma.paymentMethod.findUnique({ where: { stripePaymentMethodId: paymentMethodId } });
    if (existing && existing.userId !== userId) {
      return res.status(409).json({ error: 'Payment method already saved for another user' });
    }

    const savedMethod = await prisma.paymentMethod.upsert({
      where: { stripePaymentMethodId: paymentMethodId },
      update: { tokenLast4: last4, status: 'valid', userId },
      create: {
        userId,
        provider: 'stripe',
        tokenLast4: last4,
        stripePaymentMethodId: paymentMethodId,
        status: 'valid',
      },
    });

    return res.status(201).json({ paymentMethod: savedMethod });
  } catch (error) {
    console.error('savePaymentMethod error:', error);
    return res.status(500).json({ error: 'Failed to save payment method' });
  }
};

export const chargeSession = async (sessionId: number, amountEur: number, expectedUserId?: number) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        select: {
          id: true,
          stripeCustomerId: true,
          paymentMethods: {
            where: {
              provider: 'stripe',
              status: 'valid',
              stripePaymentMethodId: { not: null },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  if (expectedUserId && session.user.id !== expectedUserId) {
    throw new Error('Session does not belong to this user');
  }

  const customerId = session.user.stripeCustomerId;
  if (!customerId) {
    throw new Error('User does not have a Stripe customer');
  }

  const defaultMethod = session.user.paymentMethods[0];
  if (!defaultMethod?.stripePaymentMethodId) {
    throw new Error('No valid Stripe payment method found');
  }

  const amountCents = Math.round(amountEur * 100);

  try {
    const intent = await stripe.paymentIntents.create({
      customer: customerId,
      payment_method: defaultMethod.stripePaymentMethodId,
      amount: amountCents,
      currency: 'eur',
      confirm: true,
      off_session: true,
    });

    const status = intent.status === 'succeeded' ? PaymentStatus.CAPTURED : PaymentStatus.PREAUTHORIZED;

    await prisma.paymentAuth.upsert({
      where: { sessionId },
      update: {
        userId: session.user.id,
        amountEur,
        providerRef: intent.id,
        status,
      },
      create: {
        userId: session.user.id,
        sessionId,
        amountEur,
        providerRef: intent.id,
        status,
      },
    });

    return intent;
  } catch (error) {
    await prisma.paymentAuth.upsert({
      where: { sessionId },
      update: {
        userId: session.user.id,
        amountEur,
        status: PaymentStatus.FAILED,
      },
      create: {
        userId: session.user.id,
        sessionId,
        amountEur,
        status: PaymentStatus.FAILED,
      },
    });

    throw error;
  }
};

export const executePayment = async (req: Request, res: Response) => {
  const parsed = executePaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: z.treeifyError(parsed.error) });
  }

  try {
    const userId = req.userId!;
    const { sessionId, amountEur } = parsed.data;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true, costEur: true },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.userId !== userId) {
      return res.status(403).json({ error: 'You cannot pay for another user session' });
    }

    const amountToCharge = amountEur ?? Number(session.costEur ?? 0);
    if (!amountToCharge || Number.isNaN(amountToCharge) || amountToCharge <= 0) {
      return res.status(400).json({ error: 'amountEur is required when session has no cost' });
    }

    const intent = await chargeSession(sessionId, amountToCharge, userId);

    return res.status(201).json({
      paymentIntentId: intent.id,
      status: intent.status,
      amountEur: amountToCharge,
    });
  } catch (error: any) {
    console.error('executePayment error:', error);
    return res.status(502).json({ error: 'Payment attempt failed', details: error?.message });
  }
};
