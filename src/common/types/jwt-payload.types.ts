export interface JwtPayload {
  sub: string; // Keycloak user UUID
  email: string;
  name: string;
  realm_access: {
    roles: string[]; // ['hq_admin'] or ['cell_solicitor'] etc
  };
  cell_id?: string; // For cell_* roles — their cell UUID
  funded_cell_ids?: string[]; // For funder role — array of funded cell UUIDs
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}
