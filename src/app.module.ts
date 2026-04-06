import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
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
  ],
})
export class AppModule {}
