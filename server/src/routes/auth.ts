import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { generateToken, requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { User } from '../types';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = db
      .prepare(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`)
      .get(email) as User | undefined;

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Authentication failed', details: err.message });
  }
});

router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = db
    .prepare(`SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?`)
    .get(req.user.id) as any;

  if (!user) {
    return res.status(404).json({ error: 'User record not found' });
  }

  return res.json({ user });
});

router.post('/logout', (_req, res) => {
  return res.json({ message: 'Logged out successfully' });
});

export default router;
