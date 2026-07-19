const { randomUUID } = require('crypto');

/** Learning owns the interpretation of an assessment into a requested delta. */
function deriveKnowledgeDeltas({ assessment, knowledgeNodeVersions }) {
  const primaryDelta = assessment.score >= 0.7 ? 0.08 : assessment.score >= 0.5 ? 0.03 : -0.02;
  const confidenceDelta = assessment.score >= 0.7 ? 0.05 : 0.01;

  return knowledgeNodeVersions.map((nodeVersion, index) => Object.freeze({
    id: randomUUID(),
    assessmentResultId: assessment.id,
    knowledgeNodeVersionId: nodeVersion.id,
    masteryDelta: index === 0 ? primaryDelta : primaryDelta / 2,
    confidenceDelta: index === 0 ? confidenceDelta : confidenceDelta / 2,
    reasonCodes: assessment.reasonCodes,
    createdAt: assessment.createdAt,
  }));
}

module.exports = { deriveKnowledgeDeltas };
