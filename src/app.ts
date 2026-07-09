import express from "express";
import type { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { toNodeHandler } from "better-auth/node";
import path from "node:path";
import { envVars } from "./config/env";
import { IndexRoute } from "./app/routes/index";
import { HealthRoute } from "./app/routes/health.route";
import { globalErrorhandler } from "./app/middleware/globalErrorhandler";
import { notFound } from "./app/middleware/notFound";
import { betterAuthLimiter } from "./app/middleware/authRateLimiter";
import { auth } from "./app/lib/auth";
import { BillingController } from "./app/module/billing/billing.controller";

const app: Application = express();

app.set("trust proxy", 1);
app.set("view engine", "ejs");
app.set("views", path.resolve(process.cwd(), `src/app/templates`));

const corsOptions = {
    origin: [envVars.FRONTEND_URL, envVars.BETTER_AUTH_URL, "http://localhost:3000", "http://localhost:5000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};

const authRateLimiter = betterAuthLimiter;

app.use(helmet());
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(cookieParser());

app.use("/api/auth", authRateLimiter, toNodeHandler(auth));
app.post(
  "/api/v1/billing/webhook",
  express.raw({ type: "application/json" }),
  BillingController.webhook,
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req: Request, res: Response) => {
  res.send(`${envVars.APP_NAME} Server is running`);
});

app.use("/health", HealthRoute);
app.use("/api/v1", IndexRoute);

app.use(globalErrorhandler);
app.use(notFound);
export default app;
