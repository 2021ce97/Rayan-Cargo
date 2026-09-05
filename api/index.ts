import app from '../src/server/app.ts';

export default function handler(req: any, res: any) {
  // Normalize rewritten paths in Vercel Serverless environment
  if (req.url) {
    if (req.url.startsWith('/api/index')) {
      req.url = req.url.replace('/api/index', '/api');
    }
    // Also check x-matched-path or x-now-route-matches if needed
    const matchedPath = req.headers?.['x-matched-path'];
    if (matchedPath && typeof matchedPath === 'string' && matchedPath.startsWith('/api/')) {
      req.url = matchedPath;
    }
  }
  return app(req, res);
}
