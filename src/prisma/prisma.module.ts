import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() means PrismaService is available everywhere
// without needing to import PrismaModule in every module
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
