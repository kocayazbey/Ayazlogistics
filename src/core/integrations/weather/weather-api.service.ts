import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface WeatherData {
  temperature: number;
  condition: string;
  precipitation: number;
  windSpeed: number;
  visibility: number;
  forecast: Array<{ date: Date; temp: number; condition: string }>;
}

@Injectable()
export class WeatherAPIService {
  private readonly logger = new Logger(WeatherAPIService.name);
  private readonly apiUrl = process.env.WEATHER_API_URL || 'https://api.openweathermap.org/data/2.5';

  async getCurrentWeather(lat: number, lon: number): Promise<WeatherData> {
    try {
      const response = await axios.get(`${this.apiUrl}/weather`, {
        params: {
          lat,
          lon,
          appid: process.env.WEATHER_API_KEY,
          units: 'metric',
        },
      });

      const data = response.data;
      return {
        temperature: data.main.temp,
        condition: data.weather[0].main,
        precipitation: data.rain?.['1h'] || 0,
        windSpeed: data.wind.speed,
        visibility: data.visibility / 1000,
        forecast: [],
      };
    } catch (error) {
      this.logger.error('Weather API call failed:', error);
      throw error;
    }
  }

  async getForecast(lat: number, lon: number, days: number = 7): Promise<WeatherData> {
    try {
      const response = await axios.get(`${this.apiUrl}/forecast`, {
        params: {
          lat,
          lon,
          appid: process.env.WEATHER_API_KEY,
          units: 'metric',
          cnt: days * 8,
        },
      });

      const forecast = response.data.list.map((item: any) => ({
        date: new Date(item.dt * 1000),
        temp: item.main.temp,
        condition: item.weather[0].main,
      }));

      const current = await this.getCurrentWeather(lat, lon);
      return { ...current, forecast };
    } catch (error) {
      this.logger.error('Weather forecast failed:', error);
      throw error;
    }
  }

  async checkWeatherSuitabilityForDelivery(lat: number, lon: number): Promise<{
    suitable: boolean;
    warnings: string[];
    score: number;
  }> {
    const weather = await this.getCurrentWeather(lat, lon);
    const warnings: string[] = [];
    let score = 100;

    if (weather.precipitation > 5) {
      warnings.push('Heavy rain expected');
      score -= 30;
    }

    if (weather.windSpeed > 50) {
      warnings.push('Strong winds');
      score -= 20;
    }

    if (weather.visibility < 1) {
      warnings.push('Low visibility');
      score -= 25;
    }

    if (weather.temperature < -5 || weather.temperature > 40) {
      warnings.push('Extreme temperature');
      score -= 15;
    }

    return {
      suitable: score >= 50,
      warnings,
      score: Math.max(0, score),
    };
  }
}

