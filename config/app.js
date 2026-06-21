// config/app.js
import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { limiter } from "../middlewares/rate.limit.js";
import authRoutes from "../src/routes/auth.routes.js";
import adminRoutes from "../src/routes/admin.routes.js";
import collaboratorRoutes from "../src/routes/collaborator.routes.js";
import companyRoutes from "../src/routes/company.routes.js";
import evidenceRoutes from "../src/routes/evidence.routes.js";
import missionRoutes from "../src/routes/mission.routes.js";
import notificationRoutes from "../src/routes/notification.routes.js";
import ratingRoutes from "../src/routes/rating.routes.js";
import walletRoutes from "../src/routes/wallet.routes.js";
import uploadRoutes from "../src/routes/upload.routes.js";
import { processExpiredClientMissions, deleteOldExpiredMissions } from '../src/service/missionCleanup.service.js';

const uploadsPath = path.join(__dirname, 'uploads');

// ✅ Solo en desarrollo local (Vercel no permite crear carpetas)
if (process.env.NODE_ENV !== 'production') {
  cron.schedule('0 * * * *', async () => {
    console.log('🔄 Ejecutando limpieza programada de misiones expiradas...');
    try {
      await processExpiredClientMissions();
      await deleteOldExpiredMissions();
      console.log('✅ Limpieza programada completada');
    } catch (error) {
      console.error('❌ Error en limpieza programada:', error);
    }
  });

  const runCleanup = async () => {
    try {
      console.log('🔄 Ejecutando limpieza de misiones expiradas...');
      const result = await processExpiredClientMissions();
      console.log(`✅ ${result.processed} misiones expiradas procesadas, $${result.refundedAmount} reembolsados`);
      const deleted = await deleteOldExpiredMissions();
      console.log(`🗑️ ${deleted} misiones antiguas eliminadas`);
    } catch (error) {
      console.error('❌ Error en limpieza inicial:', error);
    }
  };
  runCleanup();

  // ✅ Crear directorios solo en local
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  const evidencePath = path.join(uploadsPath, 'evidence');
  if (!fs.existsSync(evidencePath)) {
    fs.mkdirSync(evidencePath, { recursive: true });
  }
}

const app = express();

// ✅ Configuración de CORS
const allowedOrigins = [
  'https://rodi-proyect-cwcg.vercel.app',
  'http://localhost:3001',
  'http://localhost:3050',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3050',
  'http://192.168.1.23:3000',
  'https://surreal-street-overtone.ngrok-free.dev',
  /\.ngrok-free\.dev$/,
  /\.vercel\.app$/,
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS bloqueado para origen:', origin);
      callback(new Error('CORS no permitido'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Set-Cookie'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('dev'));
app.use(limiter);
app.use(cookieParser());

// ✅ Servir archivos estáticos solo en local
if (process.env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static(uploadsPath));
  console.log(`📁 Serviendo archivos estáticos desde: ${uploadsPath}`);
}

// ✅ Routes
app.use('/api/v1/auth',(req, res ) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/collaborator', collaboratorRoutes);
app.use('/api/v1/company', companyRoutes);
app.use('/api/v1/evidence', evidenceRoutes);
app.use('/api/v1/missions', missionRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/ratings', ratingRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/uploads', uploadRoutes);

// ✅ Health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// ✅ Manejo de errores global
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
  });
});

export const initServer = () => {
  const PORT = process.env.PORT || 3050;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`   Local:   http://localhost:${PORT}`);
  });
};

export default app;