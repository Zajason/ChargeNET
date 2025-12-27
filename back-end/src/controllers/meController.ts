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

const vehicleSchema = z.object({
  make: z.string(),
  model: z.string(),
  batteryKWh: z.number().positive(),
  maxKW: z.number().positive(),
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

// Vehicle Controllers
export const listVehicles = async (req: Request, res: Response) => {
    const vehicles = await prisma.vehicle.findMany({ where: { userId: req.userId } });
    res.json(vehicles);
};

export const addVehicle = async (req: Request, res: Response) => {
    const parsed = vehicleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: z.treeifyError(parsed.error) });

    const vehicle = await prisma.vehicle.create({
        data: { ...parsed.data, userId: req.userId! },
    });
    res.status(201).json(vehicle);
};

export const getVehicle = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const vehicle = await prisma.vehicle.findFirst({ where: { id, userId: req.userId } });
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
    res.json(vehicle);
};

export const updateVehicle = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const parsed = vehicleSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: z.treeifyError(parsed.error) });

    try {
        const vehicle = await prisma.vehicle.updateMany({
            where: { id, userId: req.userId },
            data: parsed.data,
        });
        if (vehicle.count === 0) return res.status(404).json({ error: "Vehicle not found" });
        res.status(200).json({ message: "Vehicle updated successfully" });
    } catch(e) {
        res.status(500).json({ error: "Failed to update vehicle" });
    }
};

export const deleteVehicle = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await prisma.vehicle.deleteMany({ where: { id, userId: req.userId } });
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