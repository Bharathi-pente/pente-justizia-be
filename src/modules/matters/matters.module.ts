import { Module } from '@nestjs/common';
import { MattersService } from './matters.service';

@Module({
  imports: [],
  providers: [MattersService],
  exports: [MattersService],
})
export class MattersModule {}
