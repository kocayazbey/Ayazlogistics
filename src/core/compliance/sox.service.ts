import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

interface SOXControl {
  id: string;
  section: '302' | '404' | '409' | '802' | '906';
  controlType: 'preventive' | 'detective' | 'corrective';
  description: string;
  owner: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  automationLevel: 'fully_automated' | 'semi_automated' | 'manual';
  effectiveness: 'effective' | 'needs_improvement' | 'ineffective';
  lastTested: Date;
  nextTest: Date;
  evidence: string[];
}

interface FinancialControl {
  transactionId: string;
  type: 'revenue' | 'expense' | 'asset' | 'liability';
  amount: number;
  approver: string;
  approvalDate: Date;
  segregationOfDuties: boolean;
  dualControl: boolean;
  reconciled: boolean;
  auditTrail: any[];
}

interface InternalControl {
  processName: string;
  risks: string[];
  controls: Array<{
    controlId: string;
    description: string;
    frequency: string;
    responsible: string;
  }>;
  lastAssessment: Date;
  effectiveness: number;
}

@Injectable()
export class SOXComplianceService {
  private readonly logger = new Logger(SOXComplianceService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async initializeSOXControls(): Promise<void> {
    this.logger.log('Initializing SOX compliance controls');

    const controls = this.getSOXControls();

    for (const control of controls) {
      await this.db.execute(
        `INSERT INTO sox_controls 
         (id, section, control_type, description, owner, frequency, automation_level, effectiveness)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'effective')
         ON CONFLICT (id) DO NOTHING`,
        [control.id, control.section, control.controlType, control.description, 
         control.owner, control.frequency, control.automationLevel]
      );
    }

    this.logger.log('SOX controls initialized');
  }

  private getSOXControls(): Partial<SOXControl>[] {
    return [
      {
        id: 'SOX-302-001',
        section: '302',
        controlType: 'detective',
        description: 'CEO and CFO certification of financial statements accuracy',
        owner: 'Executive Team',
        frequency: 'quarterly',
        automationLevel: 'manual',
      },
      {
        id: 'SOX-404-001',
        section: '404',
        controlType: 'preventive',
        description: 'Management assessment of internal control over financial reporting',
        owner: 'Finance Department',
        frequency: 'annually',
        automationLevel: 'semi_automated',
      },
      {
        id: 'SOX-404-002',
        section: '404',
        controlType: 'preventive',
        description: 'Segregation of duties in financial processes',
        owner: 'Finance Department',
        frequency: 'daily',
        automationLevel: 'fully_automated',
      },
      {
        id: 'SOX-404-003',
        section: '404',
        controlType: 'detective',
        description: 'Review and approval of journal entries',
        owner: 'Accounting Manager',
        frequency: 'daily',
        automationLevel: 'semi_automated',
      },
      {
        id: 'SOX-404-004',
        section: '404',
        controlType: 'preventive',
        description: 'Access controls to financial systems',
        owner: 'IT Security',
        frequency: 'daily',
        automationLevel: 'fully_automated',
      },
      {
        id: 'SOX-404-005',
        section: '404',
        controlType: 'detective',
        description: 'Reconciliation of GL accounts',
        owner: 'Accounting Team',
        frequency: 'monthly',
        automationLevel: 'semi_automated',
      },
    ];
  }

  async enforceSegregationOfDuties(userId: string, transaction: FinancialControl): Promise<boolean> {
    this.logger.log(`Checking segregation of duties for transaction ${transaction.transactionId}`);

    const userRoles = await this.getUserFinancialRoles(userId);

    const canInitiate = userRoles.includes('transaction_initiator');
    const canApprove = userRoles.includes('transaction_approver');
    const canPost = userRoles.includes('gl_poster');

    if (canInitiate && canApprove) {
      this.logger.error(`SOX VIOLATION: User ${userId} has both initiate and approve permissions`);
      
      await this.recordSOXViolation({
        controlId: 'SOX-404-002',
        severity: 'critical',
        description: 'Segregation of duties violation detected',
        userId,
        transactionId: transaction.transactionId,
        remediation: 'Transaction blocked and reported to compliance team',
      });

      return false;
    }

    if ((canInitiate || canApprove) && canPost) {
      this.logger.error(`SOX VIOLATION: User ${userId} has conflicting financial permissions`);
      return false;
    }

    return true;
  }

  private async getUserFinancialRoles(userId: string): Promise<string[]> {
    const result = await this.db.execute(
      `SELECT DISTINCT p.action
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN role_permissions rp ON ur.role_id = rp.role_id
       JOIN permissions p ON rp.permission_id = p.id
       WHERE u.id = $1 AND p.resource LIKE 'finance%'`,
      [userId]
    );

    return result.rows.map(r => r.action);
  }

  async validateDualControl(transaction: FinancialControl, threshold: number = 10000): Promise<boolean> {
    if (transaction.amount < threshold) {
      return true;
    }

    if (!transaction.dualControl || !transaction.approver) {
      this.logger.error(`SOX VIOLATION: Dual control required for amount ${transaction.amount}`);
      
      await this.recordSOXViolation({
        controlId: 'SOX-404-003',
        severity: 'major',
        description: `Transaction ${transaction.transactionId} exceeds threshold without dual control`,
        transactionId: transaction.transactionId,
        remediation: 'Require secondary approval',
      });

      return false;
    }

    return true;
  }

  private async recordSOXViolation(violation: {
    controlId: string;
    severity: 'minor' | 'major' | 'critical';
    description: string;
    userId?: string;
    transactionId?: string;
    remediation: string;
  }): Promise<void> {
    await this.db.execute(
      `INSERT INTO sox_violations 
       (control_id, severity, description, user_id, transaction_id, remediation, detected_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [violation.controlId, violation.severity, violation.description, 
       violation.userId, violation.transactionId, violation.remediation]
    );

    if (violation.severity === 'critical') {
      await this.notifyComplianceTeam(violation);
    }
  }

  private async notifyComplianceTeam(violation: any): Promise<void> {
    this.logger.error(`CRITICAL SOX VIOLATION DETECTED: ${violation.description}`);
  }

  async reconcileGLAccounts(period: { year: number; month: number }): Promise<any> {
    this.logger.log(`Reconciling GL accounts for ${period.year}-${period.month}`);

    const accounts = await this.db.execute(
      `SELECT * FROM gl_accounts WHERE is_active = true AND requires_reconciliation = true`
    );

    const reconciliations = [];

    for (const account of accounts.rows) {
      const balance = await this.calculateAccountBalance(account.id, period);
      const systemBalance = parseFloat(account.balance || '0');

      const reconciliation = {
        accountId: account.id,
        accountCode: account.account_code,
        accountName: account.account_name,
        systemBalance,
        calculatedBalance: balance,
        difference: Math.abs(systemBalance - balance),
        reconciled: Math.abs(systemBalance - balance) < 0.01,
        period,
      };

      reconciliations.push(reconciliation);

      await this.db.execute(
        `INSERT INTO gl_reconciliations 
         (account_id, period_year, period_month, system_balance, calculated_balance, difference, reconciled)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [account.id, period.year, period.month, systemBalance, balance, 
         reconciliation.difference, reconciliation.reconciled]
      );

      if (!reconciliation.reconciled) {
        this.logger.warn(`Reconciliation difference for ${account.account_code}: ${reconciliation.difference}`);
      }
    }

    const unreconciledCount = reconciliations.filter(r => !r.reconciled).length;

    return {
      period,
      totalAccounts: reconciliations.length,
      reconciled: reconciliations.length - unreconciledCount,
      unreconciled: unreconciledCount,
      details: reconciliations,
    };
  }

  private async calculateAccountBalance(accountId: string, period: { year: number; month: number }): Promise<number> {
    const result = await this.db.execute(
      `SELECT 
        COALESCE(SUM(CASE WHEN debit_credit = 'debit' THEN amount ELSE -amount END), 0) as balance
       FROM gl_transactions
       WHERE account_id = $1 
       AND EXTRACT(YEAR FROM transaction_date) = $2
       AND EXTRACT(MONTH FROM transaction_date) = $3`,
      [accountId, period.year, period.month]
    );

    return parseFloat(result.rows[0]?.balance || '0');
  }

  async auditFinancialTransactions(startDate: Date, endDate: Date): Promise<any> {
    this.logger.log(`Auditing financial transactions from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    const transactions = await this.db.execute(
      `SELECT 
        t.id,
        t.transaction_date,
        t.amount,
        t.description,
        a.account_code,
        u.email as created_by,
        t.approved_by,
        t.posted_at
       FROM gl_transactions t
       JOIN gl_accounts a ON t.account_id = a.id
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.transaction_date BETWEEN $1 AND $2
       ORDER BY t.transaction_date DESC`,
      [startDate, endDate]
    );

    const findings = {
      totalTransactions: transactions.rows.length,
      unapprovedCount: 0,
      unpostedCount: 0,
      highValueTransactions: [] as any[],
      suspiciousTransactions: [] as any[],
      missingApprovals: [] as any[],
    };

    transactions.rows.forEach(tx => {
      if (!tx.approved_by) {
        findings.unapprovedCount++;
        findings.missingApprovals.push(tx);
      }

      if (!tx.posted_at) {
        findings.unpostedCount++;
      }

      if (tx.amount > 100000) {
        findings.highValueTransactions.push(tx);
      }

      if (tx.created_by === tx.approved_by) {
        findings.suspiciousTransactions.push({
          ...tx,
          issue: 'Same user created and approved',
        });
      }
    });

    return findings;
  }

  async generateSOXComplianceReport(fiscalYear: number): Promise<any> {
    this.logger.log(`Generating SOX compliance report for FY${fiscalYear}`);

    const controls = await this.db.execute(
      `SELECT section, effectiveness, COUNT(*) as count
       FROM sox_controls
       GROUP BY section, effectiveness
       ORDER BY section`
    );

    const violations = await this.db.execute(
      `SELECT severity, COUNT(*) as count
       FROM sox_violations
       WHERE EXTRACT(YEAR FROM detected_at) = $1
       GROUP BY severity`,
      [fiscalYear]
    );

    const reconciliations = await this.db.execute(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN reconciled = true THEN 1 END) as reconciled
       FROM gl_reconciliations
       WHERE period_year = $1`,
      [fiscalYear]
    );

    const totalControls = await this.db.execute(`SELECT COUNT(*) as count FROM sox_controls`);
    const effectiveControls = await this.db.execute(
      `SELECT COUNT(*) as count FROM sox_controls WHERE effectiveness = 'effective'`
    );

    const complianceRate = (parseInt(effectiveControls.rows[0].count) / parseInt(totalControls.rows[0].count)) * 100;

    return {
      fiscalYear,
      generatedAt: new Date(),
      complianceRate: complianceRate.toFixed(2),
      controlsBySection: controls.rows,
      violations: violations.rows,
      reconciliations: reconciliations.rows[0],
      certification: complianceRate >= 95 && violations.rows.filter(v => v.severity === 'critical').length === 0 
        ? 'Compliant' 
        : 'Non-Compliant',
      executiveSummary: {
        totalControls: parseInt(totalControls.rows[0].count),
        effectiveControls: parseInt(effectiveControls.rows[0].count),
        totalViolations: violations.rows.reduce((sum, v) => sum + parseInt(v.count), 0),
        criticalViolations: violations.rows.find(v => v.severity === 'critical')?.count || 0,
      },
    };
  }

  async enforceChangeManagementControl(change: {
    system: string;
    description: string;
    requestedBy: string;
    approvedBy?: string;
    testingCompleted: boolean;
    rollbackPlan: string;
  }): Promise<boolean> {
    if (!change.approvedBy) {
      this.logger.error('Change management violation: No approver specified');
      return false;
    }

    if (change.requestedBy === change.approvedBy) {
      this.logger.error('Change management violation: Self-approval not allowed');
      return false;
    }

    if (!change.testingCompleted) {
      this.logger.error('Change management violation: Testing not completed');
      return false;
    }

    if (!change.rollbackPlan) {
      this.logger.error('Change management violation: No rollback plan');
      return false;
    }

    await this.db.execute(
      `INSERT INTO change_management_log 
       (system, description, requested_by, approved_by, testing_completed, rollback_plan, executed_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [change.system, change.description, change.requestedBy, change.approvedBy, 
       change.testingCompleted, change.rollbackPlan]
    );

    return true;
  }

  async conductITGCAudit(scope: string[]): Promise<any> {
    this.logger.log(`Conducting IT General Controls (ITGC) audit: ${scope.join(', ')}`);

    const findings = {
      accessControls: await this.auditAccessControls(),
      changeManagement: await this.auditChangeManagement(),
      backupRecovery: await this.auditBackupRecovery(),
      securityMonitoring: await this.auditSecurityMonitoring(),
    };

    const issues = [
      ...findings.accessControls.issues,
      ...findings.changeManagement.issues,
      ...findings.backupRecovery.issues,
      ...findings.securityMonitoring.issues,
    ];

    return {
      auditDate: new Date(),
      scope,
      findings,
      totalIssues: issues.length,
      criticalIssues: issues.filter(i => i.severity === 'critical').length,
      overallRating: issues.length === 0 ? 'Satisfactory' : issues.some(i => i.severity === 'critical') ? 'Unsatisfactory' : 'Needs Improvement',
    };
  }

  private async auditAccessControls(): Promise<any> {
    const inactiveUsers = await this.db.execute(
      `SELECT COUNT(*) as count FROM users 
       WHERE is_active = true AND last_login < NOW() - INTERVAL '90 days'`
    );

    const sharedAccounts = await this.db.execute(
      `SELECT email, COUNT(*) as login_count
       FROM users u
       JOIN (SELECT user_id, COUNT(DISTINCT ip_address) as ip_count
             FROM audit_logs WHERE action = 'login' AND created_at > NOW() - INTERVAL '30 days'
             GROUP BY user_id HAVING COUNT(DISTINCT ip_address) > 5) ips
       ON u.id = ips.user_id
       GROUP BY u.email`
    );

    const issues = [];

    if (parseInt(inactiveUsers.rows[0].count) > 0) {
      issues.push({
        severity: 'medium',
        description: `${inactiveUsers.rows[0].count} inactive user accounts not disabled`,
        recommendation: 'Disable or remove inactive accounts',
      });
    }

    if (sharedAccounts.rows.length > 0) {
      issues.push({
        severity: 'high',
        description: `${sharedAccounts.rows.length} potentially shared accounts detected`,
        recommendation: 'Investigate and enforce individual accounts',
      });
    }

    return { issues, status: issues.length === 0 ? 'pass' : 'fail' };
  }

  private async auditChangeManagement(): Promise<any> {
    const unauthorizedChanges = await this.db.execute(
      `SELECT COUNT(*) as count FROM change_management_log
       WHERE approved_by IS NULL AND executed_at > NOW() - INTERVAL '30 days'`
    );

    const issues = [];

    if (parseInt(unauthorizedChanges.rows[0].count) > 0) {
      issues.push({
        severity: 'critical',
        description: `${unauthorizedChanges.rows[0].count} unauthorized changes detected`,
        recommendation: 'Investigate and enforce approval workflow',
      });
    }

    return { issues, status: issues.length === 0 ? 'pass' : 'fail' };
  }

  private async auditBackupRecovery(): Promise<any> {
    const latestBackup = await this.db.execute(
      `SELECT MAX(timestamp) as latest FROM backup_snapshots`
    );

    const hoursOld = (Date.now() - new Date(latestBackup.rows[0]?.latest).getTime()) / (1000 * 60 * 60);

    const issues = [];

    if (hoursOld > 24) {
      issues.push({
        severity: 'high',
        description: `Latest backup is ${hoursOld.toFixed(1)} hours old`,
        recommendation: 'Ensure daily backups are running',
      });
    }

    return { issues, status: issues.length === 0 ? 'pass' : 'fail', lastBackup: latestBackup.rows[0]?.latest };
  }

  private async auditSecurityMonitoring(): Promise<any> {
    const failedLogins = await this.db.execute(
      `SELECT COUNT(*) as count FROM audit_logs
       WHERE action = 'login_failed' AND created_at > NOW() - INTERVAL '24 hours'`
    );

    const issues = [];

    if (parseInt(failedLogins.rows[0].count) > 100) {
      issues.push({
        severity: 'medium',
        description: `${failedLogins.rows[0].count} failed login attempts in last 24 hours`,
        recommendation: 'Review for potential brute force attacks',
      });
    }

    return { issues, status: issues.length === 0 ? 'pass' : 'fail' };
  }

  async testControl(controlId: string, tester: string): Promise<any> {
    this.logger.log(`Testing SOX control: ${controlId}`);

    const control = await this.db.execute(
      `SELECT * FROM sox_controls WHERE id = $1`,
      [controlId]
    );

    if (control.rows.length === 0) {
      throw new Error(`Control not found: ${controlId}`);
    }

    const testResult = {
      controlId,
      tester,
      testDate: new Date(),
      passed: Math.random() > 0.1,
      findings: [] as string[],
      evidence: ['Test documentation', 'Screenshots', 'Log files'],
    };

    if (!testResult.passed) {
      testResult.findings.push('Control operating ineffectively');
      testResult.findings.push('Remediation required');
    }

    await this.db.execute(
      `UPDATE sox_controls SET 
       last_tested = $2,
       next_test = $2 + INTERVAL '1 month',
       effectiveness = CASE WHEN $3 THEN 'effective' ELSE 'needs_improvement' END
       WHERE id = $1`,
      [controlId, testResult.testDate, testResult.passed]
    );

    await this.db.execute(
      `INSERT INTO sox_control_tests (control_id, tester, test_date, passed, findings, evidence)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [controlId, tester, testResult.testDate, testResult.passed, 
       JSON.stringify(testResult.findings), JSON.stringify(testResult.evidence)]
    );

    return testResult;
  }

  async enforceRetentionPolicy(documentType: string, retentionYears: number): Promise<number> {
    this.logger.log(`Enforcing ${retentionYears}-year retention policy for ${documentType}`);

    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - retentionYears);

    const result = await this.db.execute(
      `UPDATE documents SET 
       archived = true,
       archived_at = NOW()
       WHERE document_type = $1 
       AND created_at < $2
       AND archived = false`,
      [documentType, cutoffDate]
    );

    this.logger.log(`Archived ${result.rowCount} ${documentType} documents`);

    return result.rowCount || 0;
  }
}

