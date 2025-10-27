import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import axios from 'axios';

interface TrafficData {
  routeId: string;
  segments: TrafficSegment[];
  lastUpdated: Date;
  confidence: number;
}

interface TrafficSegment {
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  distance: number;
  duration: number; // seconds
  speed: number; // km/h
  congestion: 'low' | 'medium' | 'high' | 'severe';
  incidents: TrafficIncident[];
  roadType: 'highway' | 'arterial' | 'local';
}

interface TrafficIncident {
  type: 'accident' | 'construction' | 'road_closure' | 'weather';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  startTime: Date;
  estimatedEndTime: Date;
  impact: number; // 0-1, impact on travel time
}

interface RouteOptimization {
  routeId: string;
  waypoints: Waypoint[];
  totalDistance: number;
  totalDuration: number;
  totalCost: number;
  trafficFactor: number;
  alternativeRoutes: AlternativeRoute[];
  recommendations: string[];
}

interface Waypoint {
  lat: number;
  lon: number;
  arrivalTime: Date;
  departureTime: Date;
  trafficDelay: number; // minutes
  congestion: string;
}

interface AlternativeRoute {
  routeId: string;
  waypoints: Waypoint[];
  totalDistance: number;
  totalDuration: number;
  totalCost: number;
  trafficFactor: number;
  advantages: string[];
  disadvantages: string[];
}

@Injectable()
export class RealTimeTrafficIntegrationService {
  private readonly logger = new Logger(RealTimeTrafficIntegrationService.name);
  private trafficCache = new Map<string, TrafficData>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService?: HttpService,
  ) {}

  async getRealTimeTrafficData(
    origin: { lat: number; lon: number },
    destination: { lat: number; lon: number },
    waypoints?: { lat: number; lon: number }[],
  ): Promise<TrafficData> {
    const routeId = this.generateRouteId(origin, destination, waypoints);
    
    // Check cache first
    const cached = this.trafficCache.get(routeId);
    if (cached && this.isCacheValid(cached.lastUpdated)) {
      return cached;
    }

    try {
      // Get traffic data from multiple sources
      const [googleMapsData, hereMapsData, openStreetMapData] = await Promise.all([
        this.getGoogleMapsTrafficData(origin, destination, waypoints),
        this.getHereMapsTrafficData(origin, destination, waypoints),
        this.getOpenStreetMapTrafficData(origin, destination, waypoints),
      ]);

      // Merge and validate data from different sources
      const trafficData = this.mergeTrafficData(googleMapsData, hereMapsData, openStreetMapData);
      
      // Cache the result
      this.trafficCache.set(routeId, trafficData);
      
      return trafficData;
    } catch (error) {
      this.logger.error('Failed to get real-time traffic data:', error);
      return this.getFallbackTrafficData(origin, destination, waypoints);
    }
  }

  async optimizeRouteWithTraffic(
    origin: { lat: number; lon: number },
    destination: { lat: number; lon: number },
    waypoints: { lat: number; lon: number }[],
    preferences: {
      avoidTolls: boolean;
      avoidHighways: boolean;
      preferHighways: boolean;
      avoidTraffic: boolean;
      departureTime?: Date;
    },
  ): Promise<RouteOptimization> {
    this.logger.log(`Optimizing route with real-time traffic data`);

    // Get current traffic data
    const trafficData = await this.getRealTimeTrafficData(origin, destination, waypoints);
    
    // Generate multiple route alternatives
    const alternatives = await this.generateRouteAlternatives(
      origin,
      destination,
      waypoints,
      preferences,
      trafficData,
    );

    // Select best route based on traffic conditions
    const bestRoute = this.selectBestRoute(alternatives, trafficData, preferences);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(bestRoute, trafficData);

    return {
      routeId: bestRoute.routeId,
      waypoints: bestRoute.waypoints,
      totalDistance: bestRoute.totalDistance,
      totalDuration: bestRoute.totalDuration,
      totalCost: bestRoute.totalCost,
      trafficFactor: bestRoute.trafficFactor,
      alternativeRoutes: alternatives.filter(alt => alt.routeId !== bestRoute.routeId),
      recommendations,
    };
  }

  private async getGoogleMapsTrafficData(
    origin: { lat: number; lon: number },
    destination: { lat: number; lon: number },
    waypoints?: { lat: number; lon: number }[],
  ): Promise<any> {
    const apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const originStr = `${origin.lat},${origin.lon}`;
    const destinationStr = `${destination.lat},${destination.lon}`;
    const waypointsStr = waypoints?.map(wp => `${wp.lat},${wp.lon}`).join('|');

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&waypoints=${waypointsStr}&traffic_model=best_guess&departure_time=now&key=${apiKey}`;

    try {
      if (this.httpService) {
        const response = await firstValueFrom(this.httpService.get(url));
        return this.parseGoogleMapsResponse(response.data);
      } else {
        const response = await axios.get(url);
        return this.parseGoogleMapsResponse(response.data);
      }
    } catch (error) {
      this.logger.error('Google Maps API error:', error);
      throw error;
    }
  }

  private async getHereMapsTrafficData(
    origin: { lat: number; lon: number },
    destination: { lat: number; lon: number },
    waypoints?: { lat: number; lon: number }[],
  ): Promise<any> {
    const apiKey = this.configService.get<string>('HERE_MAPS_API_KEY');
    if (!apiKey) {
      throw new Error('HERE Maps API key not configured');
    }

    const originStr = `${origin.lat},${origin.lon}`;
    const destinationStr = `${destination.lat},${destination.lon}`;
    const waypointsStr = waypoints?.map(wp => `${wp.lat},${wp.lon}`).join('|');

    const url = `https://route.ls.hereapi.com/routing/7.2/calculateroute.json?waypoint0=${originStr}&waypoint1=${destinationStr}&waypoint2=${waypointsStr}&mode=fastest;truck&traffic:enabled&apiKey=${apiKey}`;

    try {
      if (this.httpService) {
        const response = await firstValueFrom(this.httpService.get(url));
        return this.parseHereMapsResponse(response.data);
      } else {
        const response = await axios.get(url);
        return this.parseHereMapsResponse(response.data);
      }
    } catch (error) {
      this.logger.error('HERE Maps API error:', error);
      throw error;
    }
  }

  private async getOpenStreetMapTrafficData(
    origin: { lat: number; lon: number },
    destination: { lat: number; lon: number },
    waypoints?: { lat: number; lon: number }[],
  ): Promise<any> {
    // OpenStreetMap doesn't have real-time traffic, but we can get road data
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=full&steps=true`;

    try {
      if (this.httpService) {
        const response = await firstValueFrom(this.httpService.get(url));
        return this.parseOSRMResponse(response.data);
      } else {
        const response = await axios.get(url);
        return this.parseOSRMResponse(response.data);
      }
    } catch (error) {
      this.logger.error('OSRM API error:', error);
      throw error;
    }
  }

  private parseGoogleMapsResponse(data: any): TrafficSegment[] {
    const segments: TrafficSegment[] = [];
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const legs = route.legs || [];
      
      for (const leg of legs) {
        const steps = leg.steps || [];
        for (const step of steps) {
          const start = step.start_location;
          const end = step.end_location;
          
          segments.push({
            startLat: start.lat,
            startLon: start.lng,
            endLat: end.lat,
            endLon: end.lng,
            distance: step.distance.value / 1000, // Convert to km
            duration: step.duration.value, // seconds
            speed: (step.distance.value / 1000) / (step.duration.value / 3600), // km/h
            congestion: this.determineCongestion(step.duration_in_traffic?.value, step.duration.value),
            incidents: this.extractIncidents(step),
            roadType: this.determineRoadType(step.html_instructions),
          });
        }
      }
    }
    
    return segments;
  }

  private parseHereMapsResponse(data: any): TrafficSegment[] {
    const segments: TrafficSegment[] = [];
    
    if (data.response && data.response.route) {
      const route = data.response.route[0];
      const legs = route.leg || [];
      
      for (const leg of legs) {
        const maneuvers = leg.maneuver || [];
        for (const maneuver of maneuvers) {
          const start = maneuver.position;
          const end = maneuver.position; // HERE doesn't provide end position in this structure
          
          segments.push({
            startLat: start.latitude,
            startLon: start.longitude,
            endLat: start.latitude, // Simplified
            endLon: start.longitude, // Simplified
            distance: maneuver.length,
            duration: maneuver.travelTime,
            speed: maneuver.length / (maneuver.travelTime / 3600),
            congestion: this.determineCongestionFromHERE(maneuver),
            incidents: [],
            roadType: this.determineRoadTypeFromHERE(maneuver),
          });
        }
      }
    }
    
    return segments;
  }

  private parseOSRMResponse(data: any): TrafficSegment[] {
    const segments: TrafficSegment[] = [];
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const legs = route.legs || [];
      
      for (const leg of legs) {
        const steps = leg.steps || [];
        for (const step of steps) {
          const geometry = step.geometry;
          if (geometry && geometry.coordinates.length >= 2) {
            const start = geometry.coordinates[0];
            const end = geometry.coordinates[geometry.coordinates.length - 1];
            
            segments.push({
              startLat: start[1],
              startLon: start[0],
              endLat: end[1],
              endLon: end[0],
              distance: step.distance,
              duration: step.duration,
              speed: step.distance / (step.duration / 3600),
              congestion: 'low', // OSRM doesn't provide traffic data
              incidents: [],
              roadType: 'local',
            });
          }
        }
      }
    }
    
    return segments;
  }

  private mergeTrafficData(googleData: any, hereData: any, osmData: any): TrafficData {
    // Simple merging strategy - prioritize Google Maps for traffic, HERE for routing
    const segments = [...googleData, ...hereData, ...osmData];
    
    // Remove duplicates and merge similar segments
    const mergedSegments = this.mergeSimilarSegments(segments);
    
    return {
      routeId: 'merged',
      segments: mergedSegments,
      lastUpdated: new Date(),
      confidence: this.calculateConfidence(googleData, hereData, osmData),
    };
  }

  private mergeSimilarSegments(segments: TrafficSegment[]): TrafficSegment[] {
    const merged: TrafficSegment[] = [];
    const threshold = 0.1; // 100m threshold for merging
    
    for (const segment of segments) {
      let mergedWithExisting = false;
      
      for (let i = 0; i < merged.length; i++) {
        const existing = merged[i];
        const distance = this.calculateDistance(
          { lat: segment.startLat, lon: segment.startLon },
          { lat: existing.startLat, lon: existing.startLon }
        );
        
        if (distance < threshold) {
          // Merge segments
          merged[i] = this.mergeTwoSegments(existing, segment);
          mergedWithExisting = true;
          break;
        }
      }
      
      if (!mergedWithExisting) {
        merged.push(segment);
      }
    }
    
    return merged;
  }

  private mergeTwoSegments(segment1: TrafficSegment, segment2: TrafficSegment): TrafficSegment {
    // Weighted average based on confidence
    const weight1 = 0.6; // Google Maps weight
    const weight2 = 0.4; // Other sources weight
    
    return {
      startLat: segment1.startLat,
      startLon: segment1.startLon,
      endLat: segment1.endLat,
      endLon: segment1.endLon,
      distance: (segment1.distance + segment2.distance) / 2,
      duration: Math.round((segment1.duration * weight1 + segment2.duration * weight2)),
      speed: (segment1.speed + segment2.speed) / 2,
      congestion: this.mergeCongestionLevels(segment1.congestion, segment2.congestion),
      incidents: [...segment1.incidents, ...segment2.incidents],
      roadType: segment1.roadType,
    };
  }

  private mergeCongestionLevels(level1: string, level2: string): 'low' | 'medium' | 'high' | 'severe' {
    const levels = { low: 1, medium: 2, high: 3, severe: 4 };
    const avgLevel = (levels[level1 as keyof typeof levels] + levels[level2 as keyof typeof levels]) / 2;
    
    if (avgLevel <= 1.5) return 'low';
    if (avgLevel <= 2.5) return 'medium';
    if (avgLevel <= 3.5) return 'high';
    return 'severe';
  }

  private calculateConfidence(googleData: any, hereData: any, osmData: any): number {
    let confidence = 0.5; // Base confidence
    
    if (googleData.length > 0) confidence += 0.3;
    if (hereData.length > 0) confidence += 0.2;
    if (osmData.length > 0) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private determineCongestion(durationInTraffic?: number, normalDuration?: number): 'low' | 'medium' | 'high' | 'severe' {
    if (!durationInTraffic || !normalDuration) return 'low';
    
    const ratio = durationInTraffic / normalDuration;
    if (ratio <= 1.1) return 'low';
    if (ratio <= 1.3) return 'medium';
    if (ratio <= 1.6) return 'high';
    return 'severe';
  }

  private determineCongestionFromHERE(maneuver: any): 'low' | 'medium' | 'high' | 'severe' {
    // HERE Maps specific congestion determination
    return 'low'; // Simplified
  }

  private determineRoadType(instructions: string): 'highway' | 'arterial' | 'local' {
    const highwayKeywords = ['highway', 'freeway', 'motorway', 'autobahn'];
    const arterialKeywords = ['avenue', 'boulevard', 'street'];
    
    const lowerInstructions = instructions.toLowerCase();
    
    if (highwayKeywords.some(keyword => lowerInstructions.includes(keyword))) {
      return 'highway';
    }
    if (arterialKeywords.some(keyword => lowerInstructions.includes(keyword))) {
      return 'arterial';
    }
    return 'local';
  }

  private determineRoadTypeFromHERE(maneuver: any): 'highway' | 'arterial' | 'local' {
    // HERE Maps specific road type determination
    return 'local'; // Simplified
  }

  private extractIncidents(step: any): TrafficIncident[] {
    // Extract traffic incidents from step data
    return []; // Simplified - would need actual incident data
  }

  private generateRouteId(
    origin: { lat: number; lon: number },
    destination: { lat: number; lon: number },
    waypoints?: { lat: number; lon: number }[],
  ): string {
    const waypointsStr = waypoints?.map(wp => `${wp.lat},${wp.lon}`).join('|') || '';
    return `${origin.lat},${origin.lon}-${destination.lat},${destination.lon}-${waypointsStr}`;
  }

  private isCacheValid(lastUpdated: Date): boolean {
    return Date.now() - lastUpdated.getTime() < this.CACHE_TTL;
  }

  private getFallbackTrafficData(
    origin: { lat: number; lon: number },
    destination: { lat: number; lon: number },
    waypoints?: { lat: number; lon: number }[],
  ): TrafficData {
    // Return basic traffic data without real-time information
    return {
      routeId: this.generateRouteId(origin, destination, waypoints),
      segments: [],
      lastUpdated: new Date(),
      confidence: 0.1,
    };
  }

  private async generateRouteAlternatives(
    origin: { lat: number; lon: number },
    destination: { lat: number; lon: number },
    waypoints: { lat: number; lon: number }[],
    preferences: any,
    trafficData: TrafficData,
  ): Promise<AlternativeRoute[]> {
    // Generate multiple route alternatives based on preferences and traffic
    const alternatives: AlternativeRoute[] = [];
    
    // Fastest route
    alternatives.push(await this.generateFastestRoute(origin, destination, waypoints, trafficData));
    
    // Shortest route
    alternatives.push(await this.generateShortestRoute(origin, destination, waypoints, trafficData));
    
    // Avoid traffic route
    if (preferences.avoidTraffic) {
      alternatives.push(await this.generateAvoidTrafficRoute(origin, destination, waypoints, trafficData));
    }
    
    return alternatives;
  }

  private async generateFastestRoute(
    origin: { lat: number; lon: number },
    destination: { lat: number; lon: number },
    waypoints: { lat: number; lon: number }[],
    trafficData: TrafficData,
  ): Promise<AlternativeRoute> {
    // Implementation for fastest route
    return {
      routeId: 'fastest',
      waypoints: [],
      totalDistance: 0,
      totalDuration: 0,
      totalCost: 0,
      trafficFactor: 1.0,
      advantages: ['Fastest travel time'],
      disadvantages: ['May have higher fuel costs'],
    };
  }

  private async generateShortestRoute(
    origin: { lat: number; lon: number },
    destination: { lat: number; lon: number },
    waypoints: { lat: number; lon: number }[],
    trafficData: TrafficData,
  ): Promise<AlternativeRoute> {
    // Implementation for shortest route
    return {
      routeId: 'shortest',
      waypoints: [],
      totalDistance: 0,
      totalDuration: 0,
      totalCost: 0,
      trafficFactor: 1.0,
      advantages: ['Shortest distance'],
      disadvantages: ['May take longer due to traffic'],
    };
  }

  private async generateAvoidTrafficRoute(
    origin: { lat: number; lon: number },
    destination: { lat: number; lon: number },
    waypoints: { lat: number; lon: number }[],
    trafficData: TrafficData,
  ): Promise<AlternativeRoute> {
    // Implementation for traffic-avoiding route
    return {
      routeId: 'avoid_traffic',
      waypoints: [],
      totalDistance: 0,
      totalDuration: 0,
      totalCost: 0,
      trafficFactor: 0.8,
      advantages: ['Avoids congested areas'],
      disadvantages: ['May be longer distance'],
    };
  }

  private selectBestRoute(
    alternatives: AlternativeRoute[],
    trafficData: TrafficData,
    preferences: any,
  ): AlternativeRoute {
    // Select best route based on multiple criteria
    let bestRoute = alternatives[0];
    let bestScore = this.calculateRouteScore(alternatives[0], trafficData, preferences);
    
    for (let i = 1; i < alternatives.length; i++) {
      const score = this.calculateRouteScore(alternatives[i], trafficData, preferences);
      if (score > bestScore) {
        bestScore = score;
        bestRoute = alternatives[i];
      }
    }
    
    return bestRoute;
  }

  private calculateRouteScore(
    route: AlternativeRoute,
    trafficData: TrafficData,
    preferences: any,
  ): number {
    let score = 0;
    
    // Distance score (lower is better)
    score += 100 / (route.totalDistance + 1);
    
    // Duration score (lower is better)
    score += 100 / (route.totalDuration + 1);
    
    // Cost score (lower is better)
    score += 100 / (route.totalCost + 1);
    
    // Traffic factor score (lower traffic factor is better)
    score += 100 / (route.trafficFactor + 0.1);
    
    return score;
  }

  private generateRecommendations(route: AlternativeRoute, trafficData: TrafficData): string[] {
    const recommendations: string[] = [];
    
    if (route.trafficFactor > 1.2) {
      recommendations.push('Consider leaving earlier to avoid traffic');
    }
    
    if (route.totalDuration > 120) {
      recommendations.push('Long route detected - consider breaking into multiple trips');
    }
    
    if (trafficData.segments.some(segment => segment.congestion === 'severe')) {
      recommendations.push('Severe traffic detected - consider alternative routes');
    }
    
    return recommendations;
  }

  private calculateDistance(point1: { lat: number; lon: number }, point2: { lat: number; lon: number }): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLon = this.toRad(point2.lon - point1.lon);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(point1.lat)) * Math.cos(this.toRad(point2.lat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

