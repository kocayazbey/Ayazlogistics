import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../events/event-bus.service';

interface DataPoint {
  id: string;
  timestamp: Date;
  type: 'sensor' | 'gps' | 'inventory' | 'order' | 'vehicle' | 'equipment' | 'weather' | 'traffic' | 'custom';
  source: string;
  features: number[];
  metadata: {
    quality: number; // 0-1
    reliability: number; // 0-1
    priority: 'low' | 'medium' | 'high' | 'urgent';
    processingTime: number; // milliseconds
    retryCount: number;
  };
  originalData: any;
}

interface Cluster {
  id: string;
  label: number; // -1 for noise, 0+ for clusters
  points: string[]; // Data point IDs
  centroid: number[];
  characteristics: {
    size: number;
    density: number;
    compactness: number;
    separation: number;
    stability: number;
  };
  metrics: {
    withinClusterSum: number;
    silhouetteScore: number;
    cohesion: number;
    separation: number;
    stability: number;
  };
  insights: {
    description: string;
    anomalies: string[];
    patterns: string[];
    recommendations: string[];
  };
}

interface Anomaly {
  id: string;
  pointId: string;
  type: 'outlier' | 'noise' | 'boundary' | 'density' | 'temporal' | 'spatial' | 'behavioral';
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-1
  description: string;
  features: number[];
  metadata: {
    detectionMethod: string;
    confidence: number;
    timestamp: Date;
    context: any;
  };
  recommendations: string[];
}

interface DBSCANResult {
  clusters: Cluster[];
  anomalies: Anomaly[];
  noise: DataPoint[];
  summary: {
    totalPoints: number;
    totalClusters: number;
    totalAnomalies: number;
    noisePoints: number;
    averageClusterSize: number;
    averageDensity: number;
    processingTime: number; // milliseconds
  };
  performance: {
    silhouetteScore: number;
    calinskiHarabaszScore: number;
    daviesBouldinScore: number;
    inertia: number;
    stability: number;
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

interface DBSCANConfig {
  algorithm: 'dbscan' | 'hdbscan' | 'optics' | 'denclue';
  eps: number; // Maximum distance between two samples
  minPts: number; // Minimum number of samples in a neighborhood
  distanceMetric: 'euclidean' | 'manhattan' | 'cosine' | 'mahalanobis' | 'minkowski';
  normalization: 'none' | 'minmax' | 'zscore' | 'robust';
  features: string[];
  weights: { [feature: string]: number };
  anomalyDetection: {
    enabled: boolean;
    threshold: number;
    methods: string[];
  };
  clustering: {
    enabled: boolean;
    minClusterSize: number;
    maxClusterSize: number;
  };
}

@Injectable()
export class DBSCANClusteringService {
  private readonly logger = new Logger(DBSCANClusteringService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async performAnomalyDetection(
    dataPoints: DataPoint[],
    config: DBSCANConfig,
    options: {
      includeRealTime: boolean;
      includeValidation: boolean;
      includeOptimization: boolean;
      includeVisualization: boolean;
      includeInsights: boolean;
      maxIterations: number;
      tolerance: number;
    },
  ): Promise<DBSCANResult> {
    this.logger.log(`Performing DBSCAN anomaly detection for ${dataPoints.length} data points`);

    const startTime = Date.now();
    
    // Extract and normalize features
    const features = this.extractFeatures(dataPoints, config);
    const normalizedFeatures = this.normalizeFeatures(features, config.normalization);
    
    // Perform DBSCAN clustering
    const labels = this.performDBSCAN(normalizedFeatures, config);
    
    // Create clusters
    const clusters = this.createClusters(dataPoints, labels, normalizedFeatures, config);
    
    // Detect anomalies
    const anomalies = this.detectAnomalies(dataPoints, labels, normalizedFeatures, config);
    
    // Identify noise points
    const noise = this.identifyNoisePoints(dataPoints, labels);
    
    // Calculate performance metrics
    const performance = this.calculatePerformanceMetrics(normalizedFeatures, labels, clusters, config);
    
    // Calculate summary
    const processingTime = Date.now() - startTime;
    const summary = {
      totalPoints: dataPoints.length,
      totalClusters: clusters.length,
      totalAnomalies: anomalies.length,
      noisePoints: noise.length,
      averageClusterSize: clusters.length > 0 ? dataPoints.length / clusters.length : 0,
      averageDensity: this.calculateAverageDensity(clusters),
      processingTime,
    };
    
    const recommendations = this.generateRecommendations(clusters, anomalies, performance, config);
    
    const result: DBSCANResult = {
      clusters,
      anomalies,
      noise,
      summary,
      performance,
      recommendations,
    };

    await this.saveDBSCANResult(result);
    await this.eventBus.emit('dbscan.anomaly.detection.completed', { result });

    return result;
  }

  private extractFeatures(dataPoints: DataPoint[], config: DBSCANConfig): number[][] {
    const features: number[][] = [];
    
    for (const point of dataPoints) {
      const featureVector: number[] = [];
      
      for (const feature of config.features) {
        let value = 0;
        
        switch (feature) {
          case 'timestamp':
            value = point.timestamp.getTime();
            break;
          case 'quality':
            value = point.metadata.quality;
            break;
          case 'reliability':
            value = point.metadata.reliability;
            break;
          case 'processingTime':
            value = point.metadata.processingTime;
            break;
          case 'retryCount':
            value = point.metadata.retryCount;
            break;
          case 'priority':
            value = this.encodePriority(point.metadata.priority);
            break;
          case 'type':
            value = this.encodeType(point.type);
            break;
          case 'source':
            value = this.encodeSource(point.source);
            break;
          default:
            // Use custom features from the point
            if (point.features && point.features.length > 0) {
              const featureIndex = config.features.indexOf(feature);
              if (featureIndex >= 0 && featureIndex < point.features.length) {
                value = point.features[featureIndex];
              }
            }
        }
        
        featureVector.push(value);
      }
      
      features.push(featureVector);
    }
    
    return features;
  }

  private encodePriority(priority: string): number {
    const priorities = { low: 0, medium: 1, high: 2, urgent: 3 };
    return priorities[priority] || 0;
  }

  private encodeType(type: string): number {
    const types = {
      'sensor': 0, 'gps': 1, 'inventory': 2, 'order': 3, 'vehicle': 4,
      'equipment': 5, 'weather': 6, 'traffic': 7, 'custom': 8
    };
    return types[type] || 8;
  }

  private encodeSource(source: string): number {
    // Simple hash-based encoding
    let hash = 0;
    for (let i = 0; i < source.length; i++) {
      const char = source.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 1000;
  }

  private normalizeFeatures(features: number[][], method: string): number[][] {
    if (method === 'none') return features;
    
    const normalized: number[][] = [];
    const numFeatures = features[0].length;
    
    for (let i = 0; i < numFeatures; i++) {
      const column = features.map(row => row[i]);
      const normalizedColumn = this.normalizeColumn(column, method);
      
      for (let j = 0; j < features.length; j++) {
        if (!normalized[j]) normalized[j] = [];
        normalized[j][i] = normalizedColumn[j];
      }
    }
    
    return normalized;
  }

  private normalizeColumn(column: number[], method: string): number[] {
    switch (method) {
      case 'minmax':
        const min = Math.min(...column);
        const max = Math.max(...column);
        return column.map(value => (value - min) / (max - min));
        
      case 'zscore':
        const mean = column.reduce((sum, val) => sum + val, 0) / column.length;
        const std = Math.sqrt(column.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / column.length);
        return column.map(value => (value - mean) / std);
        
      case 'robust':
        const median = this.median(column);
        const mad = this.median(column.map(val => Math.abs(val - median)));
        return column.map(value => (value - median) / mad);
        
      default:
        return column;
    }
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private performDBSCAN(features: number[][], config: DBSCANConfig): number[] {
    const labels: number[] = new Array(features.length).fill(-1);
    let clusterId = 0;
    
    for (let i = 0; i < features.length; i++) {
      if (labels[i] !== -1) continue; // Already processed
      
      // Find neighbors
      const neighbors = this.findNeighbors(features, i, config.eps, config.distanceMetric);
      
      if (neighbors.length < config.minPts) {
        labels[i] = -1; // Noise point
        continue;
      }
      
      // Start new cluster
      labels[i] = clusterId;
      const seeds = [...neighbors];
      
      // Expand cluster
      let seedIndex = 0;
      while (seedIndex < seeds.length) {
        const currentPoint = seeds[seedIndex];
        
        if (labels[currentPoint] === -1) {
          labels[currentPoint] = clusterId;
        } else if (labels[currentPoint] === -2) {
          labels[currentPoint] = clusterId;
        }
        
        if (labels[currentPoint] !== -1) {
          seedIndex++;
          continue;
        }
        
        labels[currentPoint] = clusterId;
        const currentNeighbors = this.findNeighbors(features, currentPoint, config.eps, config.distanceMetric);
        
        if (currentNeighbors.length >= config.minPts) {
          seeds.push(...currentNeighbors);
        }
        
        seedIndex++;
      }
      
      clusterId++;
    }
    
    return labels;
  }

  private findNeighbors(features: number[][], pointIndex: number, eps: number, distanceMetric: string): number[] {
    const neighbors: number[] = [];
    const point = features[pointIndex];
    
    for (let i = 0; i < features.length; i++) {
      if (i === pointIndex) continue;
      
      const distance = this.calculateDistance(point, features[i], distanceMetric);
      if (distance <= eps) {
        neighbors.push(i);
      }
    }
    
    return neighbors;
  }

  private calculateDistance(point1: number[], point2: number[], metric: string): number {
    switch (metric) {
      case 'euclidean':
        return Math.sqrt(point1.reduce((sum, val, i) => sum + Math.pow(val - point2[i], 2), 0));
        
      case 'manhattan':
        return point1.reduce((sum, val, i) => sum + Math.abs(val - point2[i]), 0);
        
      case 'cosine':
        const dotProduct = point1.reduce((sum, val, i) => sum + val * point2[i], 0);
        const magnitude1 = Math.sqrt(point1.reduce((sum, val) => sum + val * val, 0));
        const magnitude2 = Math.sqrt(point2.reduce((sum, val) => sum + val * val, 0));
        return 1 - (dotProduct / (magnitude1 * magnitude2));
        
      case 'mahalanobis':
        // Simplified Mahalanobis distance (would need covariance matrix in real implementation)
        return Math.sqrt(point1.reduce((sum, val, i) => sum + Math.pow(val - point2[i], 2), 0));
        
      case 'minkowski':
        const p = 2; // Default p value for Minkowski distance
        return Math.pow(point1.reduce((sum, val, i) => sum + Math.pow(Math.abs(val - point2[i]), p), 0), 1/p);
        
      default:
        return Math.sqrt(point1.reduce((sum, val, i) => sum + Math.pow(val - point2[i], 2), 0));
    }
  }

  private createClusters(
    dataPoints: DataPoint[],
    labels: number[],
    features: number[][],
    config: DBSCANConfig,
  ): Cluster[] {
    const clusters: Cluster[] = [];
    const clusterMap = new Map<number, number[]>();
    
    // Group points by cluster
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      if (label === -1) continue; // Skip noise points
      
      if (!clusterMap.has(label)) {
        clusterMap.set(label, []);
      }
      clusterMap.get(label)!.push(i);
    }
    
    // Create cluster objects
    for (const [label, pointIndices] of clusterMap) {
      const clusterPoints = pointIndices.map(i => dataPoints[i]);
      const clusterFeatures = pointIndices.map(i => features[i]);
      
      const centroid = this.calculateCentroid(clusterFeatures);
      const characteristics = this.calculateClusterCharacteristics(clusterFeatures, centroid);
      const metrics = this.calculateClusterMetrics(clusterFeatures, centroid);
      const insights = this.generateClusterInsights(clusterPoints, characteristics);
      
      const cluster: Cluster = {
        id: `cluster_${label}`,
        label,
        points: clusterPoints.map(p => p.id),
        centroid,
        characteristics,
        metrics,
        insights,
      };
      
      clusters.push(cluster);
    }
    
    return clusters;
  }

  private calculateCentroid(features: number[][]): number[] {
    const numFeatures = features[0].length;
    const centroid: number[] = [];
    
    for (let i = 0; i < numFeatures; i++) {
      const sum = features.reduce((sum, point) => sum + point[i], 0);
      centroid.push(sum / features.length);
    }
    
    return centroid;
  }

  private calculateClusterCharacteristics(features: number[][], centroid: number[]): any {
    const size = features.length;
    const density = this.calculateDensity(features, centroid);
    const compactness = this.calculateCompactness(features, centroid);
    const separation = this.calculateSeparation(features, centroid);
    const stability = this.calculateStability(features, centroid);
    
    return {
      size,
      density,
      compactness,
      separation,
      stability,
    };
  }

  private calculateDensity(features: number[][], centroid: number[]): number {
    let totalDistance = 0;
    
    for (const point of features) {
      const distance = this.calculateDistance(point, centroid, 'euclidean');
      totalDistance += distance;
    }
    
    return features.length / (totalDistance + 1);
  }

  private calculateCompactness(features: number[][], centroid: number[]): number {
    let totalDistance = 0;
    
    for (const point of features) {
      const distance = this.calculateDistance(point, centroid, 'euclidean');
      totalDistance += distance * distance;
    }
    
    return totalDistance / features.length;
  }

  private calculateSeparation(features: number[][], centroid: number[]): number {
    // Simplified separation calculation
    // In a real implementation, this would compare with other clusters
    return 1.0;
  }

  private calculateStability(features: number[][], centroid: number[]): number {
    // Simplified stability calculation
    // In a real implementation, this would involve temporal analysis
    return 0.8;
  }

  private calculateClusterMetrics(features: number[][], centroid: number[]): any {
    const withinClusterSum = this.calculateWithinClusterSum(features, centroid);
    const silhouetteScore = this.calculateSilhouetteScore(features, centroid);
    const cohesion = this.calculateCohesion(features, centroid);
    const separation = this.calculateSeparation(features, centroid);
    const stability = this.calculateStability(features, centroid);
    
    return {
      withinClusterSum,
      silhouetteScore,
      cohesion,
      separation,
      stability,
    };
  }

  private calculateWithinClusterSum(features: number[][], centroid: number[]): number {
    let sum = 0;
    
    for (const point of features) {
      const distance = this.calculateDistance(point, centroid, 'euclidean');
      sum += distance * distance;
    }
    
    return sum;
  }

  private calculateSilhouetteScore(features: number[][], centroid: number[]): number {
    if (features.length <= 1) return 0;
    
    let totalSilhouette = 0;
    
    for (const point of features) {
      // Calculate average distance within cluster
      let withinClusterDistance = 0;
      for (const otherPoint of features) {
        if (point !== otherPoint) {
          withinClusterDistance += this.calculateDistance(point, otherPoint, 'euclidean');
        }
      }
      withinClusterDistance /= (features.length - 1);
      
      // Calculate average distance to nearest other cluster
      // Simplified: use distance to centroid
      const betweenClusterDistance = this.calculateDistance(point, centroid, 'euclidean');
      
      // Calculate silhouette score
      const silhouette = (betweenClusterDistance - withinClusterDistance) / 
                       Math.max(withinClusterDistance, betweenClusterDistance);
      totalSilhouette += silhouette;
    }
    
    return totalSilhouette / features.length;
  }

  private calculateCohesion(features: number[][], centroid: number[]): number {
    let totalDistance = 0;
    
    for (const point of features) {
      const distance = this.calculateDistance(point, centroid, 'euclidean');
      totalDistance += distance;
    }
    
    return totalDistance / features.length;
  }

  private generateClusterInsights(points: DataPoint[], characteristics: any): any {
    const insights = {
      description: '',
      anomalies: [],
      patterns: [],
      recommendations: [],
    };
    
    // Generate description
    insights.description = `Cluster with ${characteristics.size} points, ` +
      `density ${characteristics.density.toFixed(3)}, ` +
      `compactness ${characteristics.compactness.toFixed(3)}`;
    
    // Generate patterns
    if (characteristics.density > 0.5) {
      insights.patterns.push('High density cluster - points are closely grouped');
    } else if (characteristics.density < 0.1) {
      insights.patterns.push('Low density cluster - points are widely scattered');
    }
    
    if (characteristics.compactness < 0.5) {
      insights.patterns.push('Compact cluster - points are tightly packed');
    } else if (characteristics.compactness > 2.0) {
      insights.patterns.push('Loose cluster - points are spread out');
    }
    
    // Generate recommendations
    if (characteristics.density > 0.5) {
      insights.recommendations.push('High density cluster - consider data aggregation');
    }
    
    if (characteristics.compactness < 0.5) {
      insights.recommendations.push('Compact cluster - good for pattern recognition');
    }
    
    return insights;
  }

  private detectAnomalies(
    dataPoints: DataPoint[],
    labels: number[],
    features: number[][],
    config: DBSCANConfig,
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    if (!config.anomalyDetection.enabled) return anomalies;
    
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      const point = dataPoints[i];
      const feature = features[i];
      
      // Check if point is noise (anomaly)
      if (label === -1) {
        const anomaly = this.createAnomaly(point, feature, 'noise', 'high', config);
        anomalies.push(anomaly);
        continue;
      }
      
      // Check for other types of anomalies
      const anomalyScore = this.calculateAnomalyScore(feature, features, labels, config);
      
      if (anomalyScore > config.anomalyDetection.threshold) {
        const anomaly = this.createAnomaly(point, feature, 'outlier', 'medium', config);
        anomalies.push(anomaly);
      }
    }
    
    return anomalies;
  }

  private createAnomaly(
    point: DataPoint,
    feature: number[],
    type: string,
    severity: string,
    config: DBSCANConfig,
  ): Anomaly {
    const anomaly: Anomaly = {
      id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pointId: point.id,
      type: type as any,
      severity: severity as any,
      score: 0.8, // Simplified score
      description: `Anomaly detected in ${point.type} data from ${point.source}`,
      features: feature,
      metadata: {
        detectionMethod: 'DBSCAN',
        confidence: 0.8,
        timestamp: new Date(),
        context: {
          originalData: point.originalData,
          processingTime: point.metadata.processingTime,
          quality: point.metadata.quality,
        },
      },
      recommendations: this.generateAnomalyRecommendations(type, severity),
    };
    
    return anomaly;
  }

  private calculateAnomalyScore(
    feature: number[],
    allFeatures: number[][],
    labels: number[],
    config: DBSCANConfig,
  ): number {
    // Simplified anomaly score calculation
    // In a real implementation, this would use more sophisticated methods
    
    let score = 0;
    
    // Calculate distance to nearest neighbor
    let minDistance = Infinity;
    for (let i = 0; i < allFeatures.length; i++) {
      if (feature !== allFeatures[i]) {
        const distance = this.calculateDistance(feature, allFeatures[i], config.distanceMetric);
        if (distance < minDistance) {
          minDistance = distance;
        }
      }
    }
    
    // Normalize distance to score
    score = Math.min(1, minDistance / 10); // Simplified normalization
    
    return score;
  }

  private generateAnomalyRecommendations(type: string, severity: string): string[] {
    const recommendations: string[] = [];
    
    switch (type) {
      case 'noise':
        recommendations.push('Investigate data quality and source');
        recommendations.push('Consider data filtering or preprocessing');
        break;
      case 'outlier':
        recommendations.push('Review data for errors or special cases');
        recommendations.push('Consider if outlier represents valid data');
        break;
      case 'boundary':
        recommendations.push('Check if point is on cluster boundary');
        recommendations.push('Consider adjusting clustering parameters');
        break;
      case 'density':
        recommendations.push('Investigate density variations in data');
        recommendations.push('Consider adaptive clustering parameters');
        break;
      case 'temporal':
        recommendations.push('Check for temporal patterns in anomalies');
        recommendations.push('Consider time-based clustering');
        break;
      case 'spatial':
        recommendations.push('Check for spatial patterns in anomalies');
        recommendations.push('Consider location-based clustering');
        break;
      case 'behavioral':
        recommendations.push('Investigate behavioral patterns');
        recommendations.push('Consider behavior-based clustering');
        break;
    }
    
    if (severity === 'high' || severity === 'critical') {
      recommendations.push('Immediate investigation required');
      recommendations.push('Consider automated alerting');
    }
    
    return recommendations;
  }

  private identifyNoisePoints(dataPoints: DataPoint[], labels: number[]): DataPoint[] {
    const noise: DataPoint[] = [];
    
    for (let i = 0; i < labels.length; i++) {
      if (labels[i] === -1) {
        noise.push(dataPoints[i]);
      }
    }
    
    return noise;
  }

  private calculatePerformanceMetrics(
    features: number[][],
    labels: number[],
    clusters: Cluster[],
    config: DBSCANConfig,
  ): any {
    const silhouetteScore = this.calculateAverageSilhouetteScore(features, labels, clusters);
    const calinskiHarabaszScore = this.calculateCalinskiHarabaszScore(features, labels, clusters);
    const daviesBouldinScore = this.calculateDaviesBouldinScore(features, labels, clusters);
    const inertia = this.calculateTotalInertia(features, labels, clusters);
    const stability = this.calculateOverallStability(clusters);
    
    return {
      silhouetteScore,
      calinskiHarabaszScore,
      daviesBouldinScore,
      inertia,
      stability,
    };
  }

  private calculateAverageSilhouetteScore(features: number[][], labels: number[], clusters: Cluster[]): number {
    if (clusters.length === 0) return 0;
    
    let totalSilhouette = 0;
    
    for (const cluster of clusters) {
      totalSilhouette += cluster.metrics.silhouetteScore;
    }
    
    return totalSilhouette / clusters.length;
  }

  private calculateCalinskiHarabaszScore(features: number[][], labels: number[], clusters: Cluster[]): number {
    if (clusters.length <= 1) return 0;
    
    const n = features.length;
    const k = clusters.length;
    
    // Calculate overall centroid
    const overallCentroid = this.calculateOverallCentroid(features);
    
    // Calculate between-cluster sum of squares
    let betweenClusterSum = 0;
    for (const cluster of clusters) {
      const distance = this.calculateDistance(cluster.centroid, overallCentroid, 'euclidean');
      betweenClusterSum += cluster.points.length * distance * distance;
    }
    
    // Calculate within-cluster sum of squares
    let withinClusterSum = 0;
    for (const cluster of clusters) {
      withinClusterSum += cluster.metrics.withinClusterSum;
    }
    
    return (betweenClusterSum / (k - 1)) / (withinClusterSum / (n - k));
  }

  private calculateDaviesBouldinScore(features: number[][], labels: number[], clusters: Cluster[]): number {
    if (clusters.length <= 1) return 0;
    
    let totalScore = 0;
    
    for (const cluster of clusters) {
      let maxRatio = 0;
      
      for (const otherCluster of clusters) {
        if (cluster.id !== otherCluster.id) {
          const distance = this.calculateDistance(cluster.centroid, otherCluster.centroid, 'euclidean');
          const ratio = (cluster.metrics.cohesion + otherCluster.metrics.cohesion) / distance;
          
          if (ratio > maxRatio) {
            maxRatio = ratio;
          }
        }
      }
      
      totalScore += maxRatio;
    }
    
    return totalScore / clusters.length;
  }

  private calculateTotalInertia(features: number[][], labels: number[], clusters: Cluster[]): number {
    let totalInertia = 0;
    
    for (const cluster of clusters) {
      totalInertia += cluster.metrics.withinClusterSum;
    }
    
    return totalInertia;
  }

  private calculateOverallStability(clusters: Cluster[]): number {
    if (clusters.length === 0) return 0;
    
    let totalStability = 0;
    
    for (const cluster of clusters) {
      totalStability += cluster.metrics.stability;
    }
    
    return totalStability / clusters.length;
  }

  private calculateOverallCentroid(features: number[][]): number[] {
    const numFeatures = features[0].length;
    const centroid: number[] = [];
    
    for (let i = 0; i < numFeatures; i++) {
      const sum = features.reduce((sum, point) => sum + point[i], 0);
      centroid.push(sum / features.length);
    }
    
    return centroid;
  }

  private calculateAverageDensity(clusters: Cluster[]): number {
    if (clusters.length === 0) return 0;
    
    let totalDensity = 0;
    
    for (const cluster of clusters) {
      totalDensity += cluster.characteristics.density;
    }
    
    return totalDensity / clusters.length;
  }

  private generateRecommendations(
    clusters: Cluster[],
    anomalies: Anomaly[],
    performance: any,
    config: DBSCANConfig,
  ): any {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    
    if (performance.silhouetteScore < 0.5) {
      immediate.push('Low silhouette score - consider adjusting DBSCAN parameters');
    }
    
    if (performance.calinskiHarabaszScore < 100) {
      immediate.push('Low Calinski-Harabasz score - clusters may not be well separated');
    }
    
    if (performance.daviesBouldinScore > 2) {
      immediate.push('High Davies-Bouldin score - clusters may be too similar');
    }
    
    if (anomalies.length > 0) {
      immediate.push(`${anomalies.length} anomalies detected - investigate immediately`);
    }
    
    shortTerm.push('Implement anomaly detection monitoring');
    shortTerm.push('Develop cluster-specific data processing');
    shortTerm.push('Create automated anomaly alerting');
    
    longTerm.push('Build predictive anomaly detection models');
    longTerm.push('Develop adaptive clustering system');
    longTerm.push('Create real-time anomaly detection pipeline');
    
    return { immediate, shortTerm, longTerm };
  }

  private async saveDBSCANResult(result: DBSCANResult): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO dbscan_anomaly_detection_results 
        (total_points, total_clusters, total_anomalies, noise_points, 
         average_cluster_size, average_density, processing_time, silhouette_score, 
         calinski_harabasz_score, davies_bouldin_score, inertia, stability, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      `, [
        result.summary.totalPoints,
        result.summary.totalClusters,
        result.summary.totalAnomalies,
        result.summary.noisePoints,
        result.summary.averageClusterSize,
        result.summary.averageDensity,
        result.summary.processingTime,
        result.performance.silhouetteScore,
        result.performance.calinskiHarabaszScore,
        result.performance.daviesBouldinScore,
        result.performance.inertia,
        result.performance.stability,
      ]);
    } catch (error) {
      this.logger.error('Failed to save DBSCAN anomaly detection result:', error);
    }
  }
}

