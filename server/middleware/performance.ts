
import { Request, Response, NextFunction } from 'express';

export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const time = diff[0] * 1e3 + diff[1] * 1e-6;
    
    if (time > 1000) { // Log slow requests (>1s)
      console.warn(`Slow request: ${req.method} ${req.url} took ${time}ms`);
    }
  });

  next();
}
