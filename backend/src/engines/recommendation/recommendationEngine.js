const { randomUUID } = require('crypto');

/** Recommendation returns an explainable decision; Presentation chooses how to render it. */
function decideNextActivity({ sessionId, topic, knowledgeSnapshots }) {
  const weakest = [...knowledgeSnapshots].sort((a, b) => a.mastery - b.mastery)[0];
  const reviewDue = weakest && weakest.nextReviewAt && new Date(weakest.nextReviewAt) <= new Date();
  const outcome = reviewDue || weakest?.mastery < 0.5
    ? { action: 'retry', capability: 'speaking', topic, label: 'Try one improved sentence' }
    : { action: 'continue', capability: 'speaking', topic, label: 'Continue the car conversation' };

  return Object.freeze({
    id: randomUUID(),
    type: 'next-activity',
    sessionId,
    outcome,
    reasonCodes: reviewDue ? ['REVIEW_DUE'] : weakest?.mastery < 0.5 ? ['WEAK_KNOWLEDGE_NODE'] : ['MASTERY_PROGRESSING'],
    confidence: 0.8,
    inputRefs: knowledgeSnapshots.map((snapshot) => snapshot.knowledgeNodeId),
    versions: { id: 'recommendation-rules', type: 'recommendation', version: 1, createdAt: '2026-07-19T00:00:00.000Z' },
    createdAt: new Date().toISOString(),
  });
}

module.exports = { decideNextActivity };
