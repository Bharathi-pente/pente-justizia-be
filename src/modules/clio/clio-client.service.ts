// src/modules/clio/clio-client.service.ts

import { Injectable, Logger } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { ClioTokenService } from './clio-token.service';
import type {
  ClioMatter,
  ClioContact,
  ClioBill,
  ClioTask,
  ClioDocument,
  ClioActivity,
  ClioPagedResponse,
} from './clio.types';

const CLIO_PAGE_LIMIT = 200;
const CLIO_MAX_PAGES = 50;

@Injectable()
export class ClioClientService {
  private readonly logger = new Logger(ClioClientService.name);

  constructor(private readonly tokenService: ClioTokenService) {}

  // ─── Generic paged fetcher ────────────────────────────────────────────────

  /**
   * Fetches all pages from a Clio list endpoint.
   *
   * Handles pagination, logs progress, enforces a page cap.
   * All per-entity fetchers delegate here — zero duplicated pagination logic.
   */
  private async fetchAllPages<T>(
    cellId: string,
    path: string,
    fields: string,
    label: string,
    extraParams: Record<string, string> = {}, // ← add this
  ): Promise<T[]> {
    const token = await this.tokenService.getValidAccessToken(cellId);
    const baseUrl = await this.tokenService.getClioBaseUrl(cellId);

    const client: AxiosInstance = axios.create({
      baseURL: baseUrl,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    let page = 1;
    let hasMore = true;
    const results: T[] = [];

    // while (hasMore) {
    //   this.logger.log(`[CLIO-CLIENT] ${label} — page ${page}`);

    //   const response: AxiosResponse<ClioPagedResponse<T>> = await client.get(
    //     path,
    //     {
    //       params: {
    //         limit: CLIO_PAGE_LIMIT,
    //         offset: (page - 1) * CLIO_PAGE_LIMIT,
    //         fields,
    //       },
    //     },
    //   );

    //   const pageItems = response.data?.data ?? [];
    //   results.push(...pageItems);

    //   this.logger.log(
    //     `[CLIO-CLIENT] ${label} — page ${page}: ${pageItems.length} records`,
    //   );

    //   hasMore = pageItems.length === CLIO_PAGE_LIMIT;
    //   page++;

    //   if (page > CLIO_MAX_PAGES) {
    //     this.logger.warn(
    //       `[CLIO-CLIENT] ${label} — hit ${CLIO_MAX_PAGES}-page cap, stopping`,
    //     );
    //     break;
    //   }
    // }

    while (hasMore) {
      this.logger.log(`[CLIO-CLIENT] ${label} — page ${page}`);

      try {
        // ← wrap in try/catch
        const response: AxiosResponse<ClioPagedResponse<T>> = await client.get(
          path,
          {
            params: {
              limit: CLIO_PAGE_LIMIT,
              offset: (page - 1) * CLIO_PAGE_LIMIT,
              fields,
              ...extraParams,
            },
          },
        );

        const pageItems = response.data?.data ?? [];
        results.push(...pageItems);

        this.logger.log(
          `[CLIO-CLIENT] ${label} — page ${page}: ${pageItems.length} records`,
        );

        hasMore = pageItems.length === CLIO_PAGE_LIMIT;
        page++;

        if (page > CLIO_MAX_PAGES) {
          this.logger.warn(
            `[CLIO-CLIENT] ${label} — hit ${CLIO_MAX_PAGES}-page cap, stopping`,
          );
          break;
        }
      } catch (error: unknown) {
        // ← catch block
        if (axios.isAxiosError(error)) {
          this.logger.error(
            `[CLIO-CLIENT] ${label} — page ${page} ERROR: ${JSON.stringify(error.response?.data)}`,
          );
        }
        throw error; // ← rethrow so sync still fails properly
      }
    }
    this.logger.log(
      `[CLIO-CLIENT] ${label} — total fetched: ${results.length}`,
    );
    return results;
  }

  // ─── Per-entity fetchers ──────────────────────────────────────────────────

  async fetchMatters(cellId: string): Promise<ClioMatter[]> {
    return this.fetchAllPages<ClioMatter>(
      cellId,
      '/api/v4/matters.json',
      [
        'id',
        'display_number',
        'description',
        'status',
        'open_date',
        'close_date',
        'client{id,name}',
        'practice_area{id,name}',
        'matter_stage{name}',
        'custom_field_values{field_name,value}',
        'responsible_attorney{id,name}',
      ].join(','),
      'MATTERS',
    );
  }

  async fetchContacts(cellId: string): Promise<ClioContact[]> {
    return this.fetchAllPages<ClioContact>(
      cellId,
      '/api/v4/contacts.json',
      [
        'id',
        'name',
        'type',
        'email_addresses{address,primary}',
        'phone_numbers{number,primary}',
        'addresses{city,country,primary}',
      ].join(','),
      'CONTACTS',
    );
  }

  async fetchBills(cellId: string): Promise<ClioBill[]> {
    return this.fetchAllPages<ClioBill>(
      cellId,
      '/api/v4/bills.json',
      ['id', 'number', 'issued_at', 'due_at', 'total', 'paid', 'due'].join(','),
      'BILLS',
    );
  }
  async fetchTasks(cellId: string): Promise<ClioTask[]> {
    return this.fetchAllPages<ClioTask>(
      cellId,
      '/api/v4/tasks.json',
      [
        'id',
        'name',
        'status',
        'priority',
        'due_at',
        'matter{id}',
        'assignee{name}',
      ].join(','),
      'TASKS',
    );
  }

  async fetchDocuments(cellId: string): Promise<ClioDocument[]> {
    return this.fetchAllPages<ClioDocument>(
      cellId,
      '/api/v4/documents.json',
      ['id', 'name', 'created_at', 'content_type'].join(','), // ← removed matter{id} too, test bare minimum
      'DOCUMENTS',
    );
  }
  async fetchActivities(cellId: string): Promise<ClioActivity[]> {
    return this.fetchAllPages<ClioActivity>(
      cellId,
      '/api/v4/activities.json',
      ['id', 'type', 'summary', 'quantity', 'date', 'matter{id}'].join(','),
      'ACTIVITIES',
    );
  }
}
