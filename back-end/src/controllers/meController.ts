import { Request, Response } from 'express';
import prisma from '../prisma/client.ts';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// Validation Schemas
const profileUpdateSchema = z.object({
  email: z.email().optional(),
  preferences: z.any().optional(),
});

const changePasswordSchema = z.object({
    oldPassword: z.string(),
    newPassword: z.string().min(8),
});

import { CarColor } from '@prisma/client';

const carOwnershipSchema = z.object({
  carId: z.number().int().positive(),
  color: z.enum(['RED', 'BLUE', 'YELLOW', 'WHITE', 'BLACK', 'SILVER', 'GREY', 'GREEN', 'ORANGE', 'PURPLE']),
});

const paymentMethodSchema = z.object({
    provider: z.string(),
    tokenLast4: z.string().length(4),
});

// Profile Controllers
export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, role: true, preferences: true, createdAt: true, updatedAt: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: z.treeifyError(parsed.error) });

    try {
        const updatedUser = await prisma.user.update({
            where: { id: req.userId },
            data: parsed.data,
            select: { id: true, email: true, role: true, preferences: true },
        });
        res.json(updatedUser);
    } catch (e) {
        res.status(500).json({ error: "Failed to update profile" });
    }
};

export const changePassword = async (req: Request, res: Response) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: z.treeifyError(parsed.error) });

    try {
        const { oldPassword, newPassword } = parsed.data;
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!user) return res.status(404).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(401).json({ error: "Invalid old password" });

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({
            where: { id: req.userId },
            data: { password: hashedPassword },
        });

        res.status(200).json({ message: "Password updated successfully" });
    } catch (e) {
        res.status(500).json({ error: "Failed to change password" });
    }
};

// Vehicle Controllers (using CarOwnership model)
export const listVehicles = async (req: Request, res: Response) => {
    const ownerships = await prisma.carOwnership.findMany({ 
        where: { userId: req.userId },
        include: { car: true }
    });
    res.json(ownerships);
};

export const addVehicle = async (req: Request, res: Response) => {
    const parsed = carOwnershipSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: z.treeifyError(parsed.error) });

    // Check if car exists
    const car = await prisma.car.findUnique({ where: { id: parsed.data.carId } });
    if (!car) return res.status(404).json({ error: "Car not found" });

    // Check for existing ownership
    const existing = await prisma.carOwnership.findFirst({
        where: { userId: req.userId, carId: parsed.data.carId }
    });
    if (existing) return res.status(409).json({ error: "You already own this car" });

    const ownership = await prisma.carOwnership.create({
        data: { 
            userId: req.userId!, 
            carId: parsed.data.carId,
            color: parsed.data.color as CarColor
        },
        include: { car: true }
    });
    res.status(201).json(ownership);
};

export const getVehicle = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ownership = await prisma.carOwnership.findFirst({ 
        where: { id, userId: req.userId },
        include: { car: true }
    });
    if (!ownership) return res.status(404).json({ error: "Vehicle not found" });
    res.json(ownership);
};

export const updateVehicle = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const parsed = carOwnershipSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: z.treeifyError(parsed.error) });

    try {
        const ownership = await prisma.carOwnership.updateMany({
            where: { id, userId: req.userId },
            data: parsed.data.color ? { color: parsed.data.color as CarColor } : {},
        });
        if (ownership.count === 0) return res.status(404).json({ error: "Vehicle not found" });
        res.status(200).json({ message: "Vehicle updated successfully" });
    } catch(e) {
        res.status(500).json({ error: "Failed to update vehicle" });
    }
};

export const deleteVehicle = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await prisma.carOwnership.deleteMany({ where: { id, userId: req.userId } });
    if (result.count === 0) return res.status(404).json({ error: "Vehicle not found" });
    res.status(204).send();
};

// Payment Method Controllers
export const listPaymentMethods = async (req: Request, res: Response) => {
    const methods = await prisma.paymentMethod.findMany({ where: { userId: req.userId } });
    res.json(methods);
};

export const addPaymentMethod = async (req: Request, res: Response) => {
    const parsed = paymentMethodSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: z.treeifyError(parsed.error) });

    const method = await prisma.paymentMethod.create({
        data: { ...parsed.data, userId: req.userId!, status: 'valid' },
    });
    res.status(201).json(method);
};

export const deletePaymentMethod = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await prisma.paymentMethod.deleteMany({ where: { id, userId: req.userId } });
    if (result.count === 0) return res.status(404).json({ error: "Payment method not found" });
    res.status(204).send();
};