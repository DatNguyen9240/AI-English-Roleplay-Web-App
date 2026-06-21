const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const logger = require('@config/logger');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10);
const prisma = new PrismaClient();

/**
 * Parses a JWT-style duration string (e.g. '7d', '24h', '30m') into milliseconds.
 * Used to keep the cookie maxAge in sync with the JWT expiry without duplicating the value.
 * @param {string} value - Duration string
 * @returns {number} Milliseconds
 */
function parseDurationMs(value) {
  const units = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 };
  const match = String(value).match(/^(\d+)([smhd])$/i);
  if (!match) throw new Error(`Invalid JWT_EXPIRES_IN format: "${value}". Expected e.g. "7d", "24h".`);
  return parseInt(match[1], 10) * units[match[2].toLowerCase()];
}

// Shared cookie options — single source of truth for all auth cookie writes.
// maxAge is computed from JWT_EXPIRES_IN so both always stay in sync.
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: parseDurationMs(JWT_EXPIRES_IN),
};

/**
 * Signs a JWT and sets it as an HTTP-only cookie on the response.
 * @param {import('express').Response} res
 * @param {{ userId: string, email: string }} payload
 */
function issueAuthCookie(res, payload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  res.cookie('token', token, COOKIE_OPTIONS);
}

async function register(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });

    issueAuthCookie(res, { userId: user.id, email: user.email });

    res.status(201).json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    logger.error({ err }, '[register] Unhandled error');
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    issueAuthCookie(res, { userId: user.id, email: user.email });

    res.json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    logger.error({ err }, '[login] Unhandled error');
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function logout(req, res) {
  // Omit maxAge — clearCookie only needs the security flags to match the original Set-Cookie
  const { maxAge: _omit, ...clearOptions } = COOKIE_OPTIONS;
  res.clearCookie('token', clearOptions);
  res.json({ success: true });
}

module.exports = {
  register,
  login,
  logout,
};
