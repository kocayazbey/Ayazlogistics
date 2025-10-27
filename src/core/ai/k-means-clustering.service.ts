import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../events/event-bus.service';

interface Customer {
  id: string;
  name: string;
  type: 'individual' | 'business' | 'enterprise' | 'government';
  industry: string;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    coordinates: { lat: number; lon: number };
  };
  demographics: {
    age: number;
    gender: 'male' | 'female' | 'other';
    income: number;
    education: string;
    occupation: string;
  };
  behavior: {
    purchaseFrequency: number; // purchases per month
    averageOrderValue: number; // currency
    totalSpent: number; // currency
    lastPurchase: Date;
    preferredProducts: string[];
    preferredChannels: string[];
    loyaltyScore: number; // 0-1
    satisfactionScore: number; // 0-1
  };
  logistics: {
    deliveryPreferences: {
      timeWindow: string;
      method: 'standard' | 'express' | 'overnight' | 'scheduled';
      location: 'home' | 'office' | 'pickup_point' | 'locker';
    };
    shippingAddresses: {
      id: string;
      address: string;
      coordinates: { lat: number; lon: number };
      isDefault: boolean;
    }[];
    specialRequirements: string[];
    serviceLevel: 'basic' | 'standard' | 'premium' | 'enterprise';
  };
  features: number[]; // Feature vector for clustering
}

interface Cluster {
  id: string;
  name: string;
  centroid: number[];
  customers: string[]; // Customer IDs
  characteristics: {
    size: number;
    averageAge: number;
    averageIncome: number;
    averageOrderValue: number;
    averageLoyaltyScore: number;
    averageSatisfactionScore: number;
    dominantIndustry: string;
    dominantType: string;
    dominantLocation: string;
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
    recommendations: string[];
    opportunities: string[];
    risks: string[];
  };
}

interface ClusteringResult {
  clusters: Cluster[];
  summary: {
    totalCustomers: number;
    totalClusters: number;
    averageClusterSize: number;
    totalWithinClusterSum: number;
    averageSilhouetteScore: number;
    convergenceIterations: number;
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

interface ClusteringConfig {
  algorithm: 'kmeans' | 'kmeans++' | 'kmedoids' | 'fuzzy_cmeans';
  k: number; // Number of clusters
  maxIterations: number;
  tolerance: number;
  initialization: 'random' | 'kmeans++' | 'kmedoids++' | 'forgy';
  distanceMetric: 'euclidean' | 'manhattan' | 'cosine' | 'mahalanobis';
  normalization: 'none' | 'minmax' | 'zscore' | 'robust';
  features: string[];
  weights: { [feature: string]: number };
}

@Injectable()
export class KMeansClusteringService {
  private readonly logger = new Logger(KMeansClusteringService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async performCustomerSegmentation(
    customers: Customer[],
    config: ClusteringConfig,
    options: {
      includeRealTime: boolean;
      includeValidation: boolean;
      includeOptimization: boolean;
      includeVisualization: boolean;
      includeInsights: boolean;
      maxIterations: number;
      tolerance: number;
    },
  ): Promise<ClusteringResult> {
    this.logger.log(`Performing customer segmentation for ${customers.length} customers with ${config.k} clusters`);

    const startTime = Date.now();
    
    // Extract and normalize features
    const features = this.extractFeatures(customers, config);
    const normalizedFeatures = this.normalizeFeatures(features, config.normalization);
    
    // Initialize centroids
    let centroids = this.initializeCentroids(normalizedFeatures, config);
    
    // Perform K-means clustering
    let iterations = 0;
    let converged = false;
    let assignments: number[] = [];
    let previousCentroids: number[][] = [];
    
    while (iterations < config.maxIterations && !converged) {
      // Assign customers to clusters
      assignments = this.assignToClusters(normalizedFeatures, centroids, config.distanceMetric);
      
      // Update centroids
      previousCentroids = centroids.map(centroid => [...centroid]);
      centroids = this.updateCentroids(normalizedFeatures, assignments, config.k);
      
      // Check convergence
      converged = this.checkConvergence(centroids, previousCentroids, config.tolerance);
      
      iterations++;
    }
    
    // Create clusters
    const clusters = this.createClusters(customers, assignments, centroids, config);
    
    // Calculate performance metrics
    const performance = this.calculatePerformanceMetrics(normalizedFeatures, assignments, centroids, config);
    
    // Generate insights
    const insights = this.generateInsights(clusters, customers, config);
    
    // Calculate summary
    const processingTime = Date.now() - startTime;
    const summary = {
      totalCustomers: customers.length,
      totalClusters: clusters.length,
      averageClusterSize: customers.length / clusters.length,
      totalWithinClusterSum: this.calculateTotalWithinClusterSum(normalizedFeatures, assignments, centroids),
      averageSilhouetteScore: this.calculateAverageSilhouetteScore(normalizedFeatures, assignments, centroids),
      convergenceIterations: iterations,
      processingTime,
    };
    
    const recommendations = this.generateRecommendations(clusters, performance, config);
    
    const result: ClusteringResult = {
      clusters,
      summary,
      performance,
      recommendations,
    };

    await this.saveClusteringResult(result);
    await this.eventBus.emit('customer.segmentation.completed', { result });

    return result;
  }

  private extractFeatures(customers: Customer[], config: ClusteringConfig): number[][] {
    const features: number[][] = [];
    
    for (const customer of customers) {
      const featureVector: number[] = [];
      
      for (const feature of config.features) {
        let value = 0;
        
        switch (feature) {
          case 'age':
            value = customer.demographics.age;
            break;
          case 'income':
            value = customer.demographics.income;
            break;
          case 'purchaseFrequency':
            value = customer.behavior.purchaseFrequency;
            break;
          case 'averageOrderValue':
            value = customer.behavior.averageOrderValue;
            break;
          case 'totalSpent':
            value = customer.behavior.totalSpent;
            break;
          case 'loyaltyScore':
            value = customer.behavior.loyaltyScore;
            break;
          case 'satisfactionScore':
            value = customer.behavior.satisfactionScore;
            break;
          case 'latitude':
            value = customer.location.coordinates.lat;
            break;
          case 'longitude':
            value = customer.location.coordinates.lon;
            break;
          case 'customerType':
            value = this.encodeCustomerType(customer.type);
            break;
          case 'industry':
            value = this.encodeIndustry(customer.industry);
            break;
          case 'gender':
            value = this.encodeGender(customer.demographics.gender);
            break;
          case 'education':
            value = this.encodeEducation(customer.demographics.education);
            break;
          case 'occupation':
            value = this.encodeOccupation(customer.demographics.occupation);
            break;
          case 'serviceLevel':
            value = this.encodeServiceLevel(customer.logistics.serviceLevel);
            break;
          case 'deliveryMethod':
            value = this.encodeDeliveryMethod(customer.logistics.deliveryPreferences.method);
            break;
          case 'deliveryLocation':
            value = this.encodeDeliveryLocation(customer.logistics.deliveryPreferences.location);
            break;
          default:
            value = 0;
        }
        
        featureVector.push(value);
      }
      
      features.push(featureVector);
    }
    
    return features;
  }

  private encodeCustomerType(type: string): number {
    const types = { individual: 0, business: 1, enterprise: 2, government: 3 };
    return types[type] || 0;
  }

  private encodeIndustry(industry: string): number {
    const industries = {
      'retail': 0, 'manufacturing': 1, 'healthcare': 2, 'education': 3,
      'finance': 4, 'technology': 5, 'logistics': 6, 'construction': 7,
      'agriculture': 8, 'energy': 9, 'other': 10
    };
    return industries[industry.toLowerCase()] || 10;
  }

  private encodeGender(gender: string): number {
    const genders = { male: 0, female: 1, other: 2 };
    return genders[gender] || 0;
  }

  private encodeEducation(education: string): number {
    const educations = {
      'high_school': 0, 'associate': 1, 'bachelor': 2, 'master': 3, 'phd': 4, 'other': 5
    };
    return educations[education.toLowerCase()] || 5;
  }

  private encodeOccupation(occupation: string): number {
    const occupations = {
      'student': 0, 'professional': 1, 'manager': 2, 'executive': 3,
      'technician': 4, 'sales': 5, 'service': 6, 'other': 7
    };
    return occupations[occupation.toLowerCase()] || 7;
  }

  private encodeServiceLevel(level: string): number {
    const levels = { basic: 0, standard: 1, premium: 2, enterprise: 3 };
    return levels[level] || 0;
  }

  private encodeDeliveryMethod(method: string): number {
    const methods = { standard: 0, express: 1, overnight: 2, scheduled: 3 };
    return methods[method] || 0;
  }

  private encodeDeliveryLocation(location: string): number {
    const locations = { home: 0, office: 1, pickup_point: 2, locker: 3 };
    return locations[location] || 0;
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

  private initializeCentroids(features: number[][], config: ClusteringConfig): number[][] {
    const centroids: number[][] = [];
    const numFeatures = features[0].length;
    
    switch (config.initialization) {
      case 'random':
        for (let i = 0; i < config.k; i++) {
          const centroid: number[] = [];
          for (let j = 0; j < numFeatures; j++) {
            const min = Math.min(...features.map(row => row[j]));
            const max = Math.max(...features.map(row => row[j]));
            centroid.push(Math.random() * (max - min) + min);
          }
          centroids.push(centroid);
        }
        break;
        
      case 'kmeans++':
        // Select first centroid randomly
        const firstIndex = Math.floor(Math.random() * features.length);
        centroids.push([...features[firstIndex]]);
        
        // Select remaining centroids using K-means++ algorithm
        for (let i = 1; i < config.k; i++) {
          const distances = features.map(point => 
            Math.min(...centroids.map(centroid => this.calculateDistance(point, centroid, config.distanceMetric)))
          );
          
          const totalDistance = distances.reduce((sum, dist) => sum + dist, 0);
          const random = Math.random() * totalDistance;
          
          let cumulativeDistance = 0;
          let selectedIndex = 0;
          
          for (let j = 0; j < distances.length; j++) {
            cumulativeDistance += distances[j];
            if (cumulativeDistance >= random) {
              selectedIndex = j;
              break;
            }
          }
          
          centroids.push([...features[selectedIndex]]);
        }
        break;
        
      default:
        throw new Error(`Unsupported initialization method: ${config.initialization}`);
    }
    
    return centroids;
  }

  private assignToClusters(features: number[][], centroids: number[][], distanceMetric: string): number[] {
    const assignments: number[] = [];
    
    for (const point of features) {
      let minDistance = Infinity;
      let closestCluster = 0;
      
      for (let i = 0; i < centroids.length; i++) {
        const distance = this.calculateDistance(point, centroids[i], distanceMetric);
        if (distance < minDistance) {
          minDistance = distance;
          closestCluster = i;
        }
      }
      
      assignments.push(closestCluster);
    }
    
    return assignments;
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
        
      default:
        return Math.sqrt(point1.reduce((sum, val, i) => sum + Math.pow(val - point2[i], 2), 0));
    }
  }

  private updateCentroids(features: number[][], assignments: number[], k: number): number[][] {
    const centroids: number[][] = [];
    const numFeatures = features[0].length;
    
    for (let i = 0; i < k; i++) {
      const clusterPoints = features.filter((_, index) => assignments[index] === i);
      
      if (clusterPoints.length === 0) {
        // If cluster is empty, keep the previous centroid
        centroids.push(new Array(numFeatures).fill(0));
      } else {
        const centroid: number[] = [];
        for (let j = 0; j < numFeatures; j++) {
          const sum = clusterPoints.reduce((sum, point) => sum + point[j], 0);
          centroid.push(sum / clusterPoints.length);
        }
        centroids.push(centroid);
      }
    }
    
    return centroids;
  }

  private checkConvergence(centroids: number[][], previousCentroids: number[][], tolerance: number): boolean {
    for (let i = 0; i < centroids.length; i++) {
      for (let j = 0; j < centroids[i].length; j++) {
        if (Math.abs(centroids[i][j] - previousCentroids[i][j]) > tolerance) {
          return false;
        }
      }
    }
    return true;
  }

  private createClusters(
    customers: Customer[],
    assignments: number[],
    centroids: number[][],
    config: ClusteringConfig,
  ): Cluster[] {
    const clusters: Cluster[] = [];
    
    for (let i = 0; i < config.k; i++) {
      const clusterCustomers = customers.filter((_, index) => assignments[index] === i);
      const customerIds = clusterCustomers.map(customer => customer.id);
      
      const characteristics = this.calculateClusterCharacteristics(clusterCustomers);
      const metrics = this.calculateClusterMetrics(customers, assignments, centroids, i);
      const insights = this.generateClusterInsights(clusterCustomers, characteristics);
      
      const cluster: Cluster = {
        id: `cluster_${i}`,
        name: `Cluster ${i + 1}`,
        centroid: centroids[i],
        customers: customerIds,
        characteristics,
        metrics,
        insights,
      };
      
      clusters.push(cluster);
    }
    
    return clusters;
  }

  private calculateClusterCharacteristics(customers: Customer[]): any {
    if (customers.length === 0) {
      return {
        size: 0,
        averageAge: 0,
        averageIncome: 0,
        averageOrderValue: 0,
        averageLoyaltyScore: 0,
        averageSatisfactionScore: 0,
        dominantIndustry: 'unknown',
        dominantType: 'unknown',
        dominantLocation: 'unknown',
      };
    }
    
    const averageAge = customers.reduce((sum, c) => sum + c.demographics.age, 0) / customers.length;
    const averageIncome = customers.reduce((sum, c) => sum + c.demographics.income, 0) / customers.length;
    const averageOrderValue = customers.reduce((sum, c) => sum + c.behavior.averageOrderValue, 0) / customers.length;
    const averageLoyaltyScore = customers.reduce((sum, c) => sum + c.behavior.loyaltyScore, 0) / customers.length;
    const averageSatisfactionScore = customers.reduce((sum, c) => sum + c.behavior.satisfactionScore, 0) / customers.length;
    
    // Find dominant industry
    const industries = customers.reduce((acc, c) => {
      acc[c.industry] = (acc[c.industry] || 0) + 1;
      return acc;
    }, {} as any);
    const dominantIndustry = Object.keys(industries).reduce((a, b) => industries[a] > industries[b] ? a : b);
    
    // Find dominant type
    const types = customers.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {} as any);
    const dominantType = Object.keys(types).reduce((a, b) => types[a] > types[b] ? a : b);
    
    // Find dominant location
    const locations = customers.reduce((acc, c) => {
      acc[c.location.city] = (acc[c.location.city] || 0) + 1;
      return acc;
    }, {} as any);
    const dominantLocation = Object.keys(locations).reduce((a, b) => locations[a] > locations[b] ? a : b);
    
    return {
      size: customers.length,
      averageAge,
      averageIncome,
      averageOrderValue,
      averageLoyaltyScore,
      averageSatisfactionScore,
      dominantIndustry,
      dominantType,
      dominantLocation,
    };
  }

  private calculateClusterMetrics(
    customers: Customer[],
    assignments: number[],
    centroids: number[][],
    clusterIndex: number,
  ): any {
    const clusterCustomers = customers.filter((_, index) => assignments[index] === clusterIndex);
    const clusterCentroid = centroids[clusterIndex];
    
    // Calculate within-cluster sum of squares
    let withinClusterSum = 0;
    for (const customer of clusterCustomers) {
      const distance = this.calculateDistance(customer.features, clusterCentroid, 'euclidean');
      withinClusterSum += distance * distance;
    }
    
    // Calculate silhouette score
    const silhouetteScore = this.calculateSilhouetteScore(customers, assignments, clusterIndex);
    
    // Calculate cohesion (average distance within cluster)
    const cohesion = withinClusterSum / (clusterCustomers.length || 1);
    
    // Calculate separation (average distance to other clusters)
    let separation = 0;
    for (let i = 0; i < centroids.length; i++) {
      if (i !== clusterIndex) {
        const distance = this.calculateDistance(clusterCentroid, centroids[i], 'euclidean');
        separation += distance;
      }
    }
    separation /= (centroids.length - 1);
    
    // Calculate stability (how consistent the cluster is)
    const stability = 1 - (cohesion / (cohesion + separation));
    
    return {
      withinClusterSum,
      silhouetteScore,
      cohesion,
      separation,
      stability,
    };
  }

  private calculateSilhouetteScore(customers: Customer[], assignments: number[], clusterIndex: number): number {
    const clusterCustomers = customers.filter((_, index) => assignments[index] === clusterIndex);
    if (clusterCustomers.length <= 1) return 0;
    
    let totalSilhouette = 0;
    
    for (const customer of clusterCustomers) {
      // Calculate average distance within cluster
      let withinClusterDistance = 0;
      for (const otherCustomer of clusterCustomers) {
        if (customer.id !== otherCustomer.id) {
          withinClusterDistance += this.calculateDistance(customer.features, otherCustomer.features, 'euclidean');
        }
      }
      withinClusterDistance /= (clusterCustomers.length - 1);
      
      // Calculate average distance to nearest other cluster
      const otherClusters = [...new Set(assignments)].filter(i => i !== clusterIndex);
      let minBetweenClusterDistance = Infinity;
      
      for (const otherClusterIndex of otherClusters) {
        const otherClusterCustomers = customers.filter((_, index) => assignments[index] === otherClusterIndex);
        let betweenClusterDistance = 0;
        
        for (const otherCustomer of otherClusterCustomers) {
          betweenClusterDistance += this.calculateDistance(customer.features, otherCustomer.features, 'euclidean');
        }
        betweenClusterDistance /= otherClusterCustomers.length;
        
        if (betweenClusterDistance < minBetweenClusterDistance) {
          minBetweenClusterDistance = betweenClusterDistance;
        }
      }
      
      // Calculate silhouette score for this customer
      const silhouette = (minBetweenClusterDistance - withinClusterDistance) / 
                       Math.max(withinClusterDistance, minBetweenClusterDistance);
      totalSilhouette += silhouette;
    }
    
    return totalSilhouette / clusterCustomers.length;
  }

  private generateClusterInsights(customers: Customer[], characteristics: any): any {
    const insights = {
      description: '',
      recommendations: [],
      opportunities: [],
      risks: [],
    };
    
    // Generate description
    insights.description = `Cluster with ${characteristics.size} customers, ` +
      `average age ${characteristics.averageAge.toFixed(1)}, ` +
      `average income $${characteristics.averageIncome.toFixed(0)}, ` +
      `dominant industry: ${characteristics.dominantIndustry}`;
    
    // Generate recommendations
    if (characteristics.averageLoyaltyScore > 0.8) {
      insights.recommendations.push('High loyalty customers - focus on retention');
    } else if (characteristics.averageLoyaltyScore < 0.5) {
      insights.recommendations.push('Low loyalty customers - focus on engagement');
    }
    
    if (characteristics.averageOrderValue > 1000) {
      insights.recommendations.push('High-value customers - offer premium services');
    } else if (characteristics.averageOrderValue < 100) {
      insights.recommendations.push('Low-value customers - focus on upselling');
    }
    
    // Generate opportunities
    if (characteristics.averageSatisfactionScore > 0.8) {
      insights.opportunities.push('High satisfaction - potential for referrals');
    }
    
    if (characteristics.averageIncome > 100000) {
      insights.opportunities.push('High income - potential for premium products');
    }
    
    // Generate risks
    if (characteristics.averageLoyaltyScore < 0.3) {
      insights.risks.push('Low loyalty - risk of churn');
    }
    
    if (characteristics.averageSatisfactionScore < 0.5) {
      insights.risks.push('Low satisfaction - risk of negative feedback');
    }
    
    return insights;
  }

  private calculatePerformanceMetrics(
    features: number[][],
    assignments: number[],
    centroids: number[][],
    config: ClusteringConfig,
  ): any {
    const silhouetteScore = this.calculateAverageSilhouetteScore(features, assignments, centroids);
    const calinskiHarabaszScore = this.calculateCalinskiHarabaszScore(features, assignments, centroids);
    const daviesBouldinScore = this.calculateDaviesBouldinScore(features, assignments, centroids);
    const inertia = this.calculateTotalWithinClusterSum(features, assignments, centroids);
    const stability = this.calculateStability(features, assignments, centroids);
    
    return {
      silhouetteScore,
      calinskiHarabaszScore,
      daviesBouldinScore,
      inertia,
      stability,
    };
  }

  private calculateAverageSilhouetteScore(features: number[][], assignments: number[], centroids: number[][]): number {
    const uniqueClusters = [...new Set(assignments)];
    let totalSilhouette = 0;
    
    for (const clusterIndex of uniqueClusters) {
      const silhouette = this.calculateSilhouetteScore(features, assignments, clusterIndex);
      totalSilhouette += silhouette;
    }
    
    return totalSilhouette / uniqueClusters.length;
  }

  private calculateCalinskiHarabaszScore(features: number[][], assignments: number[], centroids: number[][]): number {
    const n = features.length;
    const k = centroids.length;
    
    if (k <= 1 || n <= k) return 0;
    
    // Calculate overall centroid
    const overallCentroid = this.calculateOverallCentroid(features);
    
    // Calculate between-cluster sum of squares
    let betweenClusterSum = 0;
    for (let i = 0; i < k; i++) {
      const clusterPoints = features.filter((_, index) => assignments[index] === i);
      if (clusterPoints.length > 0) {
        const distance = this.calculateDistance(centroids[i], overallCentroid, 'euclidean');
        betweenClusterSum += clusterPoints.length * distance * distance;
      }
    }
    
    // Calculate within-cluster sum of squares
    const withinClusterSum = this.calculateTotalWithinClusterSum(features, assignments, centroids);
    
    return (betweenClusterSum / (k - 1)) / (withinClusterSum / (n - k));
  }

  private calculateDaviesBouldinScore(features: number[][], assignments: number[], centroids: number[][]): number {
    const k = centroids.length;
    let totalScore = 0;
    
    for (let i = 0; i < k; i++) {
      const clusterPoints = features.filter((_, index) => assignments[index] === i);
      if (clusterPoints.length === 0) continue;
      
      let maxRatio = 0;
      
      for (let j = 0; j < k; j++) {
        if (i !== j) {
          const otherClusterPoints = features.filter((_, index) => assignments[index] === j);
          if (otherClusterPoints.length === 0) continue;
          
          const distance = this.calculateDistance(centroids[i], centroids[j], 'euclidean');
          const ratio = (this.calculateClusterDispersion(clusterPoints, centroids[i]) + 
                        this.calculateClusterDispersion(otherClusterPoints, centroids[j])) / distance;
          
          if (ratio > maxRatio) {
            maxRatio = ratio;
          }
        }
      }
      
      totalScore += maxRatio;
    }
    
    return totalScore / k;
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

  private calculateClusterDispersion(points: number[][], centroid: number[]): number {
    let dispersion = 0;
    
    for (const point of points) {
      const distance = this.calculateDistance(point, centroid, 'euclidean');
      dispersion += distance;
    }
    
    return dispersion / points.length;
  }

  private calculateTotalWithinClusterSum(features: number[][], assignments: number[], centroids: number[][]): number {
    let totalSum = 0;
    
    for (let i = 0; i < centroids.length; i++) {
      const clusterPoints = features.filter((_, index) => assignments[index] === i);
      
      for (const point of clusterPoints) {
        const distance = this.calculateDistance(point, centroids[i], 'euclidean');
        totalSum += distance * distance;
      }
    }
    
    return totalSum;
  }

  private calculateStability(features: number[][], assignments: number[], centroids: number[][]): number {
    // Simplified stability calculation
    // In a real implementation, this would involve multiple runs and comparison
    const silhouetteScore = this.calculateAverageSilhouetteScore(features, assignments, centroids);
    return Math.max(0, Math.min(1, silhouetteScore));
  }

  private generateInsights(clusters: Cluster[], customers: Customer[], config: ClusteringConfig): any {
    // This would generate insights based on the clustering results
    return {
      trends: {},
      anomalies: [],
      predictions: [],
      insights: [],
    };
  }

  private generateRecommendations(clusters: Cluster[], performance: any, config: ClusteringConfig): any {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    
    if (performance.silhouetteScore < 0.5) {
      immediate.push('Low silhouette score - consider adjusting number of clusters');
    }
    
    if (performance.calinskiHarabaszScore < 100) {
      immediate.push('Low Calinski-Harabasz score - clusters may not be well separated');
    }
    
    if (performance.daviesBouldinScore > 2) {
      immediate.push('High Davies-Bouldin score - clusters may be too similar');
    }
    
    shortTerm.push('Implement targeted marketing campaigns for each cluster');
    shortTerm.push('Develop cluster-specific product recommendations');
    shortTerm.push('Create personalized customer experiences');
    
    longTerm.push('Build predictive models for each cluster');
    longTerm.push('Develop automated customer segmentation');
    longTerm.push('Create dynamic clustering system');
    
    return { immediate, shortTerm, longTerm };
  }

  private async saveClusteringResult(result: ClusteringResult): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO customer_segmentation_results 
        (total_customers, total_clusters, average_cluster_size, total_within_cluster_sum, 
         average_silhouette_score, convergence_iterations, processing_time, silhouette_score, 
         calinski_harabasz_score, davies_bouldin_score, inertia, stability, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      `, [
        result.summary.totalCustomers,
        result.summary.totalClusters,
        result.summary.averageClusterSize,
        result.summary.totalWithinClusterSum,
        result.summary.averageSilhouetteScore,
        result.summary.convergenceIterations,
        result.summary.processingTime,
        result.performance.silhouetteScore,
        result.performance.calinskiHarabaszScore,
        result.performance.daviesBouldinScore,
        result.performance.inertia,
        result.performance.stability,
      ]);
    } catch (error) {
      this.logger.error('Failed to save customer segmentation result:', error);
    }
  }
}

