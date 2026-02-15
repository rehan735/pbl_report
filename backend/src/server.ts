import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

// Import routes
import predictRoutes from './routes/predictRoutes';
import authRoutes from './routes/authRoutes';
import signRoutes from './routes/signRoutes';
import voiceRoutes from './routes/voiceRoutes';
import textRoutes from './routes/textRoutes';
import preferencesRoutes from './routes/preferencesRoutes';
import translateRoutes from './routes/translateRoutes';
const app = express();

// Middleware
const corsOrigins = config.corsOrigin.toString().split(',');
app.use(cors({
    origin: corsOrigins.length > 1 ? corsOrigins : corsOrigins[0],
    credentials: true,
}));
app.use(express.json({ type: ['application/json', 'text/plain'] }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`);
    logger.info(`Headers: ${JSON.stringify(req.headers)}`);
    logger.info(`Body after parsing: ${JSON.stringify(req.body)}`);
    next();
});

// Routes
app.get('/', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Accessible Communication App API is running',
        endpoints: {
            health: '/health',
            api: '/api'
        }
    });
});

app.get('/api', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'API Base Endpoint',
        version: '1.0.0',
        available_resources: [
            '/auth',
            '/sign',
            '/voice',
            '/text',
            '/preferences',
            '/translate',
            '/predict'
        ]
    });
});
app.use('/api/auth', authRoutes);
app.use('/api/sign', signRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/text', textRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/predict', predictRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
    });
});

// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`CORS origin: ${config.corsOrigin}`);
});

export default app;
