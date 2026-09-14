import express from "express";
import type { Request, Response, Express, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';


const app: Express = express();

app.use(helmet({
    contentSecurityPolicy: false

}));

app.use(
    cors({
        origin: process.env.CLIENT_URL || '*',
        credentials: true,

    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// REQUEST LOGGER
// if (process.env.NODE_ENV === "development") {
//     app.use(morgan("dev"));
// } else {
//     app.use(morgan("combined"));
// }
app.use(morgan("dev"));
// swagger docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api-docs.json", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
});

// Redirect root URL to interactive Swagger documentation
app.get("/", (_req: Request, res: Response) => {
    res.redirect("/api-docs");
});

// health check end point
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: "success",
        message: "app is alive and running",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

//404 route handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        status: "fail",
        message: "Route not found on the AUTOLOG KE API SERVER",
    });
});

//global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(`Server Error: ${err.stack}`);
    res.status(500).json({
        status: "error",
        message: err.message || "Something went wrong on the AUTOLOG KE API SERVER!",
    });
});

export default app;