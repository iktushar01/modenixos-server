import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import path from "node:path";
import { envVars } from "./config/env";
import { IndexRoute } from "./app/routes/index";
import { HealthRoute } from "./app/routes/health.route";
import { globalErrorhandler } from "./app/middleware/globalErrorhandler";
import { notFound } from "./app/middleware/notFound";
import { auth } from "./app/lib/auth";

const app: Application = express();

app.set("view engine", "ejs");
app.set("views", path.resolve(process.cwd(), `src/app/templates`));

const corsOptions = {
    origin: [envVars.FRONTEND_URL, envVars.BETTER_AUTH_URL, "http://localhost:3000", "http://localhost:5000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};

const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many auth requests. Please try again later.",
    },
});

app.use(helmet());
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use("/api/auth", authRateLimiter, toNodeHandler(auth));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req: Request, res: Response) => {
  res.send(`${envVars.APP_NAME} Server is running`);
});

app.use("/health", HealthRoute);
app.use("/api/v1/auth", authRateLimiter);
app.use("/api/v1", IndexRoute);

app.use(globalErrorhandler);
app.use(notFound);
export default app;
