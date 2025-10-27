import { Injectable, Logger } from '@nestjs/common';
import {
  CodeQualityAnalyzer,
  RefactoringAnalyzer,
  DuplicationDetector,
  DeadCodeEliminator,
  MetricsCollector,
  calculateComplexity,
  hashCodeBlock,
  type RefactoringSuggestion,
  type CodeMetrics,
} from '../utils/code-quality';

@Injectable()
export class CodeQualityService {
  private readonly logger = new Logger(CodeQualityService.name);
  private refactoringAnalyzer = new RefactoringAnalyzer();
  private duplicationDetector = new DuplicationDetector();
  private deadCodeEliminator = new DeadCodeEliminator();
  private metricsCollector = new MetricsCollector();

  /**
   * Analyze code quality for a given function
   */
  analyzeFunction(functionName: string, functionBody: string): CodeMetrics {
    const complexity = calculateComplexity(functionBody);
    const linesOfCode = functionBody.split('\n').length;
    
    // Calculate maintainability index (simplified)
    const maintainabilityIndex = Math.max(
      0,
      100 - complexity * 2 - Math.log(linesOfCode) * 5
    );

    // Detect code smells
    const codeSmells = this.detectCodeSmells(functionBody);

    // Calculate technical debt (in hours)
    const technicalDebt = this.calculateTechnicalDebt(complexity, codeSmells);

    const metrics: CodeMetrics = {
      linesOfCode,
      cyclomaticComplexity: complexity,
      maintainabilityIndex,
      codeSmells,
      technicalDebt,
    };

    this.metricsCollector.addMetrics(functionName, metrics);

    // Mark complex functions
    if (complexity > 10) {
      CodeQualityAnalyzer.markComplexFunction(functionName, complexity);
      this.refactoringAnalyzer.addSuggestion({
        type: 'extract-method',
        location: functionName,
        description: `Function has high complexity (${complexity}). Consider breaking it down into smaller functions.`,
        severity: complexity > 20 ? 'high' : 'medium',
      });
    }

    return metrics;
  }

  /**
   * Detect code duplication
   */
  detectDuplication(codeBlock: string, location: string) {
    const hash = hashCodeBlock(codeBlock);
    this.duplicationDetector.addCodeBlock(hash, location);
  }

  /**
   * Get duplication report
   */
  getDuplicationReport() {
    const duplicates = this.duplicationDetector.getDuplicates();
    
    duplicates.forEach((dup) => {
      if (dup.locations.length > 1) {
        this.refactoringAnalyzer.addSuggestion({
          type: 'remove-duplication',
          location: dup.locations.join(', '),
          description: `Code duplication detected in ${dup.locations.length} locations`,
          severity: 'medium',
        });
      }
    });

    return duplicates;
  }

  /**
   * Mark code as dead
   */
  markDeadCode(identifier: string, reason: string) {
    this.deadCodeEliminator.markAsDead(identifier, reason);
    CodeQualityAnalyzer.markAsUnused(identifier);
  }

  /**
   * Get dead code report
   */
  getDeadCodeReport() {
    return this.deadCodeEliminator.getDeadCode();
  }

  /**
   * Get refactoring suggestions
   */
  getRefactoringSuggestions(): RefactoringSuggestion[] {
    return this.refactoringAnalyzer.getSuggestions();
  }

  /**
   * Get high priority refactoring suggestions
   */
  getHighPrioritySuggestions(): RefactoringSuggestion[] {
    return this.refactoringAnalyzer.getSuggestionsBySeverity('high');
  }

  /**
   * Get code quality metrics
   */
  getCodeQualityMetrics() {
    return {
      averageComplexity: this.metricsCollector.getAverageComplexity(),
      totalTechnicalDebt: this.metricsCollector.getTotalTechnicalDebt(),
      unusedCode: CodeQualityAnalyzer.getUnusedCode(),
      complexFunctions: CodeQualityAnalyzer.getComplexFunctions(),
      duplicates: this.duplicationDetector.getDuplicates().length,
      deadCode: this.deadCodeEliminator.getDeadCode().length,
      refactoringSuggestions: this.refactoringAnalyzer.getSuggestions().length,
    };
  }

  /**
   * Get comprehensive quality report
   */
  getQualityReport() {
    return {
      metrics: this.getCodeQualityMetrics(),
      suggestions: this.getRefactoringSuggestions(),
      deadCode: this.getDeadCodeReport(),
      duplicates: this.getDuplicationReport(),
      complexFunctions: CodeQualityAnalyzer.getComplexFunctions(),
    };
  }

  /**
   * Clear all analysis data
   */
  clearAnalysis() {
    CodeQualityAnalyzer.clearAnalysis();
    this.refactoringAnalyzer.clearSuggestions();
    this.duplicationDetector.clearDuplicates();
    this.deadCodeEliminator.clearDeadCode();
    this.metricsCollector.clearMetrics();
  }

  /**
   * Detect code smells in function body
   */
  private detectCodeSmells(functionBody: string): number {
    let smells = 0;

    // Long method
    if (functionBody.split('\n').length > 50) {
      smells++;
    }

    // Too many parameters (check function signature)
    const paramMatch = functionBody.match(/\(([^)]*)\)/);
    if (paramMatch && paramMatch[1].split(',').length > 5) {
      smells++;
    }

    // Nested conditionals
    const nestedIfMatch = functionBody.match(/if\s*\([^)]*\)\s*{[^}]*if\s*\(/g);
    if (nestedIfMatch && nestedIfMatch.length > 3) {
      smells++;
    }

    // Magic numbers
    const magicNumbers = functionBody.match(/\b\d{2,}\b/g);
    if (magicNumbers && magicNumbers.length > 5) {
      smells++;
    }

    // Commented out code
    const commentedCode = functionBody.match(/\/\/\s*[a-zA-Z]+/g);
    if (commentedCode && commentedCode.length > 10) {
      smells++;
    }

    return smells;
  }

  /**
   * Calculate technical debt in hours
   */
  private calculateTechnicalDebt(complexity: number, codeSmells: number): number {
    // Simplified calculation: each complexity point = 0.5 hours, each smell = 1 hour
    return complexity * 0.5 + codeSmells * 1;
  }
}
