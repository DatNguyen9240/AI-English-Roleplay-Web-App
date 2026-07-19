const { PrismaClient } = require('@prisma/client');

// One client per backend process. Engines receive public snapshots, never this client.
const prisma = new PrismaClient();

module.exports = { prisma };
