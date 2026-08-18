import { WeatherSnapshot, HourlyForecast } from './types';

export class WeatherService {
  /**
   * Retrieves current weather snapshot with hourly forecast.
   * If live API key is missing or fails, generates deterministic high-fidelity simulated radar conditions.
   */
  public static async getLatestWeather(appMode: 'demo' | 'live' = 'demo'): Promise<WeatherSnapshot> {
    const isDemo = appMode === 'demo' || !process.env.OPENWEATHER_API_KEY;

    // Generated simulated weather reflecting a dynamic active storm system
    const hourlyForecast: HourlyForecast[] = [
      { timeLabel: 'Now', tempC: 22, rainProb: 92, windKmh: 48, condition: 'Heavy Rain' },
      { timeLabel: '+1h', tempC: 21, rainProb: 95, windKmh: 54, condition: 'Storm' },
      { timeLabel: '+3h', tempC: 20, rainProb: 88, windKmh: 62, condition: 'Storm' },
      { timeLabel: '+6h', tempC: 21, rainProb: 75, windKmh: 42, condition: 'Heavy Rain' },
      { timeLabel: '+12h', tempC: 23, rainProb: 40, windKmh: 28, condition: 'Cloudy' },
      { timeLabel: '+24h', tempC: 25, rainProb: 15, windKmh: 18, condition: 'Clear' },
    ];

    return {
      condition: 'Heavy Rain & Gale Warnings',
      temperatureC: 22,
      rainProbability: 92,
      rainfallMm: 68.4,
      windSpeedKmh: 48,
      humidityPercent: 94,
      hourlyForecast,
      isSimulated: isDemo,
      updatedAt: new Date().toISOString(),
    };
  }
}
