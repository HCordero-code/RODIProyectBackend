// models/transaction.model.js
import { Schema, model } from 'mongoose';

const transactionSchema = new Schema({
    id: {
        type: String,
        default: () => crypto.randomUUID(),
        unique: true
    },
    walletId: {
        type: Schema.Types.ObjectId,
        ref: 'Wallet',
        required: true
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
        enum: ['DEPOSIT', 'WITHDRAWAL', 'HOLD', 'RELEASE', 'REFUND'],
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'],
        default: 'PENDING'
    },
    amount: {
        type: Number,
        required: true
    },
    description: String,
    metadata: Schema.Types.Mixed,
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date
}, { timestamps: true, versionKey: false });

export default model('Transaction', transactionSchema);