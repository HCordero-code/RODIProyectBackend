import { Schema, model } from "mongoose"
import {
    isValidEmail,
    isValidPhone,
    isValidNickname,
    isValidName
} from "../../utils/db.validatiors.js"

const userSchema = Schema(
    {
        id: {
            type: String,
            default: () => crypto.randomUUID(),
            unique: true
        },
        supabaseId: {
            type: String,
            sparse: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            validate: {
                validator: isValidEmail,
                message: props => `${props.value} no es un email válido`
            }
        },
        password: {
            type: String,
            required: true
        },
        role: {
            type: String,
            enum: ['ADMIN', 'CLIENT', 'COLLABORATOR'],
            default: 'COLLABORATOR'
        },
        status: {
            type: String,
            enum: ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'BANNED'],
            default: 'ACTIVE'
        },
        fcmToken: {
            type: String
        },
        firstName: {
            type: String,
            required: true,
            trim: true,
            validate: {
                validator: isValidName,
                message: 'El nombre solo puede contener letras, espacios y guiones.'
            }
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
            validate: {
                validator: isValidName,
                message: 'El apellido solo puede contener letras, espacios y guiones.'
            }
        },
        fullName: {
            type: String
        },
        nickName: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
            lowercase: true,
            validate: {
                validator: isValidNickname,
                message: 'El nickname solo puede contener letras, números, puntos, guiones y guiones bajos.'
            }
        },
        phone: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
            validate: {
                validator: isValidPhone,
                message: 'El teléfono debe tener solo dígitos y opcionalmente un prefijo +.'
            }
        },
        avatarUrl: {
            type: String
        },
        lastSeen: {
            type: Date
        },
        lastLogin: {
            type: Date
        },
        loginAttempts: {
            type: Number,
            default: 0
        },
        isLocked: {
            type: Boolean,
            default: false
        },
        lockedUntil: {
            type: Date
        }
    },
    {
        versionKey: false,
        timestamps: true
    }
)

// Middleware para actualizar fullName antes de gardar
userSchema.pre('save', async function() {   // ← sin next, async
    if (this.firstName && this.lastName) {
        this.fullName = `${this.firstName} ${this.lastName}`.trim()
    }
})

userSchema.methods.toJSON = function() {
    const { __v, password, ...user } = this.toObject()
    return user
}

// 🔥 ELIMINAR índices duplicados - Só deixar estes
// O unique: true no Schema xa crea índices automáticos
// Non chamar a schema.index() para campos que xa teñen unique: true

// Só índices adicionais que non están definidos no Schema
userSchema.index({ role: 1 })
userSchema.index({ status: 1 })
userSchema.index({ createdAt: -1 })

export default model('User', userSchema)