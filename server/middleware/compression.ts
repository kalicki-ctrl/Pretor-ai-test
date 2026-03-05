import { Request, Response, NextFunction } from 'express';

// Simple compression middleware for responses
export function compressionMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.send;
  
  res.send = function(data: any) {
    if (typeof data === 'string' && data.length > 1000) {
      // Minify JSON responses
      try {
        const parsed = JSON.parse(data);
        data = JSON.stringify(parsed);
      } catch {
        // Not JSON, continue with original data
      }
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}

// Cache headers for static assets
export function cacheMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
  }
  next();
}