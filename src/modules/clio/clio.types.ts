// src/modules/clio/clio.types.ts

// ─── Generic ─────────────────────────────────────────────────────────────────

export interface ClioPagedResponse<T> {
  data: T[];
  meta?: {
    paging?: { next?: string };
    records?: number;
  };
}

// ─── OAuth ───────────────────────────────────────────────────────────────────

export interface ClioTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// ─── Matters ─────────────────────────────────────────────────────────────────
export interface ClioCustomFieldValue {
  field_name?: string;
  name?: string; // fallback key some Clio tiers use
  value?: string | null;
}

export interface ClioMatter {
  id: number;
  display_number: string;
  description: string | null;
  status: string;
  open_date: string | null;
  close_date: string | null;
  client: { id: number; name: string } | null;
  practice_area: { id: number; name: string } | null;
  matter_stage: { name: string } | null;
  custom_field_values?: ClioCustomFieldValue[]; // ← add this
  responsible_attorney?: { id: number; name: string }; // ← add this
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export interface ClioContact {
  id: number;
  name: string;
  type: string | null;
  email_addresses: { address: string; primary: boolean }[];
  phone_numbers: { number: string; primary: boolean }[];
  addresses: {
    city: string | null;
    country: string | null;
    primary: boolean;
  }[];
}

// ─── Bills ───────────────────────────────────────────────────────────────────

export interface ClioBill {
  id: number;
  number: string;
  status: string;
  issued_at: string | null;
  due_at: string | null;
  total: number;
  paid: number;
  due: number;
  matter: { id: number } | null;
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export interface ClioTask {
  id: number;
  name: string;
  status: string;
  priority: string | null;
  due_at: string | null;
  matter: { id: number } | null;
  assignee: { name: string } | null;
}

// ─── Documents ───────────────────────────────────────────────────────────────

export interface ClioDocument {
  id: number;
  name: string;
  matter: { id: number } | null;
  document_category: { name: string } | null;
  versions_count: number;
}

// ─── Activities ──────────────────────────────────────────────────────────────

export interface ClioActivity {
  id: number;
  type: string;
  summary: string | null;
  quantity: number | null;
  date: string | null;
  matter: { id: number } | null;
}
