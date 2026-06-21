// src/models/TempVideo.model.js
import { Schema, model } from 'mongoose';

const tempVideoSchema = new Schema({
    id: {
        type: String,
        default: () => crypto.randomUUID(),
        unique: true
    },
    missionId: {
        type: Schema.Types.ObjectId,
        ref: 'Mission',
        required: true
    },
    evidenceId: {
        type: Schema.Types.ObjectId,
        ref: 'Evidence',
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    fileSize: Number,
    mimeType: String,
    // ✅ Campos de Cloudinary (reemplaza filePath)
    cloudinaryPublicId: {
        type: String,
        default: null
    },
    cloudinaryUrl: {
        type: String,
        default: null
    },
    downloadCount: {
        type: Number,
        default: 0
    },
    duration: {
        type: Number,
        default: 0
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

tempVideoSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
tempVideoSchema.index({ missionId: 1, evidenceId: 1 });

export default model('TempVideo', tempVideoSchema);