import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";
import { setupAuth } from "./auth";

const app = express();

// Configure CORS to allow credentials
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true // Allow credentials (cookies)
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add detailed logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.path.startsWith('/api/')) {
    console.log('Request body:', req.body);
  }
  next();
});

// Set up authentication
setupAuth(app);

(async () => {
  try {
    log("Starting server initialization...");

    const server = await registerRoutes(app);
    log("Routes registered successfully");

    if (app.get("env") === "development") {
      log("Setting up Vite for development...");
      await setupVite(app, server);
      log("Vite setup complete");
    } else {
      log("Setting up static serving for production...");
      serveStatic(app);
    }

    // Try ports in sequence until one works
    const ports = [5000, 3000, 8000, 8080];
    let started = false;

    for (const port of ports) {
      try {
        await new Promise((resolve, reject) => {
          server.listen({
            port,
            host: "0.0.0.0",
          })
          .once('listening', () => {
            log(`Server started successfully on port ${port}`);
            started = true;
            resolve(true);
          })
          .once('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
              log(`Port ${port} is in use, trying next port`);
              resolve(false);
            } else {
              reject(err);
            }
          });
        });

        if (started) break;
      } catch (error) {
        console.error(`Error trying port ${port}:`, error);
      }
    }

    if (!started) {
      throw new Error("Failed to start server on any available port");
    }

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();

// Custom error class for HTTP errors
class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}