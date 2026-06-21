import { Schema, model } from 'mongoose';

const walletSchema = new Schema({
    id: {
        type: String,
        default: () => crypto.randomUUID(),
        unique: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    pendingBalance: {
        type: Number,
        default: 0
    },
    approvedBalance: {
        type: Number,
        default: 0
    },
    withdrawnTotal: {
        type: Number,
        default: 0
    }
}, { timestamps: true, versionKey: false });

export default model('Wallet', walletSchema);