import { Module } from '@nestjs/common';
import { SequencesModule } from '../sequences/sequences.module';
import { CashSessionsController } from './cash-sessions.controller';
import { CashSessionsService } from './cash-sessions.service';

@Module({
  imports: [SequencesModule],
  controllers: [CashSessionsController],
  providers: [CashSessionsService],
  exports: [CashSessionsService],
})
export class CashSessionsModule {}
