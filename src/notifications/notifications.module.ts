import { Module } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './services/notifications.service';
import { NotificationQueueService } from './services/notification-queue.service';
import { NotificationTemplateService } from './services/notification-template.service';
import { WsAuthGuard } from './guards/ws-auth.guard';
import { AuthModule } from '../auth/auth.module';
import { I18nAppModule } from '../i18n/i18n.module';

@Module({
  imports: [AuthModule, I18nAppModule],
  providers: [
    NotificationsGateway,
    NotificationsService,
    NotificationQueueService,
    NotificationTemplateService,
    WsAuthGuard,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
