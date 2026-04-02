import { Module } from '@nestjs/common';
import { MeteoController } from './meteo.controller';
import { MeteoService } from './meteo.service';
import { CollecteModule } from '../collecte/collecte.module';

@Module({
  imports: [CollecteModule],
  controllers: [MeteoController],
  providers: [MeteoService],
})
export class MeteoModule {}
