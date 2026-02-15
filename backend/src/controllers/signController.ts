import { Response } from 'express';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/authMiddleware';

export const detectSign = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { detectedSign, confidence, language } = req.body;

        if (!detectedSign) {
            res.status(400).json({
                success: false,
                message: 'Detected sign is required',
            });
            return;
        }

        const detection = await prisma.signDetection.create({
            data: {
                userId: req.userId!,
                detectedSign,
                confidence: confidence || null,
                language: language || 'en',
            },
        });

        res.status(201).json({
            success: true,
            detection: {
                id: detection.id,
                detectedSign: detection.detectedSign,
                confidence: detection.confidence,
                createdAt: detection.createdAt,
            },
        });
    } catch (error) {
        logger.error('Sign detection error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

export const getSignHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = parseInt(req.query.offset as string) || 0;

        const [detections, total] = await Promise.all([
            prisma.signDetection.findMany({
                where: { userId: req.userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.signDetection.count({
                where: { userId: req.userId },
            }),
        ]);

        res.status(200).json({
            success: true,
            detections,
            total,
            limit,
            offset,
        });
    } catch (error) {
        logger.error('Get sign history error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

export const deleteSignDetection = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string);

        const detection = await prisma.signDetection.findFirst({
            where: { id, userId: req.userId },
        });

        if (!detection) {
            res.status(404).json({
                success: false,
                message: 'Detection not found',
            });
            return;
        }

        await prisma.signDetection.delete({
            where: { id },
        });

        res.status(200).json({
            success: true,
            message: 'Detection deleted successfully',
        });
    } catch (error) {
        logger.error('Delete sign detection error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};
