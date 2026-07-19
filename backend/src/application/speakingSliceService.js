const { assessSpeakingAttempt } = require('../engines/assessment/speakingAssessmentEngine');
const { deriveKnowledgeDeltas } = require('../engines/learning/learningEngine');
const { applyKnowledgeDelta } = require('../engines/knowledge/knowledgeEngine');
const { decideNextActivity } = require('../engines/recommendation/recommendationEngine');

const SPEAKING_NODE = { key: 'skill:speaking-fluency', nodeType: 'SKILL', label: 'Speaking fluency' };
const CAR_NODE = { key: 'topic:car', nodeType: 'TOPIC', label: 'Cars and transport' };
const PAST_NODE = { key: 'grammar:past-simple', nodeType: 'GRAMMAR', label: 'Past simple' };

/**
 * Application-layer orchestrator. It coordinates public engine contracts but
 * does not own assessment, mastery, or recommendation rules.
 */
class SpeakingSliceService {
  constructor(prisma, logger) {
    this.prisma = prisma;
    this.logger = logger;
  }

  async startSession({ learnerKey, topic }) {
    const activity = await this.ensureCarActivity();
    return this.prisma.learningSession.create({
      data: { learnerKey, topic, capability: 'speaking', activityId: activity.id },
    });
  }

  async processTurn({ sessionId, learnerKey, transcript, inputType, idempotencyKey, topic }) {
    const existing = await this.prisma.learningTurn.findUnique({
      where: { idempotencyKey },
      include: { assessments: { include: { deltas: true } }, session: { include: { decisions: { orderBy: { createdAt: 'desc' }, take: 1 } } } },
    });
    if (existing) return this.serializeExisting(existing);

    const assessment = assessSpeakingAttempt({ transcript, topic, attemptId: idempotencyKey });
    const nodeVersions = await this.resolveKnowledgeVersions(assessment.reasonCodes);
    const deltas = deriveKnowledgeDeltas({ assessment, knowledgeNodeVersions: nodeVersions });

    return this.prisma.$transaction(async (tx) => {
      const turn = await tx.learningTurn.create({
        data: {
          sessionId,
          sequence: await this.nextSequence(tx, sessionId),
          idempotencyKey,
          inputType,
          transcript: assessment.attemptSnapshot.transcript,
        },
      });

      const savedAssessment = await tx.assessmentResult.create({
        data: {
          id: assessment.id,
          turnId: turn.id,
          source: assessment.source,
          score: assessment.score,
          feedback: assessment.feedback,
          attemptSnapshot: assessment.attemptSnapshot,
          capabilityVersion: assessment.versions.capabilityVersion,
          rubricVersion: assessment.versions.rubricVersion,
          policyVersion: assessment.versions.policyVersion,
        },
      });

      const snapshots = [];
      for (const delta of deltas) {
        const nodeVersion = nodeVersions.find((candidate) => candidate.id === delta.knowledgeNodeVersionId);
        const current = await tx.userKnowledge.findUnique({
          where: { learnerKey_knowledgeNodeId: { learnerKey, knowledgeNodeId: nodeVersion.knowledgeNodeId } },
        });
        const snapshot = current || { learnerKey, knowledgeNodeId: nodeVersion.knowledgeNodeId, mastery: 0, confidence: 0, exposureCount: 0, errorCount: 0 };
        const next = applyKnowledgeDelta(snapshot, delta);
        const persisted = await tx.userKnowledge.upsert({
          where: { learnerKey_knowledgeNodeId: { learnerKey, knowledgeNodeId: nodeVersion.knowledgeNodeId } },
          create: next,
          update: {
            mastery: next.mastery,
            confidence: next.confidence,
            exposureCount: next.exposureCount,
            errorCount: next.errorCount,
            nextReviewAt: next.nextReviewAt,
          },
        });
        snapshots.push(persisted);
        await tx.knowledgeDelta.create({
          data: {
            id: delta.id,
            assessmentResultId: savedAssessment.id,
            knowledgeNodeVersionId: delta.knowledgeNodeVersionId,
            learnerKey,
            masteryDelta: delta.masteryDelta,
            confidenceDelta: delta.confidenceDelta,
            reasonCodes: delta.reasonCodes,
          },
        });
      }

      const decision = decideNextActivity({ sessionId, topic, knowledgeSnapshots: snapshots });
      await tx.recommendationDecision.create({ data: { id: decision.id, sessionId, decision } });
      await this.writeOutbox(tx, 'TurnCompleted', 'LearningTurn', turn.id, `${idempotencyKey}:turn`, { sessionId, turnId: turn.id });
      await this.writeOutbox(tx, 'KnowledgeUpdated', 'AssessmentResult', savedAssessment.id, `${idempotencyKey}:knowledge`, { sessionId, assessmentResultId: savedAssessment.id });
      await this.writeOutbox(tx, 'RecommendationCreated', 'LearningSession', sessionId, `${idempotencyKey}:recommendation`, { sessionId, decisionId: decision.id });

      return {
        assessment: { id: savedAssessment.id, score: assessment.score, feedback: assessment.feedback, reasonCodes: assessment.reasonCodes, versions: assessment.versions },
        knowledge: snapshots.map((snapshot) => ({ knowledgeNodeId: snapshot.knowledgeNodeId, mastery: snapshot.mastery, confidence: snapshot.confidence, nextReviewAt: snapshot.nextReviewAt })),
        decision,
      };
    });
  }

  async ensureCarActivity() {
    return this.prisma.activity.upsert({
      where: { slug: 'speaking-car-v1' },
      update: {},
      create: { slug: 'speaking-car-v1', title: 'Talk about cars', capability: 'speaking', config: { topic: 'car' }, isPublished: true },
    });
  }

  async resolveKnowledgeVersions(reasonCodes) {
    const definitions = [SPEAKING_NODE, CAR_NODE];
    if (reasonCodes.includes('PAST_TENSE_REVIEW_DUE')) definitions.push(PAST_NODE);
    return Promise.all(definitions.map((definition) => this.ensureKnowledgeVersion(definition)));
  }

  async ensureKnowledgeVersion({ key, nodeType, label }) {
    const node = await this.prisma.knowledgeNode.upsert({
      where: { key },
      update: {},
      create: { key, nodeType, versions: { create: { version: 1, label } } },
      include: { versions: { where: { version: 1 } } },
    });
    return node.versions[0];
  }

  async nextSequence(tx, sessionId) {
    const previous = await tx.learningTurn.aggregate({ where: { sessionId }, _max: { sequence: true } });
    return (previous._max.sequence || 0) + 1;
  }

  async writeOutbox(tx, eventType, aggregateType, aggregateId, idempotencyKey, payload) {
    return tx.outboxEvent.create({ data: { eventType, aggregateType, aggregateId, idempotencyKey, payload } });
  }

  serializeExisting(turn) {
    const assessment = turn.assessments[0];
    return {
      assessment: assessment && { id: assessment.id, score: assessment.score, feedback: assessment.feedback },
      knowledge: [],
      decision: turn.session.decisions[0]?.decision || null,
    };
  }
}

module.exports = { SpeakingSliceService };
