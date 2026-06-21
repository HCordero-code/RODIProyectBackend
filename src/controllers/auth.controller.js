import User from "../models/user.model.js"
import Wallet from "../models/wallet.model.js"
import { verifyPassword, encrypt } from "../../utils/encrypt.js"
import { generateJWT } from "../../utils/jwt.js"
import { 
    validateLoginRequest,
    validateRegisterData,
    sanitizeInput,
    isValidEmail,
    isValidPhone,
    isValidNickname } from "../../utils/db.validatiors.js"
import { validateToken } from "../../middlewares/validate.jwt.js"

export const login = async (req, res) => {
    const { userLogin, password } = req.body

    // Validar datos de login
    const validation = validateLoginRequest(userLogin, password)
    if (!validation.valid) {
        return res.status(400).send({
            success: false,
            message: validation.message
        })
    }

    try {
        const user = await User.findOne({
            $or: [
                { email: userLogin },
                { nickName: userLogin },
                { phone: userLogin }
            ]
        })
        
        if (!user) {
            return res.status(401).send({
                success: false,
                message: 'Credenciales inválidas'
            })
        }

        if (user.isLocked && user.lockedUntil && user.lockedUntil > new Date()) {
            return res.status(423).send({
                success: false,
                message: 'La cuenta está bloqueada temporalmente. Intenta de nuevo más tarde.'
            })
        }

        if (user.status !== 'ACTIVE') {
            return res.status(403).send({
                success: false,
                message: 'La cuenta no está activa. Contacta al administrador.'
            })
        }

        if (user.isLocked && user.lockedUntil && user.lockedUntil <= new Date()) {
            user.isLocked = false
            user.loginAttempts = 0
            user.lockedUntil = undefined
            await user.save()
        }

        if(user && await verifyPassword(password, user.password)){
            // Resetear intentos fallidos
            user.loginAttempts = 0
            user.lastLogin = new Date()
            user.lastSeen = new Date()
            await user.save()
            
            const loggedUser = {
                uid: user._id,
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                nickName: user.nickName,
                phone: user.phone,
                email: user.email,
                role: user.role
            }
            const token = await generateJWT(loggedUser)
            return res
                .cookie('access_token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
                    maxAge: 30 * 24 * 60 * 60 * 1000
                })
                .send({
                    success: true,
                    message: `Bienvenido ${user.firstName} ${user.lastName}`,
                    loggedUser,
                    token
                })
        }
        
        // Contraseña incorrecta
        user.loginAttempts = (user.loginAttempts || 0) + 1
        if (user.loginAttempts >= 5) {
            user.isLocked = true
            user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000)
            await user.save()
            return res.status(423).send({
                success: false,
                message: 'Demasiados intentos fallidos. Cuenta bloqueada por 15 minutos.'
            })
        }
        await user.save()
        
        return res.status(401).send({
            success: false,
            message: 'Credenciales inválidas'
        })
        
    } catch (e) {
        console.error(e);
        return res.status(500).send({
            success: false,
            message: 'Error interno del servidor'
        })
    }
}

export const register = async (req, res) => {
    try {
        let data = req.body
        
        // Sanitizar inputs
        data.firstName = sanitizeInput(data.firstName)
        data.lastName = sanitizeInput(data.lastName)
        data.email = sanitizeInput(data.email)?.toLowerCase()
        data.phone = data.phone ? sanitizeInput(data.phone) : undefined
        data.nickName = data.nickName ? sanitizeInput(data.nickName)?.toLowerCase() : undefined
        
        // 🔥 Validar todos los datos
        const validation = validateRegisterData(data)
        if (!validation.valid) {
            return res.status(400).send({
                success: false,
                message: validation.message
            })
        }
        
        // Verificar email único
        const existingEmail = await User.findOne({ email: data.email })
        if (existingEmail) {
            return res.status(409).send({
                success: false,
                message: 'El correo electrónico ya está registrado'
            })
        }
        
        // Verificar nickname único (si se proporcionó)
        if (data.nickName) {
            const existingNickname = await User.findOne({ nickName: data.nickName })
            if (existingNickname) {
                return res.status(409).send({
                    success: false,
                    message: 'El nickname ya está en uso. Elige otro.'
                })
            }
        }
        
        // Verificar teléfono único (si se proporcionó)
        if (data.phone) {
            const existingPhone = await User.findOne({ phone: data.phone })
            if (existingPhone) {
                return res.status(409).send({
                    success: false,
                    message: 'El teléfono ya está registrado'
                })
            }
        }
        
        // Crear usuario
        let user = new User(data)
        user.password = await encrypt(user.password)
        await user.save()

        if (user.role === 'CLIENT' || user.role === 'COLLABORATOR') {
            const wallet = new Wallet({
                userId: user._id,
                pendingBalance: 0,
                approvedBalance: 0,
                withdrawnTotal: 0
            })
            await wallet.save()
            console.log(`✅ Wallet creada para usuario ${user.email} (${user.role})`)
        }

        if (user.role === 'COLLABORATOR') {
            const Collaborator = (await import('../models/collaborator.model.js')).default
            const collaborator = new Collaborator({
                userId: user._id,
                reputationScore: 0,
                isAvailable: true,
                verificationStatus: 'PENDING',
                totalMissionsCompleted: 0,
                totalEarned: 0
            })
            await collaborator.save()
            console.log(`✅ Perfil de colaborador creado para ${user.email}`)
        }

        if (user.role === 'CLIENT') {
            const Company = (await import('../models/company.model.js')).default
            const company = new Company({
                userId: user._id,
                legalName: `${user.firstName} ${user.lastName}`,
                creditBalance: 0,
                isVerified: false
            })
            await company.save()
            console.log(`✅ Perfil de empresa creado para ${user.email}`)
        }
        
        return res.status(201).send({
            success: true,
            message: `¡Registro exitoso! Bienvenido ${user.firstName}. Ya puedes iniciar sesión.`
        })
        
    } catch (e) {
        console.error('Error en registro:', e);
        
        // Manejar errores de validación de Mongoose
        if (e.name === 'ValidationError') {
            const messages = Object.values(e.errors).map(err => err.message)
            return res.status(400).send({
                success: false,
                message: messages.join('. ')
            })
        }
        
        return res.status(500).send({
            success: false,
            message: 'Error interno del servidor'
        })
    }
}

export const logout = [validateToken, (req, res) => {
    res.clearCookie('access_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        path: '/'
    });
    
    // 🔥 IMPORTANTE: Enviar respuesta
    return res.status(200).json({
        success: true,
        message: 'Sesión cerrada exitosamente'
    });
}];

// Obtener perfil do usuario autenticado
export const getProfile = [validateToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user.uid || req.user._id
        
        const user = await User.findById(userId).select('-password')
        
        if (!user) {
            return res.status(404).send({
                success: false,
                message: 'Usuario no encontrado'
            })
        }
        
        return res.send({
            success: true,
            data: user.toJSON()
        })
    } catch (e) {
        console.error('Error en getProfile:', e);
        return res.status(500).send({
            success: false,
            message: 'Error al obtener perfil'
        })
    }
}]

// Actualizar perfil
export const updateProfile = [validateToken, async (req, res) => {
    try {
        const { firstName, lastName, phone, nickName, avatarUrl, address, country } = req.body
        
        // 🔥 CORRECCIÓN: Usar uid
        const userId = req.user.uid || req.user.id
        
        const user = await User.findByIdAndUpdate(
            userId,
            { firstName, lastName, phone, nickName, avatarUrl, address, country },
            { new: true, runValidators: true }
        )
        
        if (!user) {
            return res.status(404).send({
                success: false,
                message: 'User not found'
            })
        }
        
        return res.send({
            success: true,
            message: 'Profile updated successfully',
            data: user.toJSON()
        })
    } catch (e) {
        console.error(e);
        return res.status(500).send({
            success: false,
            message: 'Error updating profile'
        })
    }
}]

// Cambiar contraseña
export const changePassword = [validateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body
        
        // 🔥 CORRECCIÓN: Usar uid
        const userId = req.user.uid || req.user.id
        const user = await User.findById(userId)
        
        if (!user) {
            return res.status(404).send({
                success: false,
                message: 'User not found'
            })
        }
        
        const isValid = await verifyPassword(currentPassword, user.password)
        if (!isValid) {
            return res.status(401).send({
                success: false,
                message: 'Current password is incorrect'
            })
        }
        
        user.password = await encrypt(newPassword)
        await user.save()
        
        return res.send({
            success: true,
            message: 'Password changed successfully'
        })
    } catch (e) {
        console.error(e);
        return res.status(500).send({
            success: false,
            message: 'Error changing password'
        })
    }
}]

// Obter todos os usuarios (só admin)
export const getAllUsers = [validateToken, async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).send({
                success: false,
                message: 'Access denied. Admin only.'
            })
        }
        
        const users = await User.find({}).select('-password')
        return res.send({
            success: true,
            data: users
        })
    } catch (e) {
        console.error(e);
        return res.status(500).send({
            success: false,
            message: 'Error getting users'
        })
    }
}]