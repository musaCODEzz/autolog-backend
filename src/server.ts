import 'dotenv/config';



import app from "./app";
import connectDB from "./config/db";

const PORT = process.env.PORT || 5000;


// Connect to Database & Start Express Server
const startServer = async (): Promise<void> => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`
🚀 ===================================================
🛡️  AutoLog KE Backend Server is running!
🌐 Environment: ${process.env.NODE_ENV || 'development'}
📡 Listening on: http://localhost:${PORT}
📚 Docs available at: http://localhost:${PORT}/api-docs
🩺 Health Check: http://localhost:${PORT}/health
=================================================== 🚀
    `);
    });
};
startServer();
