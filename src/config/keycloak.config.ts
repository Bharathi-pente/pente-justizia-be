import { KeycloakConnectOptions } from "nest-keycloak-connect";

export const keycloakConfig = (): KeycloakConnectOptions => ({
  authServerUrl:
    process.env.KEYCLOAK_AUTH_SERVER_URL || "http://localhost:8080",
  realm: process.env.KEYCLOAK_REALM || "justizia",
  clientId: process.env.KEYCLOAK_CLIENT_ID || "justizia-backend",
  secret: process.env.KEYCLOAK_CLIENT_SECRET || "",
  cookieKey: "KEYCLOAK_JWT",
  logLevels: ["verbose"],
  useNestLogger: true,
});

export const keycloakAdminConfig = () => ({
  authServerUrl:
    process.env.KEYCLOAK_AUTH_SERVER_URL || "http://localhost:8080",
  realm: process.env.KEYCLOAK_REALM || "justizia",
  adminClientId: process.env.KEYCLOAK_ADMIN_CLIENT_ID || "admin-cli",
  adminUsername: process.env.KEYCLOAK_ADMIN_USERNAME || "admin",
  adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD || "admin",
});
