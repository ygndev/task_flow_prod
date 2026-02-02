import { Request, Response, NextFunction } from 'express';
import { Role } from '../../domain/enums/Role';

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized: Authentication required' });
    return;
  }

  if (req.user.role !== Role.ADMIN) {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
    return;
  }

  next();
}

export function requireMember(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized: Authentication required' });
    return;
  }

  if (req.user.role !== Role.MEMBER) {
    res.status(403).json({ error: 'Forbidden: Member access required' });
    return;
  }

  next();
}
