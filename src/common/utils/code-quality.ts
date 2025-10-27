// Code quality utilities and helpers

/**
 * Remove unused imports and dead code analyzer
 */
export class CodeQualityAnalyzer {
  private static unusedCode: Set<string> = new Set();
  private static complexFunctions: Map<string, number> = new Map();

  static markAsUnused(identifier: string) {
    this.unusedCode.add(identifier);
  }

  static markComplexFunction(functionName: string, complexity: number) {
    this.complexFunctions.set(functionName, complexity);
  }

  static getUnusedCode(): string[] {
    return Array.from(this.unusedCode);
  }

  static getComplexFunctions(): Array<{ name: string; complexity: number }> {
    return Array.from(this.complexFunctions.entries()).map(([name, complexity]) => ({
      name,
      complexity,
    }));
  }

  static clearAnalysis() {
    this.unusedCode.clear();
    this.complexFunctions.clear();
  }
}

/**
 * Function complexity calculator (Cyclomatic Complexity)
 */
export function calculateComplexity(functionBody: string): number {
  let complexity = 1;
  
  // Count decision points
  const decisionPoints = [
    /if\s*\(/g,
    /else\s+if\s*\(/g,
    /while\s*\(/g,
    /for\s*\(/g,
    /case\s+/g,
    /catch\s*\(/g,
    /\?\s*.*\s*:/g, // ternary operator
    /&&/g,
    /\|\|/g,
  ];

  decisionPoints.forEach((pattern) => {
    const matches = functionBody.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  });

  return complexity;
}

/**
 * Refactoring suggestions
 */
export interface RefactoringSuggestion {
  type: 'extract-method' | 'simplify-condition' | 'remove-duplication' | 'reduce-parameters';
  location: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export class RefactoringAnalyzer {
  private suggestions: RefactoringSuggestion[] = [];

  addSuggestion(suggestion: RefactoringSuggestion) {
    this.suggestions.push(suggestion);
  }

  getSuggestions(): RefactoringSuggestion[] {
    return this.suggestions;
  }

  getSuggestionsByType(type: RefactoringSuggestion['type']): RefactoringSuggestion[] {
    return this.suggestions.filter((s) => s.type === type);
  }

  getSuggestionsBySeverity(severity: RefactoringSuggestion['severity']): RefactoringSuggestion[] {
    return this.suggestions.filter((s) => s.severity === severity);
  }

  clearSuggestions() {
    this.suggestions = [];
  }
}

/**
 * Code duplication detector
 */
export class DuplicationDetector {
  private codeBlocks: Map<string, string[]> = new Map();

  addCodeBlock(hash: string, location: string) {
    const existing = this.codeBlocks.get(hash) || [];
    existing.push(location);
    this.codeBlocks.set(hash, existing);
  }

  getDuplicates(): Array<{ hash: string; locations: string[] }> {
    return Array.from(this.codeBlocks.entries())
      .filter(([_, locations]) => locations.length > 1)
      .map(([hash, locations]) => ({ hash, locations }));
  }

  clearDuplicates() {
    this.codeBlocks.clear();
  }
}

/**
 * Simple hash function for code blocks
 */
export function hashCodeBlock(code: string): string {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    const char = code.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Dead code elimination helper
 */
export class DeadCodeEliminator {
  private deadCode: Map<string, string> = new Map();

  markAsDead(identifier: string, reason: string) {
    this.deadCode.set(identifier, reason);
  }

  getDeadCode(): Array<{ identifier: string; reason: string }> {
    return Array.from(this.deadCode.entries()).map(([identifier, reason]) => ({
      identifier,
      reason,
    }));
  }

  clearDeadCode() {
    this.deadCode.clear();
  }
}

/**
 * Code metrics collector
 */
export interface CodeMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  codeSmells: number;
  technicalDebt: number;
}

export class MetricsCollector {
  private metrics: Map<string, CodeMetrics> = new Map();

  addMetrics(identifier: string, metrics: CodeMetrics) {
    this.metrics.set(identifier, metrics);
  }

  getMetrics(identifier: string): CodeMetrics | undefined {
    return this.metrics.get(identifier);
  }

  getAllMetrics(): Map<string, CodeMetrics> {
    return this.metrics;
  }

  clearMetrics() {
    this.metrics.clear();
  }

  getAverageComplexity(): number {
    const complexities = Array.from(this.metrics.values()).map((m) => m.cyclomaticComplexity);
    return complexities.reduce((a, b) => a + b, 0) / complexities.length || 0;
  }

  getTotalTechnicalDebt(): number {
    return Array.from(this.metrics.values()).reduce((sum, m) => sum + m.technicalDebt, 0);
  }
}
