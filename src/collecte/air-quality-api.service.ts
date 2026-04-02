import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface AirQualityData {
  ozone: number | null;
  co: number | null;
  pm25: number | null;
  pm10: number | null;
  indiceQualite: number | null;
  dateHeure: string;
}

@Injectable()
export class AirQualityApiService {
  private readonly logger = new Logger(AirQualityApiService.name);
  private readonly baseUrl =
    'https://air-quality-api.open-meteo.com/v1/air-quality';

  constructor(private httpService: HttpService) {}

  async fetchCurrent(lat: number, lng: number): Promise<AirQualityData> {
    const { data } = await firstValueFrom(
      this.httpService.get(this.baseUrl, {
        params: {
          latitude: lat,
          longitude: lng,
          current: 'pm10,pm2_5,carbon_monoxide,ozone,european_aqi',
        },
      }),
    );

    const current = data.current;
    return {
      ozone: current.ozone ?? null,
      co: current.carbon_monoxide ?? null,
      pm25: current.pm2_5 ?? null,
      pm10: current.pm10 ?? null,
      indiceQualite: current.european_aqi ?? null,
      dateHeure: current.time,
    };
  }
}
