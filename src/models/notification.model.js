import { Schema, model } from 'mongoose';

const notificationSchema = new Schema({
    id: {
        type: String,
        default: () => crypto.randomUUID(),
        unique: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    missionId: {
        type: Schema.Types.ObjectId,
        ref: 'Mission'
    },
    type: {
        type: String,
        enum: [
            'MISSION_ASSIGNED', 
            'MISSION_COMPLETED', 
            'PAYMENT_RECEIVED', 
            'RATING_RECEIVED', 
            'MISSION_EXPIRING', 
            'EVIDENCE_VERIFIED',
            'WITHDRAWAL_REQUEST',    
            'WITHDRAWAL_APPROVED',     
            'WITHDRAWAL_REJECTED'      
        ],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    body: String,
    isRead: {
        type: Boolean,
        default: false
    },
    metadata: Schema.Types.Mixed
}, { timestamps: true, versionKey: false });

// Índice para búsquedas eficientes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

export default model('Notification', notificationSchema);