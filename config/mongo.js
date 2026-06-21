import dotenv from 'dotenv';
dotenv.config();

import mongoose from "mongoose";

let isConnected = false;

export const connect = async () => {
    if (isConnected) return;
    
    try {
        mongoose.connection.on('connected', () => {
            console.log("MongoDB | Connected to MongoDB")
            isConnected = true;
        })
        mongoose.connection.on('error', (err) => {
            console.log('MongoDB | Error:', err.message)
        })

        await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 30000,
        })

        isConnected = true;
    } catch (err) {
        console.error('Database connection failed', err.message)
        throw err;
    }
}