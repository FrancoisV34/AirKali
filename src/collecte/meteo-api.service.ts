import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { wmoCodeToText } from '../common/utils/wmo-codes';

export interface MeteoData {
  temperature: number | null;
  pression: number | null;
  humidite: number | null;
  meteoCiel: string | null;
  vitesseVent: number | null;
  dateHeure: string;
}

@Injectable()
export class MeteoApiService {
  private readonly logger = new Logger(MeteoApiService.name);
  private readonly baseUrl = 'https://api.open-meteo.com/v1/forecast';

  constructor(private httpService: HttpService) {}

  async fetchCurrent(lat: number, lng: number): Promise<MeteoData> {
    const { data } = await firstValueFrom(
      this.httpService.get(this.baseUrl, {
        params: {
          latitude: lat,
          longitude: lng,
          current:
            'temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,weather_code',
        },
      }),
    );

    const current = data.current;
    return {
      temperature: current.temperature_2m ?? null,
      pression: current.surface_pressure ?? null,
      humidite: current.relative_humidity_2m ?? null,
      meteoCiel:
        current.weather_code != null
          ? wmoCodeToText(current.weather_code)
          : null,
      vitesseVent: current.wind_speed_10m ?? null,
      dateHeure: current.time,
    };
  }
}
