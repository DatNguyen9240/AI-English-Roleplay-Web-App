const jwt = require('jsonwebtoken');
const cookie = require('cookie');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is missing.');
}

/**
 * Express middleware to authenticate stateless HTTP API requests.
 * Reads JWT from the HTTP-only cookie set at login.
 */
function authenticateJWT(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized (Missing Token)' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Forbidden (Invalid Token)' });
    }
    req.user = user;
    next();
  });
}

/**
 * Socket.IO handshake middleware to authenticate realtime WebSocket connections.
 * Socket.IO does not run through Express, so cookies must be parsed manually here.
 * Uses the `cookie` package for spec-compliant parsing (handles edge-cases like
 * values with '=' or whitespace that split(';') would misparse).
 */
function socketAuth(socket, next) {
  const cookieHeader = socket.handshake.headers.cookie;
  if (!cookieHeader) {
    return next(new Error('Authentication error: Missing cookies'));
  }

  const cookies = cookie.parse(cookieHeader);
  const token = cookies.token;

  if (!token) {
    return next(new Error('Authentication error: Missing token'));
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
    // Bind authenticated user data directly to socket session
    socket.user = user;
    next();
  });
}

module.exports = {
  authenticateJWT,
  socketAuth,
};
