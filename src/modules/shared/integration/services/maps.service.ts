import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MapsService {
  constructor(private configService: ConfigService) {}

  async geocode(address: string): Promise<{ latitude: number; longitude: number; formattedAddress: string }> {
    return {
      latitude: 41.0082,
      longitude: 28.9784,
      formattedAddress: address,
    };
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    return `Address at ${latitude}, ${longitude}`;
  }

  async calculateDistance(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }): Promise<number> {
    const R = 6371;
    const dLat = this.toRad(destination.lat - origin.lat);
    const dLon = this.toRad(destination.lng - origin.lng);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(origin.lat)) * Math.cos(this.toRad(destination.lat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async getRoute(origin: string, destination: string, waypoints?: string[]) {
    return {
      distance: 150,
      duration: 120,
      polyline: 'encoded_polyline_data',
      steps: [],
    };
  }

  async getDirections(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
    return {
      distance: await this.calculateDistance(origin, destination),
      duration: 60,
      steps: [
        { instruction: 'Head north', distance: 100, duration: 5 },
        { instruction: 'Turn right', distance: 50, duration: 3 },
      ],
    };
  }

  async validateAddress(address: string): Promise<{ valid: boolean; formatted?: string; suggestions?: string[] }> {
    return {
      valid: true,
      formatted: address,
      suggestions: [],
    };
  }

  async getETA(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, departureTime?: Date) {
    const distance = await this.calculateDistance(origin, destination);
    const avgSpeed = 50;
    const durationMinutes = (distance / avgSpeed) * 60;
    
    const eta = new Date((departureTime || new Date()).getTime() + durationMinutes * 60 * 1000);

    return {
      eta,
      distance,
      duration: durationMinutes,
    };
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}

