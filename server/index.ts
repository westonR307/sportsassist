import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { registerDebugRoutes } from "./debug-routes";
import registerAvailabilityRoutes from "./availability-routes";
import registerNotificationRoutes from "./notification-routes";
import stripeRoutes from "./routes/stripe";
import checkoutRoutes from "./routes/checkout";
import cors from "cors";

const app = express();
app.use(cors());

// Increase JSON body size limit to handle larger profile images (10MB limit)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

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
    
    // Register debug routes (only in development)
    registerDebugRoutes(app);
    log("Debug routes registered");
    
    // Register availability slot routes
    registerAvailabilityRoutes(app);
    log("Availability routes registered");
    
    // Register notification routes
    registerNotificationRoutes(app);
    log("Notification routes registered");
    
    // Register Stripe Connect routes
    app.use('/api/stripe', stripeRoutes);
    
    // Route specific organization endpoints for Stripe
    app.use('/api/organizations/:orgId/stripe', (req, res, next) => {
      const orgId = parseInt(req.params.orgId);
      if (isNaN(orgId)) {
        return res.status(400).json({ message: "Invalid organization ID" });
      }
      req.url = req.url.replace(`/organizations/${orgId}`, '');
      stripeRoutes(req, res, next);
    });
    
    log("Stripe Connect routes registered");
    
    // Register Stripe Checkout routes
    app.use('/api/checkout', checkoutRoutes);
    log("Stripe Checkout routes registered");

    // Set up error handling after routes
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Server error:', err);
      const status = err instanceof HttpError ? err.status : 500;
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
        // Continue to next port
      }
    }

    if (!started) {
      throw new Error("Failed to start server on any available port");
    }

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

// Custom error class for HTTP errors
class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}