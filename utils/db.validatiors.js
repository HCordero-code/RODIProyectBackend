const NAME_REGEX = /^[A-Za-zÀ-ÿ\s'-]{2,60}$/
const NICKNAME_REGEX = /^[a-zA-Z0-9._-]{3,30}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^\+?[0-9]{7,15}$/
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/

export const isValidEmail = (value) => {
  return typeof value === 'string' && EMAIL_REGEX.test(value.trim())
}

export const isValidPhone = (value) => {
  if (value == null || value === '') return true
  return typeof value === 'string' && PHONE_REGEX.test(value.trim())
}

export const isValidNickname = (value) => {
  if (value == null || value === '') return true
  return typeof value === 'string' && NICKNAME_REGEX.test(value.trim())
}

export const isValidName = (value) => {
  return typeof value === 'string' && NAME_REGEX.test(value.trim())
}

export const isValidPassword = (value) => {
  return typeof value === 'string' && PASSWORD_REGEX.test(value)
}

export const isValidUserLogin = (value) => {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  return isValidEmail(trimmed) || isValidPhone(trimmed) || isValidNickname(trimmed)
}

export const validateLoginRequest = (userLogin, password) => {
  if (!userLogin || typeof userLogin !== 'string' || userLogin.trim().length === 0) {
    return {
      valid: false,
      message: 'El usuario, correo o teléfono es requerido'
    }
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return {
      valid: false,
      message: 'La contraseña debe tener al menos 8 caracteres'
    }
  }

  if (!isValidUserLogin(userLogin)) {
    return {
      valid: false,
      message: 'El usuario debe ser un email, teléfono o nickname válido'
    }
  }

  return {
    valid: true,
    message: 'OK'
  }
}

export const validateRegisterData = (data) => {
    const errors = []
    
    // Validar nombre
    if (!data.firstName || !isValidName(data.firstName)) {
        errors.push('El nombre debe tener entre 2 y 60 caracteres y solo puede contener letras, espacios, apóstrofes y guiones')
    }
    
    // Validar apellido
    if (!data.lastName || !isValidName(data.lastName)) {
        errors.push('El apellido debe tener entre 2 y 60 caracteres y solo puede contener letras, espacios, apóstrofes y guiones')
    }
    
    // Validar email
    if (!data.email || !isValidEmail(data.email)) {
        errors.push('El correo electrónico no es válido')
    }
    
    // Validar contraseña
    if (!data.password || !isValidPassword(data.password)) {
        errors.push('La contraseña debe tener al menos 8 caracteres, incluyendo una letra, un número y un carácter especial')
    }
    
    // Validar teléfono (opcional)
    if (data.phone && !isValidPhone(data.phone)) {
        errors.push('El teléfono debe tener entre 7 y 15 dígitos y puede comenzar con +')
    }
    
    // Validar nickname (opcional)
    if (data.nickName && !isValidNickname(data.nickName)) {
        errors.push('El nickname debe tener entre 3 y 30 caracteres y solo puede contener letras, números, puntos, guiones y guión bajo')
    }
    
    // Validar rol
    const validRoles = ['ADMIN', 'CLIENT', 'COLLABORATOR']
    if (data.role && !validRoles.includes(data.role)) {
        errors.push('El rol no es válido')
    }
    
    return {
        valid: errors.length === 0,
        errors,
        message: errors.length === 0 ? 'OK' : errors.join('. ')
    }
}

/**
 * Sanitizar datos de entrada (limpiar y escapar)
 */
export const sanitizeInput = (input) => {
    if (input === null || input === undefined) return input
    if (typeof input !== 'string') return input
    return input.trim().replace(/[<>]/g, '') // Remover caracteres peligrosos
}

/**
 * Validar que el campo no esté vacío
 */
export const isNotEmpty = (value) => {
    return value && typeof value === 'string' && value.trim().length > 0
}