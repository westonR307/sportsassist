import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add request logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    log("Starting server initialization...");

    const server = await registerRoutes(app);
    log("Routes registered successfully");

    // Set up error handling after routes
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Server error:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      log("Setting up Vite for development...");
      await setupVite(app, server);
      log("Vite setup complete");
    } else {
      log("Setting up static serving for production...");
      serveStatic(app);
    }

    // Try the original port first, then fall back to an alternative if needed
    const preferredPort = process.env.PORT ? parseInt(process.env.PORT) : 5000;
    const altPort = process.env.PORT ? parseInt(process.env.PORT) + 1 : 3000;
    
    // Try to start server with preferred port first
    server.listen({
      port: preferredPort,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`Server started successfully, serving on port ${preferredPort}`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        log(`Port ${preferredPort} is in use, trying port ${altPort} instead`);
        
        // If preferred port fails, try the alternative port
        server.listen({
          port: altPort,
          host: "0.0.0.0",
          reusePort: true,
        }, () => {
          log(`Server started successfully, serving on port ${altPort}`);
        }).on('error', (e) => {
          console.error('Failed to start server on alternative port:', e);
          process.exit(1);
        });
      } else {
        console.error('Failed to start server:', err);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    process.exit(1);
  }
})();