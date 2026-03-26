import { Request, Response, NextFunction } from 'express';

// Cache headers for static assets
export function cacheMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
  }
  next();
}