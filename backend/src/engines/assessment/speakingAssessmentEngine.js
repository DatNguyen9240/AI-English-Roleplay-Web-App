const { randomUUID } = require('crypto');

const VERSION_REFS = Object.freeze({
  capabilityVersion: { id: 'speaking', type: 'capability', version: 1, createdAt: '2026-07-19T00:00:00.000Z' },
  rubricVersion: { id: 'speaking-baseline', type: 'rubric', version: 1, createdAt: '2026-07-19T00:00:00.000Z' },
  policyVersion: { id: 'general-learner', type: 'policy', version: 1, createdAt: '2026-07-19T00:00:00.000Z' },
});

/**
 * Normalizes a speaking attempt into an immutable AssessmentResult contract.
 * This deterministic baseline proves the pipeline without putting another LLM
 * call on the realtime turn. An AI workflow can later emit this same shape.
 */
function assessSpeakingAttempt({ transcript, topic, attemptId, policy = {} }) {
  const normalized = transcript.trim();
  const words = normalized.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];
  const feedback = [];
  const reasonCodes = ['SPEAKING_ATTEMPT_ASSESSED'];
  let score = 0.45;

  if (words.length >= 12) {
    score += 0.25;
    reasonCodes.push('SUFFICIENT_RESPONSE_LENGTH');
  } else {
    feedback.push({
      type: 'fluency',
      priority: 'primary',
      message: 'Try adding one more detail about the car or your experience.',
      retryPrompt: 'Say one complete sentence with a reason or example.',
    });
    reasonCodes.push('SHORT_RESPONSE');
  }

  if (/\b(because|so|when|but|although)\b/i.test(normalized)) {
    score += 0.15;
    reasonCodes.push('CONNECTED_IDEA');
  }

  const presentTensePastMarker = /\b(yesterday|last\s+(week|month|year)|ago)\b/i.test(normalized)
    && /\b(go|drive|buy|see|take)\b/i.test(normalized);
  if (presentTensePastMarker) {
    score -= 0.15;
    feedback.push({
      type: 'grammar',
      priority: 'primary',
      message: 'Use a past-tense verb when you describe a finished time.',
      retryPrompt: 'Try again with a past-tense verb, for example: “I drove … yesterday.”',
    });
    reasonCodes.push('PAST_TENSE_REVIEW_DUE');
  }

  if (feedback.length === 0) {
    feedback.push({
      type: 'fluency',
      priority: 'primary',
      message: 'Good detail. Say it once more with one specific example.',
      retryPrompt: 'Add where, when, or why.',
    });
  }

  return Object.freeze({
    id: randomUUID(),
    type: 'speaking-assessment',
    source: 'RULE',
    attemptId,
    score: Math.max(0, Math.min(1, Number(score.toFixed(2)))),
    feedback,
    reasonCodes,
    attemptSnapshot: Object.freeze({ transcript: normalized, topic, wordCount: words.length }),
    versions: Object.freeze({ ...VERSION_REFS, policyVersion: policy.version || VERSION_REFS.policyVersion }),
    createdAt: new Date().toISOString(),
  });
}

module.exports = { assessSpeakingAttempt };
