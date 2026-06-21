import { Schema, model } from 'mongoose';

const collaboratorSchema = new Schema({
    id: {
        type: String,
        default: () => crypto.randomUUID(),
        unique: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true  // Un usuario solo puede tener un perfil de colaborador
    },
    reputationScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    verificationStatus: {
        type: String,
        enum: ['PENDING', 'VERIFIED', 'REJECTED'],
        default: 'VERIFIED'
    },
    currentLat: Number,
    currentLng: Number,
    totalMissionsCompleted: {
        type: Number,
        default: 0
    },
    totalEarned: {
        type: Number,
        default: 0
    }
}, { timestamps: true, versionKey: false });

// Índices para búsqueda geográfica
collaboratorSchema.index({ currentLat: 1, currentLng: 1 });
collaboratorSchema.index({ isAvailable: 1, verificationStatus: 1 });

export default model('Collaborator', collaboratorSchema);