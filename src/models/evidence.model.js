import { Schema, model } from 'mongoose';

const evidenceSchema = new Schema({
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
    videoUrl: {
        type: String,
        //required: true
    },
    videoExpiresAt: {
        type: Date
    },
    videoDownloadCount: {
        type: Number,
        default: 0
    },
    durationSec: {
        type: Number,
        default: 0
    },
    capturedLat: {
        type: Number,
        required: true
    },
    capturedLng: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING'
    },
    isWithinRadius: {
        type: Boolean,
        default: false
    },
    distanceFromTargetM: {
        type: Number,
        default: 0
    }
}, { timestamps: true, versionKey: false });

export default model('Evidence', evidenceSchema);