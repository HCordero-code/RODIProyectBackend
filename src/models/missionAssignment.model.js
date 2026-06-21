import { Schema, model } from 'mongoose';

const missionAssignmentSchema = new Schema({
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
    collaboratorProfileId: {
        type: Schema.Types.ObjectId,
        ref: 'Collaborator',
        required: true
    },
    acceptedLat: Number,
    acceptedLng: Number,
    acceptedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date,
    status: {
        type: String,
        enum: ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
        default: 'ACCEPTED'
    }
}, { timestamps: true, versionKey: false });

// Índice compuesto: una misión solo puede tener una asignación activa
missionAssignmentSchema.index({ missionId: 1, status: 1 });
missionAssignmentSchema.index({ collaboratorProfileId: 1, status: 1 });

export default model('MissionAssignment', missionAssignmentSchema);