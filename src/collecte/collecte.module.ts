import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CollecteService } from './collecte.service';
import { AirQualityApiService } from './air-quality-api.service';
import { MeteoApiService } from './meteo-api.service';
import { AlertModule } from '../alert/alert.module';

@Module({
  imports: [HttpModule.register({ timeout: 5000 }), AlertModule],
  providers: [CollecteService, AirQualityApiService, MeteoApiService],
  exports: [AirQualityApiService, MeteoApiService],
})
export class CollecteModule {}
