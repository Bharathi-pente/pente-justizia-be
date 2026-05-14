// src/modules/cells/cells.module.ts

import { Module } from '@nestjs/common';
import { CellsController } from './cells.controller';
import { CellsService } from './cells.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ClioModule } from '../clio/clio.module';

@Module({
  imports: [PrismaModule, ClioModule],
  controllers: [CellsController],
  providers: [CellsService],
  exports: [CellsService],
})
export class CellsModule {}
