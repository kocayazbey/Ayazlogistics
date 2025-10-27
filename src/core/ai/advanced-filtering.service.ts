import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql, and, or, eq, ne, gt, lt, gte, lte, like, inArray, notInArray } from 'drizzle-orm';
import * as tf from '@tensorflow/tfjs-node';
import Redis from 'ioredis';

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'in' | 'nin' | 'regex' | 'exists' | 'between';
  value: any;
  type?: 'string' | 'number' | 'date' | 'boolean' | 'array';
  caseSensitive?: boolean;
}

export interface FilterGroup {
  type: 'and' | 'or' | 'not';
  conditions: (FilterCondition | FilterGroup)[];
}

export interface QueryRequest {
  table: string;
  filters?: FilterGroup;
  fields?: string[];
  groupBy?: string[];
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  offset?: number;
  aggregations?: Aggregation[];
  timeRange?: {
    start: Date;
    end: Date;
    field: string;
  };
  geoFilter?: GeoFilter;
  textSearch?: TextSearch;
}

export interface Aggregation {
  type: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'stddev' | 'variance' | 'percentile';
  field: string;
  alias?: string;
  parameters?: Record<string, any>;
}

export interface GeoFilter {
  type: 'circle' | 'polygon' | 'bbox';
  coordinates: number[][] | number[][][];
  field: string;
  operation: 'within' | 'intersects' | 'contains';
}

export interface TextSearch {
  query: string;
  fields: string[];
  fuzzy?: boolean;
  boost?: Record<string, number>;
}

export interface QueryResult {
  data: any[];
  aggregations: Record<string, any>;
  totalCount: number;
  filteredCount: number;
  executionTime: number;
  metadata: {
    table: string;
    filters: number;
    aggregations: number;
    query: string;
  };
}

export interface AnalyticsInsight {
  id: string;
  type: 'trend' | 'pattern' | 'anomaly' | 'correlation' | 'segmentation' | 'forecast';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  data: any;
  recommendations: string[];
  timestamp: Date;
  expiresAt?: Date;
}

@Injectable()
export class AdvancedFilteringService {
  private readonly logger = new Logger(AdvancedFilteringService.name);
  private queryCache: Map<string, { result: QueryResult; timestamp: Date }> = new Map();
  private insights: AnalyticsInsight[] = [];
  private redis: Redis;
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });
  }

  async executeQuery(request: QueryRequest): Promise<QueryResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(request);

    // Check cache first
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp.getTime() < this.cacheExpiry) {
      this.logger.debug(`Cache hit for query: ${cacheKey}`);
      return { ...cached.result, executionTime: Date.now() - startTime };
    }

    try {
      this.logger.log(`Executing advanced query on table: ${request.table}`);

      // Build SQL query
      let query = this.buildSQLQuery(request);

      // Execute query
      const result = await this.db.execute(query);

      // Process results
      const processedResult = this.processResults(result, request);

      // Calculate aggregations
      const aggregations = await this.calculateAggregations(request, result);

      const queryResult: QueryResult = {
        data: processedResult.data,
        aggregations,
        totalCount: processedResult.totalCount,
        filteredCount: processedResult.filteredCount,
        executionTime: Date.now() - startTime,
        metadata: {
          table: request.table,
          filters: this.countFilters(request.filters),
          aggregations: request.aggregations?.length || 0,
          query: query.toString(),
        },
      };

      // Cache result
      this.queryCache.set(cacheKey, { result: queryResult, timestamp: new Date() });

      // Clean old cache entries
      this.cleanCache();

      this.logger.log(`Query completed in ${queryResult.executionTime}ms`);
      return queryResult;

    } catch (error) {
      this.logger.error(`Query execution failed:`, error);
      throw error;
    }
  }

  private buildSQLQuery(request: QueryRequest): any {
    let query = sql`SELECT `;

    // Select fields
    if (request.fields && request.fields.length > 0) {
      query = query`${sql.raw(request.fields.join(', '))}`;
    } else {
      query = query`*`;
    }

    // From table
    query = query` FROM ${sql.raw(request.table)}`;

    // Apply filters
    if (request.filters) {
      const whereClause = this.buildWhereClause(request.filters);
      if (whereClause) {
        query = query` WHERE ${whereClause}`;
      }
    }

    // Time range filter
    if (request.timeRange) {
      const timeField = request.timeRange.field || 'created_at';
      query = query` AND ${sql.raw(timeField)} BETWEEN ${request.timeRange.start} AND ${request.timeRange.end}`;
    }

    // Group by
    if (request.groupBy && request.groupBy.length > 0) {
      query = query` GROUP BY ${sql.raw(request.groupBy.join(', '))}`;
    }

    // Order by
    if (request.orderBy && request.orderBy.length > 0) {
      const orderClause = request.orderBy
        .map(order => `${order.field} ${order.direction.toUpperCase()}`)
        .join(', ');
      query = query` ORDER BY ${sql.raw(orderClause)}`;
    }

    // Limit and offset
    if (request.limit) {
      query = query` LIMIT ${request.limit}`;
    }
    if (request.offset) {
      query = query` OFFSET ${request.offset}`;
    }

    return query;
  }

  private buildWhereClause(filterGroup: FilterGroup): any | null {
    if (filterGroup.conditions.length === 0) return null;

    const conditions = filterGroup.conditions.map(condition => {
      if (this.isFilterGroup(condition)) {
        return this.buildWhereClause(condition);
      } else {
        return this.buildConditionClause(condition as FilterCondition);
      }
    }).filter(Boolean);

    if (conditions.length === 0) return null;

    switch (filterGroup.type) {
      case 'and':
        return conditions.length === 1 ? conditions[0] : and(...conditions);
      case 'or':
        return conditions.length === 1 ? conditions[0] : or(...conditions);
      case 'not':
        return conditions.length === 1 ? sql`NOT ${conditions[0]}` : sql`NOT (${and(...conditions)})`;
      default:
        return conditions[0];
    }
  }

  private buildConditionClause(condition: FilterCondition): any {
    const field = sql.raw(condition.field);

    switch (condition.operator) {
      case 'eq':
        return eq(field, condition.value);
      case 'ne':
        return ne(field, condition.value);
      case 'gt':
        return gt(field, condition.value);
      case 'lt':
        return lt(field, condition.value);
      case 'gte':
        return gte(field, condition.value);
      case 'lte':
        return lte(field, condition.value);
      case 'like':
        return like(field, `%${condition.value}%`);
      case 'in':
        return inArray(field, condition.value);
      case 'nin':
        return notInArray(field, condition.value);
      case 'regex':
        return sql`${field} ~ ${condition.value}`;
      case 'exists':
        return sql`${field} IS NOT NULL`;
      case 'between':
        return and(gte(field, condition.value[0]), lte(field, condition.value[1]));
      default:
        return eq(field, condition.value);
    }
  }

  private isFilterGroup(condition: FilterCondition | FilterGroup): condition is FilterGroup {
    return 'type' in condition && 'conditions' in condition;
  }

  private async calculateAggregations(request: QueryRequest, result: any[]): Promise<Record<string, any>> {
    const aggregations: Record<string, any> = {};

    if (!request.aggregations) return aggregations;

    for (const agg of request.aggregations) {
      const alias = agg.alias || `${agg.type}_${agg.field}`;

      switch (agg.type) {
        case 'count':
          aggregations[alias] = result.length;
          break;
        case 'sum':
          aggregations[alias] = result.reduce((sum, row) => sum + (parseFloat(row[agg.field]) || 0), 0);
          break;
        case 'avg':
          const values = result.map(row => parseFloat(row[agg.field])).filter(v => !isNaN(v));
          aggregations[alias] = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
          break;
        case 'min':
          const minValues = result.map(row => parseFloat(row[agg.field])).filter(v => !isNaN(v));
          aggregations[alias] = minValues.length > 0 ? Math.min(...minValues) : null;
          break;
        case 'max':
          const maxValues = result.map(row => parseFloat(row[agg.field])).filter(v => !isNaN(v));
          aggregations[alias] = maxValues.length > 0 ? Math.max(...maxValues) : null;
          break;
        case 'stddev':
          const avg = aggregations[alias.replace('stddev', 'avg')] || 0;
          const variance = result.reduce((sum, row) => {
            const val = parseFloat(row[agg.field]);
            return sum + (isNaN(val) ? 0 : Math.pow(val - avg, 2));
          }, 0) / result.length;
          aggregations[alias] = Math.sqrt(variance);
          break;
        case 'percentile':
          const sortedValues = result
            .map(row => parseFloat(row[agg.field]))
            .filter(v => !isNaN(v))
            .sort((a, b) => a - b);
          const percentile = agg.parameters?.percentile || 50;
          const index = (percentile / 100) * (sortedValues.length - 1);
          aggregations[alias] = sortedValues[Math.round(index)];
          break;
      }
    }

    return aggregations;
  }

  private processResults(result: any[], request: QueryRequest): { data: any[]; totalCount: number; filteredCount: number } {
    let processedData = result;

    // Apply geo filtering
    if (request.geoFilter) {
      processedData = this.applyGeoFilter(processedData, request.geoFilter);
    }

    // Apply text search
    if (request.textSearch) {
      processedData = this.applyTextSearch(processedData, request.textSearch);
    }

    // Apply ML-based filtering
    processedData = this.applyMLFiltering(processedData, request);

    return {
      data: processedData,
      totalCount: result.length,
      filteredCount: processedData.length,
    };
  }

  private applyGeoFilter(data: any[], geoFilter: GeoFilter): any[] {
    return data.filter(row => {
      const location = this.getNestedValue(row, geoFilter.field);
      if (!location || !location.lat || !location.lng) return false;

      switch (geoFilter.type) {
        case 'circle':
          return this.isPointInCircle(location, geoFilter.coordinates[0]);
        case 'polygon':
          return this.isPointInPolygon(location, geoFilter.coordinates[0]);
        case 'bbox':
          return this.isPointInBBox(location, geoFilter.coordinates[0]);
        default:
          return false;
      }
    });
  }

  private applyTextSearch(data: any[], textSearch: TextSearch): any[] {
    const searchTerms = textSearch.query.toLowerCase().split(' ');

    return data.filter(row => {
      for (const field of textSearch.fields) {
        const value = this.getNestedValue(row, field);
        if (typeof value === 'string') {
          const fieldValue = value.toLowerCase();

          if (textSearch.fuzzy) {
            // Fuzzy search implementation
            const matches = searchTerms.some(term =>
              this.fuzzyMatch(fieldValue, term, 0.8)
            );
            if (matches) return true;
          } else {
            // Exact search
            const matches = searchTerms.some(term =>
              fieldValue.includes(term)
            );
            if (matches) return true;
          }
        }
      }
      return false;
    });
  }

  private applyMLFiltering(data: any[], request: QueryRequest): any[] {
    // Apply machine learning-based filtering (anomaly detection, clustering, etc.)
    // This could use pre-trained models to filter data based on patterns

    return data; // Placeholder implementation
  }

  private isPointInCircle(point: { lat: number; lng: number }, center: number[]): boolean {
    const [centerLat, centerLng, radius] = center;
    const distance = this.calculateDistance(point.lat, point.lng, centerLat, centerLng);
    return distance <= radius;
  }

  private isPointInPolygon(point: { lat: number; lng: number }, polygon: number[][]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];

      if (((yi > point.lng) !== (yj > point.lng)) &&
          (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  private isPointInBBox(point: { lat: number; lng: number }, bbox: number[]): boolean {
    const [minLng, minLat, maxLng, maxLat] = bbox;
    return point.lng >= minLng && point.lng <= maxLng &&
           point.lat >= minLat && point.lat <= maxLat;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private fuzzyMatch(text: string, pattern: string, threshold: number): boolean {
    // Simple fuzzy matching implementation
    const distance = this.levenshteinDistance(text, pattern);
    const maxLength = Math.max(text.length, pattern.length);
    return maxLength > 0 ? (1 - distance / maxLength) >= threshold : false;
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[b.length][a.length];
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private countFilters(filterGroup?: FilterGroup): number {
    if (!filterGroup) return 0;

    return filterGroup.conditions.reduce((count, condition) => {
      if (this.isFilterGroup(condition)) {
        return count + this.countFilters(condition);
      } else {
        return count + 1;
      }
    }, 0);
  }

  private generateCacheKey(request: QueryRequest): string {
    return `query:${request.table}:${JSON.stringify(request).replace(/\s+/g, '')}`;
  }

  private cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp.getTime() > this.cacheExpiry) {
        this.queryCache.delete(key);
      }
    }
  }

  // Advanced Analytics Methods
  async generateInsights(query: QueryRequest): Promise<AnalyticsInsight[]> {
    this.logger.log(`Generating insights for query: ${query.table}`);

    const result = await this.executeQuery(query);
    const insights: AnalyticsInsight[] = [];

    // Trend analysis
    if (query.timeRange) {
      const trendInsight = await this.analyzeTrends(result.data, query);
      if (trendInsight) insights.push(trendInsight);
    }

    // Pattern recognition
    const patternInsight = await this.recognizePatterns(result.data, query);
    if (patternInsight) insights.push(patternInsight);

    // Anomaly detection
    const anomalyInsight = await this.detectAnomalies(result.data, query);
    if (anomalyInsight) insights.push(anomalyInsight);

    // Correlation analysis
    const correlationInsight = await this.analyzeCorrelations(result.data, query);
    if (correlationInsight) insights.push(correlationInsight);

    // Segmentation analysis
    const segmentationInsight = await this.analyzeSegmentation(result.data, query);
    if (segmentationInsight) insights.push(segmentationInsight);

    // Store insights
    this.insights.push(...insights);

    // Clean old insights
    this.cleanInsights();

    return insights;
  }

  private async analyzeTrends(data: any[], query: QueryRequest): Promise<AnalyticsInsight | null> {
    if (data.length < 10) return null;

    // Simple trend analysis based on time series data
    const timeField = query.timeRange?.field || 'created_at';
    const sortedData = data.sort((a, b) => new Date(a[timeField]).getTime() - new Date(b[timeField]).getTime());

    // Calculate trend using linear regression
    const x = sortedData.map((_, i) => i);
    const y = sortedData.map(row => parseFloat(row.value) || 0);

    const trend = this.calculateLinearTrend(x, y);

    if (Math.abs(trend.slope) < 0.1) return null; // No significant trend

    return {
      id: `trend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'trend',
      title: `Trend Detected in ${query.table}`,
      description: `Data shows a ${trend.slope > 0 ? 'positive' : 'negative'} trend with slope ${trend.slope.toFixed(4)}`,
      confidence: trend.rSquared,
      impact: Math.abs(trend.slope) > 1 ? 'high' : 'medium',
      data: trend,
      recommendations: trend.slope > 0
        ? ['Monitor for continued growth', 'Consider scaling operations', 'Prepare for increased demand']
        : ['Investigate declining metrics', 'Implement corrective measures', 'Review business strategy'],
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };
  }

  private async recognizePatterns(data: any[], query: QueryRequest): Promise<AnalyticsInsight | null> {
    // Pattern recognition using clustering or frequency analysis
    // This is a simplified implementation

    if (data.length < 5) return null;

    // Find most common patterns in categorical data
    const patterns = new Map<string, number>();

    for (const row of data) {
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'string' && value.length < 50) {
          patterns.set(value, (patterns.get(value) || 0) + 1);
        }
      }
    }

    // Find most frequent pattern
    let maxCount = 0;
    let mostFrequent = '';

    for (const [pattern, count] of patterns.entries()) {
      if (count > maxCount && count > data.length * 0.1) { // At least 10% frequency
        maxCount = count;
        mostFrequent = pattern;
      }
    }

    if (maxCount === 0) return null;

    return {
      id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'pattern',
      title: `Pattern Detected in ${query.table}`,
      description: `Most frequent pattern: "${mostFrequent}" appears ${maxCount} times (${((maxCount / data.length) * 100).toFixed(1)}%)`,
      confidence: maxCount / data.length,
      impact: maxCount / data.length > 0.5 ? 'high' : 'medium',
      data: { pattern: mostFrequent, frequency: maxCount, percentage: (maxCount / data.length) * 100 },
      recommendations: [
        'Investigate why this pattern is so common',
        'Consider if this pattern represents optimal behavior',
        'Look for ways to replicate successful patterns'
      ],
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
    };
  }

  private async detectAnomalies(data: any[], query: QueryRequest): Promise<AnalyticsInsight | null> {
    // Anomaly detection using statistical methods
    if (data.length < 20) return null;

    const values = data.map(row => parseFloat(row.value)).filter(v => !isNaN(v));

    if (values.length < 10) return null;

    // Calculate statistical measures
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Find outliers using 3-sigma rule
    const outliers = values.filter(v => Math.abs(v - mean) > 3 * stdDev);

    if (outliers.length === 0) return null;

    return {
      id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'anomaly',
      title: `Anomalies Detected in ${query.table}`,
      description: `${outliers.length} anomalies found using 3-sigma rule. Values deviate significantly from mean ${mean.toFixed(2)}`,
      confidence: 0.9,
      impact: outliers.length > data.length * 0.1 ? 'critical' : 'high',
      data: {
        outlierCount: outliers.length,
        mean,
        stdDev,
        outliers: outliers.slice(0, 10), // Top 10 outliers
        threshold: mean + 3 * stdDev,
      },
      recommendations: [
        'Investigate the cause of these anomalies',
        'Check data quality and sensor calibration',
        'Consider adjusting anomaly detection thresholds',
        'Review recent changes in operations'
      ],
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
    };
  }

  private async analyzeCorrelations(data: any[], query: QueryRequest): Promise<AnalyticsInsight | null> {
    // Correlation analysis between different fields
    if (data.length < 10) return null;

    // Find numeric fields
    const numericFields: string[] = [];
    const sample = data[0];

    for (const [key, value] of Object.entries(sample)) {
      if (typeof value === 'number') {
        numericFields.push(key);
      }
    }

    if (numericFields.length < 2) return null;

    // Calculate correlations
    const correlations: Array<{ field1: string; field2: string; correlation: number }> = [];

    for (let i = 0; i < numericFields.length; i++) {
      for (let j = i + 1; j < numericFields.length; j++) {
        const field1 = numericFields[i];
        const field2 = numericFields[j];

        const values1 = data.map(row => parseFloat(row[field1])).filter(v => !isNaN(v));
        const values2 = data.map(row => parseFloat(row[field2])).filter(v => !isNaN(v));

        if (values1.length === values2.length && values1.length > 5) {
          const correlation = this.calculateCorrelation(values1, values2);
          if (Math.abs(correlation) > 0.7) { // Strong correlation
            correlations.push({ field1, field2, correlation });
          }
        }
      }
    }

    if (correlations.length === 0) return null;

    // Find strongest correlation
    const strongest = correlations.reduce((max, curr) =>
      Math.abs(curr.correlation) > Math.abs(max.correlation) ? curr : max
    );

    return {
      id: `correlation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'correlation',
      title: `Strong Correlation Detected in ${query.table}`,
      description: `Strong ${strongest.correlation > 0 ? 'positive' : 'negative'} correlation (${strongest.correlation.toFixed(3)}) between ${strongest.field1} and ${strongest.field2}`,
      confidence: Math.abs(strongest.correlation),
      impact: Math.abs(strongest.correlation) > 0.9 ? 'critical' : 'high',
      data: { correlations },
      recommendations: [
        'Investigate causal relationship between correlated fields',
        'Consider using one field as predictor for the other',
        'Review if correlation indicates underlying business process'
      ],
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
    };
  }

  private async analyzeSegmentation(data: any[], query: QueryRequest): Promise<AnalyticsInsight | null> {
    // Customer/segment analysis using clustering concepts
    if (data.length < 20) return null;

    // Simple segmentation based on value ranges
    const values = data.map(row => parseFloat(row.value)).filter(v => !isNaN(v));
    const sortedValues = values.sort((a, b) => a - b);

    // Create segments (quartiles)
    const q1 = sortedValues[Math.floor(sortedValues.length * 0.25)];
    const q2 = sortedValues[Math.floor(sortedValues.length * 0.5)];
    const q3 = sortedValues[Math.floor(sortedValues.length * 0.75)];

    const segments = [
      { name: 'Low', min: sortedValues[0], max: q1, count: values.filter(v => v <= q1).length },
      { name: 'Medium-Low', min: q1, max: q2, count: values.filter(v => v > q1 && v <= q2).length },
      { name: 'Medium-High', min: q2, max: q3, count: values.filter(v => v > q2 && v <= q3).length },
      { name: 'High', min: q3, max: sortedValues[sortedValues.length - 1], count: values.filter(v => v > q3).length },
    ];

    const unevenDistribution = segments.some(s => s.count < data.length * 0.1) ||
                              segments.some(s => s.count > data.length * 0.4);

    if (!unevenDistribution) return null;

    return {
      id: `segmentation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'segmentation',
      title: `Uneven Distribution Detected in ${query.table}`,
      description: `Data shows uneven distribution across value segments. Consider reviewing business processes or data collection methods.`,
      confidence: 0.8,
      impact: 'medium',
      data: { segments },
      recommendations: [
        'Review data collection processes for bias',
        'Consider implementing stratified sampling',
        'Investigate business reasons for uneven distribution'
      ],
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 16 * 60 * 60 * 1000), // 16 hours
    };
  }

  private calculateLinearTrend(x: number[], y: number[]): { slope: number; intercept: number; rSquared: number } {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const ssResidual = y.reduce((sum, val, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(val - predicted, 2);
    }, 0);

    const rSquared = 1 - (ssResidual / ssTotal);

    return { slope, intercept, rSquared };
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private cleanInsights(): void {
    const now = Date.now();
    this.insights = this.insights.filter(insight =>
      !insight.expiresAt || insight.expiresAt.getTime() > now
    );
  }

  // Public API methods
  async getInsights(type?: AnalyticsInsight['type'], limit: number = 20): Promise<AnalyticsInsight[]> {
    let filtered = this.insights;

    if (type) {
      filtered = filtered.filter(insight => insight.type === type);
    }

    return filtered
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async createInsight(insight: Omit<AnalyticsInsight, 'id' | 'timestamp'>): Promise<string> {
    const id = `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newInsight: AnalyticsInsight = {
      id,
      ...insight,
      timestamp: new Date(),
    };

    this.insights.push(newInsight);
    this.logger.log(`Insight created: ${id} (${insight.type})`);

    return id;
  }

  async clearCache(): Promise<void> {
    this.queryCache.clear();
    this.logger.log('Query cache cleared');
  }

  async getCacheStats(): Promise<{
    entries: number;
    hitRate: number;
    totalQueries: number;
    averageExecutionTime: number;
  }> {
    return {
      entries: this.queryCache.size,
      hitRate: 0.85, // Placeholder
      totalQueries: this.queryCache.size * 10, // Placeholder
      averageExecutionTime: 150, // ms
    };
  }
}
