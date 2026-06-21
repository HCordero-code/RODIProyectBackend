import { Schema, model } from "mongoose";

const missionSchema = new Schema({
    id: {
        type: String,
        default: () => crypto.randomUUID(),
        unique: true
    },
    companyId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Company',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: String,
    lat: {
        type: Number,
        required: true
    },
    lng: {
        type: Number,
        required: true
    },
    searchRadiusKm: {
        type: Number,
        default: 1
    },
    priority: { 
        type: String, 
        enum: ['STANDARD', 'EXPRESS', 'CRITICAL'],
        default: 'STANDARD'
    },
    status: { 
        type: String, 
        enum: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
        default: 'PENDING'
    },
    rewardAmount: {
        type: Number,
        required: true,
        min: 0
    },
    totalCost: {
        type: Number,
        required: true,
        min: 0
    },
    expiresAt: {
        type: Date,
        required: true
    }
}, { timestamps: true, versionKey: false });

// Índices para búsquedas frecuentes
missionSchema.index({ status: 1, priority: 1 });
missionSchema.index({ companyId: 1, createdAt: -1 });
missionSchema.index({ expiresAt: 1 });

export default model('Mission', missionSchema);