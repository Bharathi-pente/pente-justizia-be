// src/modules/sync/sync.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncLogService } from './sync-log.service';
import { MattersService } from '../matters/matters.service';
import { ContactsService } from '../contacts/contacts.service';
import { BillingsService } from '../billings/billings.service';
import { TasksService } from '../tasks/tasks.service';
import { DocumentsService } from '../documents/documents.service';
import { ActivitiesService } from '../activities/activities.service';
import { ClioClientService } from '../clio/clio-client.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ClioModule } from '../clio/clio.module';

@Module({
  imports: [PrismaModule, forwardRef(() => ClioModule)],
  providers: [
    SyncService,
    SyncLogService,
    ClioClientService,
    MattersService,
    ContactsService,
    BillingsService,
    TasksService,
    DocumentsService,
    ActivitiesService,
  ],
  exports: [SyncService, SyncLogService],
})
export class SyncModule {}
