import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'generated/prisma/client';
import { Pool } from 'pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly client: PrismaClient;

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const adapter = new PrismaPg(pool);
    this.client = new PrismaClient({ adapter });
  }

  get cell() {
    return this.client.cell;
  }
  get cellToken() {
    return this.client.cellToken;
  }
  get matter() {
    return this.client.matter;
  }

  get contact() {
    return this.client.contact;
  }
  get matterContact() {
    return this.client.matterContact;
  } // ← add this
  get syncLog() {
    return this.client.syncLog;
  }
  get activity() {
    return this.client.activity;
  }

  get document() {
    return this.client.document;
  }
  get bill() {
    return this.client.bill;
  }

  get task() {
    return this.client.task;
  }
  get $queryRaw() {
    return this.client.$queryRaw.bind(this.client);
  }
  async onModuleInit(): Promise<void> {
    this.logger.log('Connecting to database...');
    await this.client.$connect();
    this.logger.log('✅ Database connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
