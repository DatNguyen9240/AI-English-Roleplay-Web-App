/** Knowledge owns mastery math. Inputs and outputs are snapshots, never ORM models. */
function applyKnowledgeDelta(snapshot, delta) {
  const mastery = clamp(snapshot.mastery + delta.masteryDelta);
  const confidence = clamp(snapshot.confidence + delta.confidenceDelta);
  const weak = mastery < 0.5 || delta.reasonCodes.includes('PAST_TENSE_REVIEW_DUE');

  return Object.freeze({
    learnerKey: snapshot.learnerKey,
    knowledgeNodeId: snapshot.knowledgeNodeId,
    mastery,
    confidence,
    exposureCount: snapshot.exposureCount + 1,
    errorCount: snapshot.errorCount + (delta.masteryDelta < 0 ? 1 : 0),
    nextReviewAt: weak ? new Date(Date.now() + 24 * 60 * 60 * 1000) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  });
}

function clamp(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

module.exports = { applyKnowledgeDelta };
