import { Injectable, Logger } from '@nestjs/common';
import { Client, LatLngLiteral } from '@googlemaps/google-maps-services-js';

@Injectable()
export class GoogleMapsService {
  private readonly logger = new Logger(GoogleMapsService.name);
  private readonly client: Client;

  constructor() {
    this.client = new Client({});
  }

  async geocode(address: string): Promise<LatLngLiteral> {
    try {
      const response = await this.client.geocode({
        params: {
          address,
          key: process.env.GOOGLE_MAPS_API_KEY || '',
        },
      });

      if (response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        this.logger.log(`Geocoded address: ${address}`);
        return location;
      }

      throw new Error('No results found');
    } catch (error) {
      this.logger.error(`Geocoding failed for ${address}:`, error);
      throw error;
    }
  }

  async calculateRoute(origin: string, destination: string, waypoints?: string[]): Promise<any> {
    try {
      const response = await this.client.directions({
        params: {
          origin,
          destination,
          waypoints,
          optimize: true,
          key: process.env.GOOGLE_MAPS_API_KEY || '',
        },
      });

      if (response.data.routes.length > 0) {
        const route = response.data.routes[0];
        this.logger.log(`Route calculated: ${route.legs.length} legs`);
        return {
          distance: route.legs.reduce((sum, leg) => sum + leg.distance.value, 0) / 1000,
          duration: route.legs.reduce((sum, leg) => sum + leg.duration.value, 0) / 60,
          polyline: route.overview_polyline.points,
        };
      }

      throw new Error('No route found');
    } catch (error) {
      this.logger.error('Route calculation failed:', error);
      throw error;
    }
  }

  async getDistanceMatrix(origins: string[], destinations: string[]): Promise<any> {
    try {
      const response = await this.client.distancematrix({
        params: {
          origins,
          destinations,
          key: process.env.GOOGLE_MAPS_API_KEY || '',
        },
      });

      this.logger.log('Distance matrix calculated');
      return response.data;
    } catch (error) {
      this.logger.error('Distance matrix calculation failed:', error);
      throw error;
    }
  }
}

