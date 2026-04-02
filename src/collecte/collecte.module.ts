import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CollecteService } from './collecte.service';
import { AirQualityApiService } from './air-quality-api.service';
import { MeteoApiService } from './meteo-api.service';

@Module({
  imports: [HttpModule.register({ timeout: 5000 })],
  providers: [CollecteService, AirQualityApiService, MeteoApiService],
  exports: [AirQualityApiService, MeteoApiService],
})
export class CollecteModule {}
