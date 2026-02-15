import { Response } from 'express';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/authMiddleware';

export const saveTranscript = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.body) {
            res.status(400).json({
                success: false,
                message: 'Request body is missing',
            });
            return;
        }
        const { transcript, language, durationSeconds } = req.body;

        if (!transcript) {
            res.status(400).json({
                success: false,
                message: 'Transcript is required',
            });
            return;
        }

        const voiceTranscript = await prisma.voiceTranscript.create({
            data: {
                userId: req.userId!,
                transcript,
                language: language || 'en',
                durationSeconds: durationSeconds || null,
            },
        });

        res.status(201).json({
            success: true,
            transcript: {
                id: voiceTranscript.id,
                transcript: voiceTranscript.transcript,
                language: voiceTranscript.language,
                createdAt: voiceTranscript.createdAt,
            },
        });
    } catch (error) {
        logger.error('Save transcript error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

export const getVoiceHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = parseInt(req.query.offset as string) || 0;

        const [transcripts, total] = await Promise.all([
            prisma.voiceTranscript.findMany({
                where: { userId: req.userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.voiceTranscript.count({
                where: { userId: req.userId },
            }),
        ]);

        res.status(200).json({
            success: true,
            transcripts,
            total,
            limit,
            offset,
        });
    } catch (error) {
        logger.error('Get voice history error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

export const deleteVoiceTranscript = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string);

        const transcript = await prisma.voiceTranscript.findFirst({
            where: { id, userId: req.userId },
        });

        if (!transcript) {
            res.status(404).json({
                success: false,
                message: 'Transcript not found',
            });
            return;
        }

        await prisma.voiceTranscript.delete({
            where: { id },
        });

        res.status(200).json({
            success: true,
            message: 'Transcript deleted successfully',
        });
    } catch (error) {
        logger.error('Delete voice transcript error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};
