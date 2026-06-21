import { Schema, model } from 'mongoose';

const ratingSchema = new Schema({
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
    giverId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiverId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    score: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    quality: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    punctuality: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    comment: String
}, { timestamps: true, versionKey: false });

// Índice compuesto para evitar múltiples ratings por misión
ratingSchema.index({ missionId: 1, giverId: 1, receiverId: 1 }, { unique: true });

export default model('Rating', ratingSchema);