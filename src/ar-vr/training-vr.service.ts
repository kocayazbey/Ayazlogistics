import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

interface VRTrainingModule {
  moduleId: string;
  title: string;
  category: 'forklift_operation' | 'safety_procedures' | 'picking_techniques' | 'equipment_handling' | 'emergency_response';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  prerequisites: string[];
  learningObjectives: string[];
  assessmentCriteria: Array<{
    criterion: string;
    passingScore: number;
  }>;
  scenarioUrl: string;
}

interface VRTrainingSession {
  sessionId: string;
  traineeId: string;
  moduleId: string;
  startTime: Date;
  endTime?: Date;
  status: 'in_progress' | 'completed' | 'failed' | 'abandoned';
  performance: {
    accuracy: number;
    speed: number;
    safety: number;
    overallScore: number;
  };
  mistakes: Array<{
    timestamp: Date;
    type: string;
    severity: 'minor' | 'major' | 'critical';
    description: string;
  }>;
  completionPercentage: number;
}

interface TrainingAssessment {
  sessionId: string;
  traineeId: string;
  moduleId: string;
  scores: Record<string, number>;
  overallScore: number;
  passed: boolean;
  feedback: string[];
  certificationIssued: boolean;
  nextRecommendedModule?: string;
}

@Injectable()
export class TrainingVRService {
  private readonly logger = new Logger(TrainingVRService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async startTraining(traineeId: string, moduleId: string): Promise<string> {
    const sessionId = `vr_train_${Date.now()}`;

    const module = await this.getTrainingModule(moduleId);

    if (!module) {
      throw new Error('Training module not found');
    }

    const session: VRTrainingSession = {
      sessionId,
      traineeId,
      moduleId,
      startTime: new Date(),
      status: 'in_progress',
      performance: {
        accuracy: 0,
        speed: 0,
        safety: 0,
        overallScore: 0,
      },
      mistakes: [],
      completionPercentage: 0,
    };

    await this.db.execute(
      `INSERT INTO vr_training_sessions 
       (session_id, trainee_id, module_id, start_time, status)
       VALUES ($1, $2, $3, $4, 'in_progress')`,
      [sessionId, traineeId, moduleId, session.startTime]
    );

    this.logger.log(`VR training session started: ${sessionId} - ${module.title}`);

    return sessionId;
  }

  private async getTrainingModule(moduleId: string): Promise<VRTrainingModule | null> {
    const result = await this.db.execute(
      `SELECT * FROM vr_training_modules WHERE module_id = $1`,
      [moduleId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      moduleId: row.module_id,
      title: row.title,
      category: row.category,
      difficulty: row.difficulty,
      duration: row.duration,
      prerequisites: JSON.parse(row.prerequisites || '[]'),
      learningObjectives: JSON.parse(row.learning_objectives || '[]'),
      assessmentCriteria: JSON.parse(row.assessment_criteria || '[]'),
      scenarioUrl: row.scenario_url,
    };
  }

  async recordMistake(
    sessionId: string,
    mistakeType: string,
    severity: 'minor' | 'major' | 'critical',
    description: string
  ): Promise<void> {
    await this.db.execute(
      `INSERT INTO vr_training_mistakes 
       (session_id, mistake_type, severity, description, timestamp)
       VALUES ($1, $2, $3, $4, NOW())`,
      [sessionId, mistakeType, severity, description]
    );

    if (severity === 'critical') {
      this.logger.warn(`Critical mistake in VR training session ${sessionId}: ${description}`);
    }
  }

  async assessPerformance(sessionId: string): Promise<TrainingAssessment> {
    const session = await this.db.execute(
      `SELECT * FROM vr_training_sessions WHERE session_id = $1`,
      [sessionId]
    );

    if (session.rows.length === 0) {
      throw new Error('Session not found');
    }

    const mistakes = await this.db.execute(
      `SELECT * FROM vr_training_mistakes WHERE session_id = $1`,
      [sessionId]
    );

    const criticalMistakes = mistakes.rows.filter(m => m.severity === 'critical').length;
    const majorMistakes = mistakes.rows.filter(m => m.severity === 'major').length;
    const minorMistakes = mistakes.rows.filter(m => m.severity === 'minor').length;

    const accuracyScore = Math.max(0, 100 - (criticalMistakes * 20 + majorMistakes * 10 + minorMistakes * 5));
    const speedScore = 85;
    const safetyScore = Math.max(0, 100 - (criticalMistakes * 30 + majorMistakes * 15));

    const overallScore = (accuracyScore * 0.4 + speedScore * 0.3 + safetyScore * 0.3);
    const passed = overallScore >= 70 && criticalMistakes === 0;

    const feedback: string[] = [];

    if (criticalMistakes > 0) {
      feedback.push(`${criticalMistakes} kritik hata yapıldı - güvenlik prosedürlerini gözden geçirin`);
    }

    if (accuracyScore < 70) {
      feedback.push('Hassasiyet geliştirilmeli - daha fazla pratik yapın');
    }

    if (passed) {
      feedback.push('Başarılı! Modül tamamlandı');
    }

    const assessment: TrainingAssessment = {
      sessionId,
      traineeId: session.rows[0].trainee_id,
      moduleId: session.rows[0].module_id,
      scores: {
        accuracy: accuracyScore,
        speed: speedScore,
        safety: safetyScore,
      },
      overallScore,
      passed,
      feedback,
      certificationIssued: passed,
    };

    await this.db.execute(
      `INSERT INTO vr_training_assessments 
       (session_id, trainee_id, module_id, accuracy_score, speed_score, safety_score, overall_score, passed, assessed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [sessionId, assessment.traineeId, assessment.moduleId, accuracyScore, speedScore, safetyScore, overallScore, passed]
    );

    if (passed) {
      await this.issueCertificate(assessment.traineeId, assessment.moduleId);
    }

    return assessment;
  }

  private async issueCertificate(traineeId: string, moduleId: string): Promise<void> {
    const certId = `cert_${Date.now()}`;

    await this.db.execute(
      `INSERT INTO training_certificates 
       (certificate_id, trainee_id, module_id, issued_at, expires_at)
       VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '1 year')`,
      [certId, traineeId, moduleId]
    );

    this.logger.log(`Training certificate issued: ${certId} to trainee ${traineeId}`);
  }

  async getTrainingProgress(traineeId: string): Promise<any> {
    const completed = await this.db.execute(
      `SELECT COUNT(DISTINCT module_id) as count 
       FROM vr_training_sessions 
       WHERE trainee_id = $1 AND status = 'completed'`,
      [traineeId]
    );

    const certificates = await this.db.execute(
      `SELECT COUNT(*) as count 
       FROM training_certificates 
       WHERE trainee_id = $1 AND expires_at > NOW()`,
      [traineeId]
    );

    return {
      traineeId,
      completedModules: parseInt(completed.rows[0].count || '0'),
      activeCertificates: parseInt(certificates.rows[0].count || '0'),
    };
  }
}

