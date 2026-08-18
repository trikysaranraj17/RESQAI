import { NextResponse } from 'next/server';
import { WeatherService } from '@/lib/weatherService';

export async function GET() {
  try {
    const appMode = (process.env.APP_MODE as 'demo' | 'live') || 'demo';
    const weather = await WeatherService.getLatestWeather(appMode);
    return NextResponse.json({ success: true, weather });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
