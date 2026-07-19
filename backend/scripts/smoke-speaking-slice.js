const { PrismaClient } = require('@prisma/client');
const { SpeakingSliceService } = require('../src/application/speakingSliceService');

const prisma = new PrismaClient();
const learnerKey = `architecture-smoke-${Date.now()}`;
const requestId = `${learnerKey}-turn`;
let session;

async function main() {
  try {
    const service = new SpeakingSliceService(prisma, console);
    session = await service.startSession({ learnerKey, topic: 'car' });
    const update = await service.processTurn({
      sessionId: session.id,
      learnerKey,
      transcript: 'Yesterday I drive my car because it is reliable.',
      inputType: 'TEXT',
      idempotencyKey: requestId,
      topic: 'car',
    });

    if (!update.assessment || !update.knowledge.length || !update.decision) {
      throw new Error('Incomplete learning update');
    }

    const events = await prisma.outboxEvent.count({
      where: { idempotencyKey: { startsWith: requestId } },
    });
    if (events !== 3) {
      throw new Error(`Expected 3 outbox events, got ${events}`);
    }

    console.log('Database Speaking Slice smoke test passed.');
  } finally {
    if (session) {
      await prisma.learningSession.delete({ where: { id: session.id } });
    }
    await prisma.userKnowledge.deleteMany({ where: { learnerKey } });
    await prisma.outboxEvent.deleteMany({ where: { idempotencyKey: { startsWith: requestId } } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
