import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface JWTPayload {
    userId: number;
    email: string;
}

export const generateToken = (payload: JWTPayload): string => {
    return jwt.sign(payload, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn as any,
    });
};

export const verifyToken = (token: string): JWTPayload => {
    try {
        return jwt.verify(token, config.jwtSecret) as JWTPayload;
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
};
