import { Response } from 'express';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/authMiddleware';

export const getPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        let preferences = await prisma.userPreference.findUnique({
            where: { userId: req.userId },
        });

        if (!preferences) {
            // Create default preferences if they don't exist
            preferences = await prisma.userPreference.create({
                data: {
                    userId: req.userId!,
                    preferredInputMode: null,
                    accessibilitySettings: null,
                },
            });
        }

        res.status(200).json({
            success: true,
            preferences: {
                preferredInputMode: preferences.preferredInputMode,
                accessibilitySettings: preferences.accessibilitySettings,
            },
        });
    } catch (error) {
        logger.error('Get preferences error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

export const updatePreferences = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { preferredInputMode, accessibilitySettings } = req.body;

        const preferences = await prisma.userPreference.upsert({
            where: { userId: req.userId },
            update: {
                preferredInputMode,
                accessibilitySettings,
            },
            create: {
                userId: req.userId!,
                preferredInputMode,
                accessibilitySettings,
            },
        });

        res.status(200).json({
            success: true,
            preferences: {
                preferredInputMode: preferences.preferredInputMode,
                accessibilitySettings: preferences.accessibilitySettings,
            },
        });
    } catch (error) {
        logger.error('Update preferences error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};
