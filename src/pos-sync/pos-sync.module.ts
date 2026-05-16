import { Module } from '@nestjs/common';
import { PosSyncController } from './pos-sync.controller';
import { PosSyncService } from './pos-sync.service';

@Module({
  controllers: [PosSyncController],
  providers: [PosSyncService],
  exports: [PosSyncService],
})
export class PosSyncModule {}
