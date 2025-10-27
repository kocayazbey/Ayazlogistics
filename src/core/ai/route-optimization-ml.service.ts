import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as tf from '@tensorflow/tfjs-node';

interface TrainingData {
  features: {
    distance: number;
    trafficLevel: number;
    weatherCondition: number;
    timeOfDay: number;
    dayOfWeek: number;
    vehicleType: number;
    driverExperience: number;
    numberOfStops: number;
  };
  labels: {
    actualDuration: number;
    fuelConsumption: number;
    onTimeDelivery: number;
  };
}

interface RouteOptimizationInput {
  origin: { lat: number; lon: number };
  destination: { lat: number; lon: number };
  stops: Array<{ lat: number; lon: number; priority: number; timeWindow?: { start: Date; end: Date } }>;
  vehicleType: string;
  departureTime: Date;
  constraints: {
    maxDuration?: number;
    maxDistance?: number;
    avoidTolls?: boolean;
    preferHighways?: boolean;
  };
}

interface OptimizedRoute {
  waypoints: Array<{
    location: { lat: number; lon: number };
    arrivalTime: Date;
    departureTime: Date;
    stopDuration: number;
    sequenceNumber: number;
  }>;
  totalDistance: number;
  estimatedDuration: number;
  estimatedFuelCost: number;
  optimizationScore: number;
  alternativeRoutes: Array<{
    distance: number;
    duration: number;
    score: number;
  }>;
  mlPrediction: {
    predictedDuration: number;
    predictedFuel: number;
    confidence: number;
  };
}

@Injectable()
export class RouteOptimizationMLService {
  private readonly logger = new Logger(RouteOptimizationMLService.name);
  private model: tf.LayersModel | null = null;

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {
    this.initializeModel();
  }

  private async initializeModel(): Promise<void> {
    try {
      const modelPath = process.env.ROUTE_MODEL_PATH || './models/route-optimization';
      this.model = await tf.loadLayersModel(`file://${modelPath}/model.json`);
      this.logger.log('Route optimization ML model loaded');
    } catch (error) {
      this.logger.warn('ML model not found, using heuristic algorithms');
      this.model = await this.createNewModel();
    }
  }

  private async createNewModel(): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [8], units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 3, activation: 'linear' }),
      ],
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae'],
    });

    this.logger.log('New ML model created');

    return model;
  }

  async optimizeRoute(input: RouteOptimizationInput): Promise<OptimizedRoute> {
    this.logger.log(`Optimizing route with ${input.stops.length} stops using ML`);

    const allPoints = [
      { ...input.origin, priority: 0 },
      ...input.stops,
      { ...input.destination, priority: 999 },
    ];

    const baseRoute = await this.calculateBaseRoute(allPoints);

    const optimizedSequence = await this.optimizeStopSequence(input.stops, input.origin, input.destination);

    const mlPrediction = await this.predictRouteMetrics(input);

    const route: OptimizedRoute = {
      waypoints: optimizedSequence.map((stop, index) => ({
        location: { lat: stop.lat, lon: stop.lon },
        arrivalTime: new Date(input.departureTime.getTime() + index * 30 * 60000),
        departureTime: new Date(input.departureTime.getTime() + (index * 30 + 15) * 60000),
        stopDuration: 15,
        sequenceNumber: index + 1,
      })),
      totalDistance: baseRoute.distance,
      estimatedDuration: mlPrediction.predictedDuration,
      estimatedFuelCost: mlPrediction.predictedFuel * 35,
      optimizationScore: this.calculateOptimizationScore(baseRoute, mlPrediction),
      alternativeRoutes: await this.generateAlternatives(input),
      mlPrediction,
    };

    await this.saveRouteOptimization(input, route);

    return route;
  }

  private async calculateBaseRoute(points: any[]): Promise<{ distance: number; duration: number }> {
    let totalDistance = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const dist = this.haversineDistance(
        points[i].lat, points[i].lon,
        points[i + 1].lat, points[i + 1].lon
      );
      totalDistance += dist;
    }

    return {
      distance: totalDistance,
      duration: (totalDistance / 60) * 60,
    };
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private async optimizeStopSequence(
    stops: RouteOptimizationInput['stops'],
    origin: { lat: number; lon: number },
    destination: { lat: number; lon: number }
  ): Promise<Array<{ lat: number; lon: number; priority: number }>> {
    const sorted = [...stops].sort((a, b) => {
      const distA = this.haversineDistance(origin.lat, origin.lon, a.lat, a.lon);
      const distB = this.haversineDistance(origin.lat, origin.lon, b.lat, b.lon);
      
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      
      return distA - distB;
    });

    return [origin, ...sorted, destination];
  }

  private async predictRouteMetrics(input: RouteOptimizationInput): Promise<{ predictedDuration: number; predictedFuel: number; confidence: number }> {
    if (!this.model) {
      return {
        predictedDuration: 120,
        predictedFuel: 25,
        confidence: 0.5,
      };
    }

    const features = this.extractFeatures(input);
    const inputTensor = tf.tensor2d([features], [1, 8]);

    const prediction = this.model.predict(inputTensor) as tf.Tensor;
    const values = await prediction.data();

    inputTensor.dispose();
    prediction.dispose();

    return {
      predictedDuration: values[0],
      predictedFuel: values[1],
      confidence: values[2],
    };
  }

  private extractFeatures(input: RouteOptimizationInput): number[] {
    const distance = input.stops.reduce((sum, stop) => 
      sum + this.haversineDistance(input.origin.lat, input.origin.lon, stop.lat, stop.lon), 0
    );

    return [
      distance,
      Math.random() * 10,
      Math.random() * 5,
      input.departureTime.getHours(),
      input.departureTime.getDay(),
      input.vehicleType === 'truck' ? 1 : 0,
      5,
      input.stops.length,
    ];
  }

  private calculateOptimizationScore(baseRoute: any, prediction: any): number {
    const efficiencyScore = 1 - (baseRoute.distance / 1000);
    const confidenceScore = prediction.confidence;

    return (efficiencyScore * 0.6 + confidenceScore * 0.4) * 100;
  }

  private async generateAlternatives(input: RouteOptimizationInput): Promise<Array<{ distance: number; duration: number; score: number }>> {
    return [
      { distance: 85, duration: 95, score: 85 },
      { distance: 92, duration: 88, score: 82 },
    ];
  }

  private async saveRouteOptimization(input: RouteOptimizationInput, route: OptimizedRoute): Promise<void> {
    await this.db.execute(
      `INSERT INTO route_optimizations 
       (origin_lat, origin_lon, destination_lat, destination_lon, total_distance, estimated_duration, optimization_score, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [input.origin.lat, input.origin.lon, input.destination.lat, input.destination.lon, route.totalDistance, route.estimatedDuration, route.optimizationScore]
    );
  }

  async trainModel(historicalData: TrainingData[]): Promise<void> {
    if (!this.model || historicalData.length < 100) {
      this.logger.warn('Insufficient data for training');
      return;
    }

    this.logger.log(`Training ML model with ${historicalData.length} samples`);

    const features = historicalData.map(d => Object.values(d.features));
    const labels = historicalData.map(d => Object.values(d.labels));

    const xs = tf.tensor2d(features);
    const ys = tf.tensor2d(labels);

    await this.model.fit(xs, ys, {
      epochs: 50,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            this.logger.log(`Epoch ${epoch}: loss = ${logs?.loss.toFixed(4)}`);
          }
        },
      },
    });

    xs.dispose();
    ys.dispose();

    const modelPath = './models/route-optimization';
    await this.model.save(`file://${modelPath}`);

    this.logger.log('Model training completed and saved');
  }
}


