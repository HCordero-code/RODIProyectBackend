import { Schema, model } from 'mongoose';

const companySchema = new Schema({
    id: {
        type: String,
        default: () => crypto.randomUUID(),
        unique: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true  // Un usuario solo puede tener una empresa
    },
    legalName: {
        type: String,
        required: true,
        trim: true
    },
    creditBalance: {
        type: Number,
        default: 0,
        min: 0
    },
    isVerified: {
        type: Boolean,
        default: true
    },
    taxId: String,
    address: String
}, { 
    timestamps: true, 
    versionKey: false 
});


export default model('Company', companySchema);