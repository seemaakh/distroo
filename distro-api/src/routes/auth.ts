import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  hashPassword,
  verifyPassword,
  generateOTP,
  createSession,
  deleteSession,
} from '../lib/auth';
import { sendSMS, otpMessage } from '../lib/sms';
import { sendEmail, render } from '../lib/email';
import { WelcomeEmail } from '../emails/WelcomeEmail';
import { OtpEmail } from '../emails/OtpEmail';
import { requireAuth } from '../middleware/auth';
import { authLimiter, otpLimiter } from '../middleware/rateLimiter';

const router = Router();

// ─── POST /api/auth/request-otp ──────────────────────────────────────────────
// Find or create a PENDING profile by phone, generate OTP, send SMS.
router.post('/request-otp', otpLimiter, async (req: Request, res: Response): Promise<void> => {
  const { phone } = req.body as { phone?: string };
  if (!phone || !/^\d{10}$/.test(phone)) {
    res.status(400).json({ error: 'Valid 10-digit phone number required' });
    return;
  }

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  let profile = await prisma.profile.findUnique({ where: { phone } });

  if (!profile) {
    profile = await prisma.profile.create({
      data: { phone, passwordHash: '', otpCode: otp, otpExpiry, status: 'PENDING' },
    });
  } else {
    await prisma.profile.update({
      where: { phone },
      data: { otpCode: otp, otpExpiry },
    });
  }

  void sendSMS(phone, otpMessage(otp));

  if (profile.email) {
    void (async () => {
      const html = await render(OtpEmail({ otp, phone }));
      void sendEmail(profile!.email!, 'Your DISTRO verification code', html, 'otp');
    })();
  }

  res.json({ message: 'OTP sent' });
});

// ─── POST /api/auth/verify-otp ───────────────────────────────────────────────
// Validate OTP code + expiry, mark phoneVerified=true, clear OTP fields.
router.post('/verify-otp', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const { phone, otp } = req.body as { phone?: string; otp?: string };
  if (!phone || !otp) {
    res.status(400).json({ error: 'phone and otp are required' });
    return;
  }

  const profile = await prisma.profile.findUnique({ where: { phone } });
  if (!profile || !profile.otpCode || !profile.otpExpiry) {
    res.status(400).json({ error: 'No OTP requested for this number' });
    return;
  }
  if (profile.otpExpiry < new Date()) {
    res.status(400).json({ error: 'OTP has expired' });
    return;
  }
  if (profile.otpCode !== otp) {
    res.status(400).json({ error: 'Invalid OTP' });
    return;
  }

  await prisma.profile.update({
    where: { phone },
    data: { phoneVerified: true, otpCode: null, otpExpiry: null },
  });

  res.json({ message: 'Phone verified' });
});

// ─── POST /api/auth/register ─────────────────────────────────────────────────
// Requires prior OTP verification. Sets password, activates account, issues JWT.
router.post('/register', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const { phone, password, storeName, ownerName, district, address, email } =
    req.body as {
      phone?: string;
      password?: string;
      storeName?: string;
      ownerName?: string;
      district?: string;
      address?: string;
      email?: string;
    };

  if (!phone || !password) {
    res.status(400).json({ error: 'phone and password are required' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const profile = await prisma.profile.findUnique({ where: { phone } });
  if (!profile) {
    res.status(400).json({ error: 'Phone not found — request OTP first' });
    return;
  }
  if (!profile.phoneVerified) {
    res.status(400).json({ error: 'Phone not verified — complete OTP verification first' });
    return;
  }
  if (profile.status === 'ACTIVE') {
    res.status(409).json({ error: 'Account already registered' });
    return;
  }

  const passwordHash = await hashPassword(password);

  // Validate email uniqueness if provided
  if (email) {
    const emailTaken = await prisma.profile.findUnique({ where: { email } });
    if (emailTaken) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }
  }

  const updated = await prisma.profile.update({
    where: { phone },
    data: {
      passwordHash,
      status: 'ACTIVE',
      storeName,
      ownerName,
      district,
      address,
      ...(email ? { email } : {}),
    },
  });

  const token = await createSession(updated.id);

  // Non-blocking welcome email
  if (updated.email) {
    void (async () => {
      const html = await render(WelcomeEmail({
        storeName: updated.storeName ?? updated.phone,
        phone: updated.phone,
      }));
      void sendEmail(updated.email!, 'Welcome to DISTRO', html, 'welcome');
    })();
  }

  const { passwordHash: _, otpCode, otpExpiry, ...safeProfile } = updated;
  res.status(201).json({ token, profile: safeProfile });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const { phone, password } = req.body as { phone?: string; password?: string };
  if (!phone || !password) {
    res.status(400).json({ error: 'phone and password are required' });
    return;
  }

  const profile = await prisma.profile.findUnique({ where: { phone } });
  if (!profile || profile.status === 'PENDING') {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  if (profile.status === 'SUSPENDED') {
    res.status(403).json({ error: 'Account suspended' });
    return;
  }

  // Lockout check
  if (profile.lockedUntil && profile.lockedUntil > new Date()) {
    const remaining = Math.ceil((profile.lockedUntil.getTime() - Date.now()) / 1000);
    res.status(429).json({ error: 'Account locked', lockedUntil: profile.lockedUntil, remaining });
    return;
  }

  const valid = await verifyPassword(password, profile.passwordHash);
  if (!valid) {
    const attempts = profile.loginAttempts + 1;
    const lockData =
      attempts >= 5
        ? { loginAttempts: attempts, lockedUntil: new Date(Date.now() + 15 * 60 * 1000) }
        : { loginAttempts: attempts };

    await prisma.profile.update({ where: { phone }, data: lockData });

    if (attempts >= 5) {
      res.status(429).json({ error: 'Too many failed attempts. Account locked for 15 minutes.' });
    } else {
      res.status(401).json({ error: 'Invalid credentials', attemptsRemaining: 5 - attempts });
    }
    return;
  }

  // Success — reset lockout counters
  await prisma.profile.update({
    where: { phone },
    data: { loginAttempts: 0, lockedUntil: null },
  });

  const token = await createSession(profile.id);
  const { passwordHash, otpCode, otpExpiry, ...safeProfile } = profile;
  res.json({ token, profile: safeProfile });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const token = (req as any).token as string;
  await deleteSession(token);
  res.json({ message: 'Logged out' });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req: Request, res: Response): void => {
  const profile = (req as any).profile;
  const { passwordHash, otpCode, otpExpiry, ...safeProfile } = profile;
  res.json(safeProfile);
});

export default router;
