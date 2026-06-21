import { hash, verify } from "argon2"

export const encrypt = async (password) => {
    try {
        return await hash(password)
    } catch (error) {
        console.error(error)
        return error
    }
}

export const verifyPassword = async (password, hashPassword) => {
    try {
        return await verify(hashPassword, password)
    } catch (error) {
        console.error(error)
        return error
    }
}