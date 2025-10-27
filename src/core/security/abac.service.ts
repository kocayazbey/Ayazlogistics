import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

interface ABACPolicy {
  id: string;
  name: string;
  description: string;
  effect: 'allow' | 'deny';
  subject: {
    attributes: Record<string, any>;
  };
  resource: {
    type: string;
    attributes: Record<string, any>;
  };
  action: string[];
  environment: {
    conditions: Array<{
      attribute: string;
      operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_in' | 'contains';
      value: any;
    }>;
  };
  priority: number;
  isActive: boolean;
}

interface AccessRequest {
  userId: string;
  userAttributes: Record<string, any>;
  resource: {
    type: string;
    id: string;
    attributes: Record<string, any>;
  };
  action: string;
  environment: {
    ipAddress: string;
    timestamp: Date;
    location?: string;
    deviceType?: string;
  };
}

interface AccessDecision {
  allowed: boolean;
  matchedPolicies: string[];
  reason: string;
  effect: 'allow' | 'deny';
  obligations?: string[];
}

@Injectable()
export class ABACService {
  private readonly logger = new Logger(ABACService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async evaluateAccess(request: AccessRequest): Promise<AccessDecision> {
    this.logger.log(`Evaluating ABAC policy for user ${request.userId} on ${request.resource.type}/${request.action}`);

    const policies = await this.getApplicablePolicies(request);

    if (policies.length === 0) {
      return {
        allowed: false,
        matchedPolicies: [],
        reason: 'No applicable policies found - default deny',
        effect: 'deny',
      };
    }

    const sortedPolicies = policies.sort((a, b) => b.priority - a.priority);

    for (const policy of sortedPolicies) {
      const matches = this.evaluatePolicy(policy, request);

      if (matches) {
        await this.logAccessDecision(request, policy.id, policy.effect);

        return {
          allowed: policy.effect === 'allow',
          matchedPolicies: [policy.id],
          reason: `Policy ${policy.name} matched`,
          effect: policy.effect,
        };
      }
    }

    return {
      allowed: false,
      matchedPolicies: [],
      reason: 'No policies matched - default deny',
      effect: 'deny',
    };
  }

  private async getApplicablePolicies(request: AccessRequest): Promise<ABACPolicy[]> {
    const result = await this.db.execute(
      `SELECT * FROM abac_policies 
       WHERE is_active = true 
       AND resource_type = $1
       AND action @> $2
       ORDER BY priority DESC`,
      [request.resource.type, JSON.stringify([request.action])]
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      effect: row.effect,
      subject: JSON.parse(row.subject || '{}'),
      resource: JSON.parse(row.resource || '{}'),
      action: JSON.parse(row.action || '[]'),
      environment: JSON.parse(row.environment || '{}'),
      priority: row.priority,
      isActive: row.is_active,
    }));
  }

  private evaluatePolicy(policy: ABACPolicy, request: AccessRequest): boolean {
    const subjectMatch = this.matchAttributes(policy.subject.attributes, request.userAttributes);
    if (!subjectMatch) return false;

    const resourceMatch = this.matchAttributes(policy.resource.attributes, request.resource.attributes);
    if (!resourceMatch) return false;

    const actionMatch = policy.action.includes(request.action) || policy.action.includes('*');
    if (!actionMatch) return false;

    const environmentMatch = this.evaluateConditions(policy.environment.conditions, request.environment);
    if (!environmentMatch) return false;

    return true;
  }

  private matchAttributes(policyAttrs: Record<string, any>, requestAttrs: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(policyAttrs)) {
      if (value === '*') continue;

      if (Array.isArray(value)) {
        if (!value.includes(requestAttrs[key])) return false;
      } else {
        if (requestAttrs[key] !== value) return false;
      }
    }

    return true;
  }

  private evaluateConditions(conditions: ABACPolicy['environment']['conditions'], environment: any): boolean {
    for (const condition of conditions) {
      const actualValue = environment[condition.attribute];

      switch (condition.operator) {
        case '==':
          if (actualValue !== condition.value) return false;
          break;
        case '!=':
          if (actualValue === condition.value) return false;
          break;
        case '>':
          if (!(actualValue > condition.value)) return false;
          break;
        case '<':
          if (!(actualValue < condition.value)) return false;
          break;
        case '>=':
          if (!(actualValue >= condition.value)) return false;
          break;
        case '<=':
          if (!(actualValue <= condition.value)) return false;
          break;
        case 'in':
          if (!Array.isArray(condition.value) || !condition.value.includes(actualValue)) return false;
          break;
        case 'not_in':
          if (Array.isArray(condition.value) && condition.value.includes(actualValue)) return false;
          break;
        case 'contains':
          if (typeof actualValue !== 'string' || !actualValue.includes(condition.value)) return false;
          break;
      }
    }

    return true;
  }

  private async logAccessDecision(request: AccessRequest, policyId: string, effect: string): Promise<void> {
    await this.db.execute(
      `INSERT INTO abac_access_logs 
       (user_id, resource_type, resource_id, action, policy_id, effect, ip_address, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [request.userId, request.resource.type, request.resource.id, request.action, policyId, effect, request.environment.ipAddress, request.environment.timestamp]
    );
  }

  async createPolicy(policy: Omit<ABACPolicy, 'id'>): Promise<string> {
    const id = `policy_${Date.now()}`;

    await this.db.execute(
      `INSERT INTO abac_policies 
       (id, name, description, effect, subject, resource, resource_type, action, environment, priority, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        policy.name,
        policy.description,
        policy.effect,
        JSON.stringify(policy.subject),
        JSON.stringify(policy.resource),
        policy.resource.type,
        JSON.stringify(policy.action),
        JSON.stringify(policy.environment),
        policy.priority,
        policy.isActive,
      ]
    );

    this.logger.log(`ABAC policy created: ${policy.name}`);

    return id;
  }

  async testPolicy(policyId: string, testRequests: AccessRequest[]): Promise<any[]> {
    const results = [];

    for (const request of testRequests) {
      const decision = await this.evaluateAccess(request);
      results.push({
        request: {
          userId: request.userId,
          resource: request.resource.type,
          action: request.action,
        },
        decision,
      });
    }

    return results;
  }
}

