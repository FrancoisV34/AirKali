import { Module } from '@nestjs/common';
import { AirQualityController } from './air-quality.controller';
import { AirQualityService } from './air-quality.service';
import { CollecteModule } from '../collecte/collecte.module';

@Module({
  imports: [CollecteModule],
  controllers: [AirQualityController],
  providers: [AirQualityService],
})
export class AirQualityModule {}
