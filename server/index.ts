import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { connectRedis } from "./services/cache";
import { cacheMiddleware } from "./middleware/compression";

const app = express();

// Security headers (CSP, X-Frame-Options, X-Content-Type-Options, HSTS, etc.)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
    },
  },
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
}));

// Global rate limit: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});
app.use("/api/", globalLimiter);

// Stricter rate limit for LLM-consuming endpoints: 10 req/min
const llmLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Rate limit exceeded for AI endpoints. Please wait before retrying." },
});
app.use("/api/analyze", llmLimiter);
app.use("/api/understand", llmLimiter);
app.use("/api/chat", llmLimiter);

// Even stricter for collaborative (up to 28 LLM calls per request) and image endpoints
const heavyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Rate limit exceeded for resource-intensive endpoints." },
});
app.use("/api/collaborative-ai/", heavyLimiter);
app.use("/api/analyze-image", heavyLimiter);

// Static asset cache headers
app.use(cacheMiddleware);

// Body parsing with reduced limit (2MB sufficient for text prompts + base64 images)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

// Serve static files from attached_assets directory (absolute path prevents working-dir confusion)
import path from "path";
app.use('/attached_assets', express.static(path.resolve(import.meta.dirname, '..', 'attached_assets')));

// Request logging — sanitized: no response bodies, no sensitive data
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  // Conectar ao Redis (opcional)
  try {
    await connectRedis();
  } catch (error) {
    console.log('Redis indisponível, continuando sem cache');
  }

  const server = await registerRoutes(app);

  // Global error handler — no throw, generic message for 500s
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = status >= 500 ? "Internal Server Error" : (err.message || "Bad Request");

    console.error('Unhandled route error:', err);
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
