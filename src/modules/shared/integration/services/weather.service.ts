import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WeatherService {
  constructor(private configService: ConfigService) {}

  async getCurrentWeather(latitude: number, longitude: number) {
    return {
      temperature: 22,
      condition: 'Clear',
      humidity: 65,
      windSpeed: 15,
      windDirection: 'NW',
      visibility: 10,
      pressure: 1013,
      timestamp: new Date(),
    };
  }

  async getForecast(latitude: number, longitude: number, days: number = 7) {
    const forecast = [];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      forecast.push({
        date,
        temperatureMin: 15 + Math.random() * 5,
        temperatureMax: 25 + Math.random() * 5,
        condition: 'Clear',
        precipitationChance: Math.random() * 100,
      });
    }

    return forecast;
  }

  async getWeatherAlerts(latitude: number, longitude: number) {
    return {
      alerts: [],
      hasAlerts: false,
    };
  }

  async checkRouteWeather(waypoints: Array<{ lat: number; lng: number }>) {
    const weatherData = [];

    for (const point of waypoints) {
      const weather = await this.getCurrentWeather(point.lat, point.lng);
      weatherData.push({ ...point, weather });
    }

    return weatherData;
  }

  async isWeatherSafeForDelivery(latitude: number, longitude: number): Promise<{
    safe: boolean;
    reason?: string;
    weather: any;
  }> {
    const weather = await this.getCurrentWeather(latitude, longitude);

    let safe = true;
    let reason;

    if (weather.condition === 'Storm' || weather.condition === 'Heavy Rain') {
      safe = false;
      reason = 'Severe weather conditions';
    } else if (weather.windSpeed > 50) {
      safe = false;
      reason = 'High wind speeds';
    } else if (weather.visibility < 1) {
      safe = false;
      reason = 'Low visibility';
    }

    return {
      safe,
      reason,
      weather,
    };
  }
}

