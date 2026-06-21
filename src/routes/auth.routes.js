import express from 'express'
import { 
    login, 
    register, 
    logout, 
    getProfile, 
    updateProfile, 
    changePassword,
    getAllUsers 
} from '../controllers/auth.controller.js'
import { validateToken } from '../../middlewares/validate.jwt.js'
import { isAdmin } from '../../middlewares/role.middleware.js'

const router = express.Router()

// Rutas públicas
router.post('/login', login)
router.post('/register', register)

// Rutas protexidas (aplicar validateToken como middleware)
router.post('/logout', validateToken, logout)
router.get('/profile', validateToken, getProfile)
router.put('/profile', validateToken, updateProfile)
router.post('/change-password', validateToken, changePassword)

// Rutas só admin (aplicar validateToken e despois isAdmin)
router.get('/users', validateToken, isAdmin, getAllUsers)

export default router