import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Record } from './entities/record.entity';
import { RecordEvent } from './entities/record-event.entity';
import { RecordSnapshot } from './entities/record-snapshot.entity';
import { RecordsController } from './controllers/records.controller';
import { RecordsService } from './services/records.service';
import { IpfsService } from './services/ipfs.service';
import { StellarService } from './services/stellar.service';
import { IpfsWithBreakerService } from './services/ipfs-with-breaker.service';
import { RecordEventStoreService } from './services/record-event-store.service';
import { CircuitBreakerModule } from '../common/circuit-breaker/circuit-breaker.module';
import { AccessControlModule } from '../access-control/access-control.module';
import { MedicalRbacModule } from '../roles/medical-rbac.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Record, RecordEvent, RecordSnapshot]),
    MulterModule.register({
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
    CircuitBreakerModule,
    forwardRef(() => AccessControlModule),
    MedicalRbacModule,
  ],
  controllers: [RecordsController],
  providers: [RecordsService, IpfsService, StellarService, IpfsWithBreakerService, RecordEventStoreService],
  exports: [RecordsService, IpfsWithBreakerService, RecordEventStoreService],
})
export class RecordsModule {}
