import { Request, Response, NextFunction } from 'express';
import { validateSession } from '../lib/auth';

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token' });
    return;
  }
  const token = auth.split(' ')[1];
  const profile = await validateSession(token);
  if (!profile) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  (req as any).profile = profile;
  (req as any).token = token;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const profile = (req as any).profile;
    if (!roles.includes(profile?.role)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}

export function isAdmin(req: Request, res: Response, next: NextFunction): void {
  requireRole('ADMIN')(req, res, next);
}
