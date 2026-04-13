import { Module } from '@nestjs/common';
import { ManualAlertAdminController, ManualAlertPublicController } from './manual-alert.controller';
import { ManualAlertService } from './manual-alert.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ManualAlertAdminController, ManualAlertPublicController],
  providers: [ManualAlertService],
})
export class ManualAlertModule {}
