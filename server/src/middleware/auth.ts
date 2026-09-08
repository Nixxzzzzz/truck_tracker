import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { UserRole } from '../types';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'truck_tracker_luxury_secret_jwt_2026';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication session' });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access forbidden: Required role [${allowedRoles.join(', ')}], current role is [${req.user.role}]`
      });
    }

    next();
  };
}

export function logAudit(params: {
  tripId?: string;
  action: string;
  fieldChanged?: string;
  originalValue?: string;
  newValue?: string;
  changedBy: string;
  reason?: string;
}) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (id, trip_id, action, field_changed, original_value, new_value, changed_by, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      params.tripId || null,
      params.action,
      params.fieldChanged || null,
      params.originalValue || null,
      params.newValue || null,
      params.changedBy,
      params.reason || null
    );
  } catch (err: any) {
    console.error('[AuditLog] Failed to record audit log:', err.message);
  }
}
