// src/controllers/upload.controller.js
import TempVideo from '../models/TempVideo.model.js';
import Evidence from '../models/evidence.model.js';
import Mission from '../models/mission.model.js';
import { successResponse, errorResponse, notFoundResponse } from '../../utils/response.js';
import { uploadVideoToCloudinary, deleteVideoFromCloudinary } from '../service/cloudinary.service.js';

// 📌 Subir video de evidencia
export const uploadEvidenceVideo = async (req, res) => {
    try {
        if (!req.file) {
            return errorResponse(res, 'No se recibió ningún archivo', 400);
        }

        const { missionId, evidenceId } = req.body;

        if (!missionId || !evidenceId) {
            return errorResponse(res, 'Faltan missionId o evidenceId', 400);
        }

        const mission = await Mission.findOne({ id: missionId });
        if (!mission) {
            return errorResponse(res, 'Misión no encontrada', 404);
        }

        const evidence = await Evidence.findById(evidenceId);
        if (!evidence) {
            return errorResponse(res, 'Evidencia no encontrada', 404);
        }

        // ✅ Subir a Cloudinary usando el buffer (sin guardar en disco)
        const cloudinaryResult = await uploadVideoToCloudinary(req.file.buffer, 'evidence');

        const tempVideo = new TempVideo({
            missionId: mission._id,
            evidenceId: evidence._id,
            filename: cloudinaryResult.public_id,
            originalName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            cloudinaryPublicId: cloudinaryResult.public_id,
            cloudinaryUrl: cloudinaryResult.secure_url,
            duration: cloudinaryResult.duration || 0,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        await tempVideo.save();

        evidence.videoUrl = cloudinaryResult.secure_url;
        await evidence.save();

        return successResponse(res, {
            videoId: tempVideo.id,
            videoUrl: cloudinaryResult.secure_url,
            expiresAt: tempVideo.expiresAt,
            expiresInHours: 24,
            duration: cloudinaryResult.duration || 0
        }, 'Video subido exitosamente', 201);

    } catch (error) {
        console.error('Error uploading video:', error);
        return errorResponse(res, error.message);
    }
};

// 📌 Obtener información del video
export const getVideoInfo = async (req, res) => {
    try {
        const { videoId } = req.params;
        
        const tempVideo = await TempVideo.findOne({ id: videoId })
            .populate('missionId', 'companyId')
            .populate('evidenceId');

        if (!tempVideo) {
            return notFoundResponse(res, 'Video no encontrado');
        }

        const isExpired = tempVideo.expiresAt < new Date();
        const timeLeft = isExpired ? 0 : tempVideo.expiresAt - new Date();
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

        return successResponse(res, {
            videoId: tempVideo.id,
            filename: tempVideo.originalName,
            fileSize: (tempVideo.fileSize / (1024 * 1024)).toFixed(2),
            mimeType: tempVideo.mimeType,
            videoUrl: tempVideo.cloudinaryUrl,
            downloadCount: tempVideo.downloadCount || 0,
            expiresAt: tempVideo.expiresAt,
            isExpired,
            timeLeft: {
                hours: hoursLeft,
                minutes: minutesLeft,
                totalMs: timeLeft
            },
            canDownload: !isExpired,
            duration: tempVideo.duration || 0
        });

    } catch (error) {
        console.error('Error getting video info:', error);
        return errorResponse(res, error.message);
    }
};

// 📌 Redirigir al video en Cloudinary
export const downloadVideo = async (req, res) => {
    try {
        const { videoId } = req.params;
        
        const tempVideo = await TempVideo.findOne({ id: videoId });

        if (!tempVideo) {
            return notFoundResponse(res, 'Video no encontrado');
        }

        if (tempVideo.expiresAt < new Date()) {
            return errorResponse(res, 'El video ha expirado (24h)', 410);
        }

        tempVideo.downloadCount += 1;
        await tempVideo.save();

        // ✅ Redirigir a la URL de Cloudinary
        return res.redirect(tempVideo.cloudinaryUrl);

    } catch (error) {
        console.error('Error serving video:', error);
        return errorResponse(res, error.message);
    }
};

// 📌 Limpiar videos expirados (elimina de Cloudinary también)
export const cleanExpiredVideos = async () => {
    try {
        const expiredVideos = await TempVideo.find({ 
            expiresAt: { $lt: new Date() },
            isDeleted: false
        });

        for (const video of expiredVideos) {
            // Eliminar de Cloudinary
            if (video.cloudinaryPublicId) {
                await deleteVideoFromCloudinary(video.cloudinaryPublicId);
            }
            
            video.isDeleted = true;
            await video.save();
            
            console.log(`🗑️ Video eliminado de Cloudinary: ${video.cloudinaryPublicId}`);
        }

        console.log(`✅ Limpieza completada: ${expiredVideos.length} videos eliminados`);
        return expiredVideos.length;
    } catch (error) {
        console.error('Error cleaning expired videos:', error);
        return 0;
    }
};