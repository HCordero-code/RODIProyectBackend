// src/routes/upload.routes.js
import express from 'express';
import multer from 'multer';
import { validateToken } from '../../middlewares/validate.jwt.js';
import { 
    uploadEvidenceVideo, 
    downloadVideo, 
    getVideoInfo,
    cleanExpiredVideos 
} from '../controllers/upload.controller.js';

const router = express.Router();

// ✅ Multer con memory storage (sin guardar en disco, compatible con Vercel)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Formato de video no soportado. Usa MP4, WebM o MOV'), false);
        }
    }
});

// ✅ POST - Subir video
router.post('/evidence', validateToken, upload.single('video'), uploadEvidenceVideo);

// ✅ GET - Obtener información del video
router.get('/evidence/:videoId/info', validateToken, getVideoInfo);

// ✅ GET - Descargar/reproducir video (redirige a Cloudinary)
router.get('/evidence/:videoId/download', validateToken, downloadVideo);

// ✅ GET - Reproducir video (redirige a Cloudinary)
router.get('/evidence/:videoId', validateToken, async (req, res) => {
    try {
        const { videoId } = req.params;
        const TempVideo = (await import('../models/TempVideo.model.js')).default;
        const tempVideo = await TempVideo.findOne({ id: videoId });

        if (!tempVideo) return res.status(404).json({ message: 'Video no encontrado' });
        if (tempVideo.expiresAt < new Date()) return res.status(410).json({ message: 'Video expirado' });

        // ✅ Redirigir a la URL de Cloudinary
        return res.redirect(tempVideo.cloudinaryUrl);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ✅ POST - Limpiar videos expirados
router.post('/clean-expired', async (req, res) => {
    const count = await cleanExpiredVideos();
    res.json({ message: `Limpiados ${count} videos expirados` });
});

// ✅ Ruta de prueba
router.get('/test', (req, res) => {
    res.json({ message: 'Upload routes are working!' });
});

export default router;