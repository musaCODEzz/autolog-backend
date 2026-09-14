import mongoose from 'mongoose';

const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 5000;

export const connectDB = async (retryCount = 0): Promise<void> => {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
        throw new Error("MONGO_URI is missing in environment variables!");
    }

    try {
        const conn = await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of hanging for 30s
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Database Connection Error: ${(error as Error).message}`);

        if (retryCount < MAX_RETRIES) {
            console.log(`🔄 Retrying connection (${retryCount + 1}/${MAX_RETRIES}) in 5 seconds...`);
            await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS));
            return connectDB(retryCount + 1);
        }

        console.error('💥 All database connection retries exhausted. Shutting down server...');
        process.exit(1);
    }
};

// Connection lifecycle event listeners
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected. Attempting auto-reconnect...');
});

mongoose.connection.on('error', (err) => {
    console.error(`❌ MongoDB Runtime Error: ${err}`);
});

// Graceful Shutdown listeners (for server restarts or Ctrl+C)
const gracefulShutdown = async (signal: string) => {
    console.log(`\n⚠️ Received ${signal}. Closing MongoDB connection cleanly...`);
    try {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed gracefully. Exiting process.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error closing MongoDB connection:', err);
        process.exit(1);
    }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export default connectDB;
