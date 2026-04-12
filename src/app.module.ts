import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CommuneModule } from './commune/commune.module';
import { AirQualityModule } from './air-quality/air-quality.module';
import { MeteoModule } from './meteo/meteo.module';
import { CollecteModule } from './collecte/collecte.module';
import { FavoriteModule } from './favorite/favorite.module';
import { CategoryModule } from './category/category.module';
import { TopicModule } from './topic/topic.module';
import { CommentModule } from './comment/comment.module';
import { VoteModule } from './vote/vote.module';
import { NotificationModule } from './notification/notification.module';
import { MailModule } from './mail/mail.module';
import { AdminModule } from './admin/admin.module';
import { AlertModule } from './alert/alert.module';
import { ExportModule } from './export/export.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    PrismaModule,
    MailModule,
    AuthModule,
    UserModule,
    CommuneModule,
    AirQualityModule,
    MeteoModule,
    CollecteModule,
    FavoriteModule,
    CategoryModule,
    TopicModule,
    CommentModule,
    VoteModule,
    NotificationModule,
    AdminModule,
    AlertModule,
    ExportModule,
  ],
})
export class AppModule {}
