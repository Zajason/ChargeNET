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

/* ── Pre-auth helpers for reservation flow ── */

export const preAuthorize = async (userId: number, amountEur: number = 3) => {
  const customerId = await ensureStripeCustomer(userId);

  const methods = await prisma.paymentMethod.findMany({
    where: { userId, provider: 'stripe', status: 'valid', stripePaymentMethodId: { not: null } },
    orderBy: { createdAt: 'desc' },
  });

  const defaultMethod = methods[0];
  if (!defaultMethod?.stripePaymentMethodId) {
    throw new Error('No valid payment method found');
  }

  const intent = await stripe.paymentIntents.create({
    customer: customerId,
    payment_method: defaultMethod.stripePaymentMethodId,
    amount: Math.round(amountEur * 100),
    currency: 'eur',
    capture_method: 'manual',
    confirm: true,
    off_session: true,
  });

  return intent;
};

export const cancelPreAuth = async (paymentIntentId: string) => {
  try {
    await stripe.paymentIntents.cancel(paymentIntentId);
  } catch (err: any) {
    // Already cancelled or captured — safe to ignore
    if (err.code !== 'payment_intent_unexpected_state') throw err;
  }
};

export const captureOrRecharge = async (
  paymentIntentId: string,
  finalAmountEur: number,
  sessionId: number,
  userId: number,
) => {
  const PRE_AUTH_AMOUNT = 3;
  const chargeAmount = Math.max(finalAmountEur, PRE_AUTH_AMOUNT);

  if (chargeAmount <= PRE_AUTH_AMOUNT) {
    // Capture the existing pre-auth for the minimum amount
    const intent = await stripe.paymentIntents.capture(paymentIntentId, {
      amount_to_capture: Math.round(chargeAmount * 100),
    });

    const status = intent.status === 'succeeded' ? PaymentStatus.CAPTURED : PaymentStatus.PREAUTHORIZED;

    await prisma.paymentAuth.upsert({
      where: { sessionId },
      update: { userId, amountEur: chargeAmount, providerRef: intent.id, status },
      create: { userId, sessionId, amountEur: chargeAmount, providerRef: intent.id, status },
    });

    if (status === PaymentStatus.CAPTURED) {
      await prisma.invoice.upsert({
        where: { sessionId },
        update: { totalEur: chargeAmount },
        create: { userId, sessionId, pdfUrl: 'pending', totalEur: chargeAmount },
      });
    }

    return intent;
  }

  // Amount exceeds pre-auth — cancel the hold and create a full charge
  await cancelPreAuth(paymentIntentId);
  return chargeSession(sessionId, chargeAmount, userId);
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
      invoice: true,
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

    if (status === PaymentStatus.CAPTURED) {
      await prisma.invoice.upsert({
        where: { sessionId },
        update: { totalEur: amountEur },
        create: {
          userId: session.user.id,
          sessionId,
          pdfUrl: 'pending',
          totalEur: amountEur,
        },
      });
    }

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

export const listBillingHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    const records = await prisma.paymentAuth.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        session: {
          select: {
            id: true,
            startedAt: true,
            endedAt: true,
            kWh: true,
            costEur: true,
            charger: { select: { name: true, address: true } },
            invoice: {
              select: {
                id: true,
                pdfUrl: true,
                totalEur: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    const history = records.map((record) => ({
      id: record.id,
      sessionId: record.sessionId,
      status: record.status,
      amountEur: Number(record.amountEur),
      providerRef: record.providerRef ?? null,
      createdAt: record.createdAt.toISOString(),
      session: record.session
        ? {
            startedAt: record.session.startedAt.toISOString(),
            endedAt: record.session.endedAt ? record.session.endedAt.toISOString() : null,
            energyKWh: Number(record.session.kWh),
            costEur:
              record.session.costEur !== null && record.session.costEur !== undefined
                ? Number(record.session.costEur)
                : null,
            chargerName: record.session.charger?.name ?? null,
            chargerAddress: record.session.charger?.address ?? null,
            invoice: record.session.invoice
              ? {
                  id: record.session.invoice.id,
                  pdfUrl: record.session.invoice.pdfUrl,
                  totalEur: Number(record.session.invoice.totalEur),
                  createdAt: record.session.invoice.createdAt.toISOString(),
                }
              : null,
          }
        : null,
    }));

    return res.json({ history });
  } catch (error) {
    console.error('listBillingHistory error:', error);
    return res.status(500).json({ error: 'Failed to load billing history' });
  }
};
