import { Response } from 'express';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/authMiddleware';

export const saveMessage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { messageText, language } = req.body;

        if (!messageText) {
            res.status(400).json({
                success: false,
                message: 'Message text is required',
            });
            return;
        }

        const message = await prisma.textMessage.create({
            data: {
                userId: req.userId!,
                messageText,
                language: language || 'en',
            },
        });

        res.status(201).json({
            success: true,
            message: {
                id: message.id,
                messageText: message.messageText,
                language: message.language,
                createdAt: message.createdAt,
            },
        });
    } catch (error) {
        logger.error('Save message error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;

        const [messages, total] = await Promise.all([
            prisma.textMessage.findMany({
                where: { userId: req.userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.textMessage.count({
                where: { userId: req.userId },
            }),
        ]);

        res.status(200).json({
            success: true,
            messages,
            total,
            limit,
            offset,
        });
    } catch (error) {
        logger.error('Get messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

export const deleteMessage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string);

        const message = await prisma.textMessage.findFirst({
            where: { id, userId: req.userId },
        });

        if (!message) {
            res.status(404).json({
                success: false,
                message: 'Message not found',
            });
            return;
        }

        await prisma.textMessage.delete({
            where: { id },
        });

        res.status(200).json({
            success: true,
            message: 'Message deleted successfully',
        });
    } catch (error) {
        logger.error('Delete message error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};
