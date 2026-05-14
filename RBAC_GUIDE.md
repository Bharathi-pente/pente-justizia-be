# Justizia RBAC Implementation Guide

## Role-Based Access Control Matrix

This document describes how access control is implemented in the Justizia platform.

---

## Roles & Access Levels

### HQ Roles (Justizia HQ Team)

#### 1. **hq_admin** (HQ Administrator)
- **Access**: ALL cells
- **Read**: Everything
- **Write**: Full CRUD on all resources
- **Endpoints**: All endpoints available

#### 2. **hq_compliance** (Maya/Mo - Compliance Officers)
- **Access**: ALL cells
- **Read**: Compliance data, audit data, cases (read-only)
- **Write**: Compliance issues, audit schedules
- **Endpoints**:
  - ✅ `/api/compliance/*` - Full access
  - ✅ `/api/audit/*` - Full access
  - ✅ `/api/cases` - Read-only
  - ✅ `/api/users` - Read-only
  - ✅ `/api/cells` - Read-only

#### 3. **hq_bdm** (Jeff - Business Development Manager)
- **Access**: ALL cells
- **Read**: Cases, funding, insurance (read-only), cell pipeline
- **Write**: None
- **Endpoints**:
  - ✅ `/api/cases` - Read-only
  - ✅ `/api/funding` - Read-only
  - ✅ `/api/insurance` - Read-only
  - ✅ `/api/cells` - Read-only
  - ✅ `/api/dashboard` - Read-only

---

### Cell Roles (Cell-Level Users)

#### 4. **cell_admin** (Cell Operator)
- **Access**: OWN cell ONLY
- **Read**: Everything within own cell
- **Write**: Full CRUD within own cell
- **Scoping**: `cell_id` from JWT custom claim
- **Endpoints**:
  - ✅ `/api/cases` - Own cell only
  - ✅ `/api/compliance/*` - Own cell only
  - ✅ `/api/audit/*` - Own cell only
  - ✅ `/api/clio/*` - Own cell only
  - ✅ `/api/dashboard` - Own cell data

#### 5. **cell_solicitor** (Solicitor)
- **Access**: OWN cell ONLY
- **Read**: Cases, documents within own cell
- **Write**: Cases, documents within own cell
- **Scoping**: `cell_id` from JWT
- **Endpoints**:
  - ✅ `/api/cases` - Own cell only
  - ✅ `/api/dashboard` - Own cell data

#### 6. **cell_paralegal** (Paralegal)
- **Access**: OWN cell ONLY
- **Read**: Cases (read-only) within own cell
- **Write**: None
- **Scoping**: `cell_id` from JWT
- **Endpoints**:
  - ✅ `/api/cases` - Read-only, own cell

---

### External Stakeholder Roles

#### 7. **funder** (7 Stars Capital)
- **Access**: FUNDED cells ONLY
- **Read**: Cases, funding data for funded cells
- **Write**: None
- **Scoping**: `funded_cell_ids[]` from JWT (array of cell UUIDs)
- **Endpoints**:
  - ✅ `/api/cases` - Funded cells only
  - ✅ `/api/funding` - Funded cells only
  - ✅ `/api/dashboard` - Aggregated funded cells data

#### 8. **insurer** (FairShield ATE)
- **Access**: ALL cells
- **Read**: Insurance/ATE data ONLY across all cells
- **Write**: None
- **Scoping**: No cell restriction, but resource-level restriction
- **Endpoints**:
  - ✅ `/api/insurance` - All cells, read-only
  - ✅ `/api/dashboard` - Insurance KPIs

---

## Implementation

### Guards Applied

All controllers use the following guard chain:

```typescript
@UseGuards(KeycloakAuthGuard, RolesGuard, CellScopeGuard)
```

**Order matters:**
1. **KeycloakAuthGuard** - Validates JWT token
2. **RolesGuard** - Checks user has required role(s)
3. **CellScopeGuard** - Enforces cell-level scoping

### How Cell Scoping Works

The `CellScopeGuard` attaches `cell_ids[]` to the request based on role:

```typescript
// HQ roles
if (role === 'hq_admin' || 'hq_compliance' || 'hq_bdm') {
  request.cell_ids = ['*']; // Wildcard - all cells
}

// Cell roles
if (role === 'cell_admin' || 'cell_solicitor' || 'cell_paralegal') {
  request.cell_ids = [user.cell_id]; // Single cell from JWT
}

// Funder
if (role === 'funder') {
  request.cell_ids = user.funded_cell_ids; // Array from JWT
}

// Insurer
if (role === 'insurer') {
  request.cell_ids = ['*']; // All cells, but resource-scoped
}
```

Services then filter data based on `request.cell_ids`:

```typescript
// In controller
@Get()
async findAll(@Request() req: RequestWithUser) {
  const cellIds = req.cell_ids;
  
  if (cellIds[0] === '*') {
    return this.service.findAll(); // All data
  } else {
    return this.service.findByCellIds(cellIds); // Scoped data
  }
}
```

---

## JWT Custom Claims

Keycloak must inject these custom claims into the access token:

```json
{
  "sub": "keycloak-user-uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "realm_access": {
    "roles": ["hq_admin"]
  },
  "cell_id": "cell-uuid-here",           // For cell_* roles
  "funded_cell_ids": ["uuid1", "uuid2"]  // For funder role
}
```

### Setting Up Custom Claims in Keycloak

1. Create User Attributes:
   - Add `cell_id` attribute to cell users
   - Add `funded_cell_ids` attribute to funder users

2. Create Token Mappers:
   - Mapper 1: User Attribute → `cell_id` → String
   - Mapper 2: User Attribute → `funded_cell_ids` → JSON

---

## Example Access Scenarios

### Scenario 1: Cell Admin Views Cases

**User**: Sarah (cell_admin)
**Cell ID**: `abc-123`

```typescript
GET /api/cases

// CellScopeGuard extracts cell_id from JWT
request.cell_ids = ['abc-123']

// Service filters:
SELECT * FROM cases WHERE cell_id = 'abc-123'
```

### Scenario 2: Funder Views Funding Data

**User**: 7 Stars Finance (funder)
**Funded Cells**: `['abc-123', 'def-456']`

```typescript
GET /api/funding

// CellScopeGuard extracts funded_cell_ids from JWT
request.cell_ids = ['abc-123', 'def-456']

// Service filters:
SELECT * FROM funding WHERE cell_id IN ('abc-123', 'def-456')
```

### Scenario 3: HQ Compliance Views All Issues

**User**: Maya (hq_compliance)

```typescript
GET /api/compliance/issues

// CellScopeGuard sets wildcard
request.cell_ids = ['*']

// Service returns:
SELECT * FROM compliance_issues
// No cell filter - all data returned
```

### Scenario 4: Insurer Views Insurance Data

**User**: FairShield (insurer)

```typescript
GET /api/insurance

// CellScopeGuard sets wildcard (insurer sees all cells)
request.cell_ids = ['*']

// But controller is resource-scoped to insurance endpoints only
// Insurer cannot access /api/cases, /api/funding, etc.
```

---

## Decorator Usage

### @Roles(...roles)

Restrict endpoint to specific roles:

```typescript
@Get()
@Roles('hq_admin', 'hq_compliance')
async findAll() {
  // Only hq_admin and hq_compliance can access
}
```

### @Public()

Bypass authentication (health checks, webhooks):

```typescript
@Get('health')
@Public()
getHealth() {
  // No auth required
}
```

---

## Testing RBAC

Create test users in Keycloak with different roles:

```bash
# HQ Admin
- Username: admin@justizia.com
- Role: hq_admin

# Cell Admin
- Username: cell1-admin@example.com
- Role: cell_admin
- cell_id: abc-123

# Funder
- Username: funder@7stars.com
- Role: funder
- funded_cell_ids: ["abc-123", "def-456"]
```

Get tokens for each user and test access:

```bash
# Get token
TOKEN=$(curl -X POST 'http://localhost:8080/realms/justizia/protocol/openid-connect/token' \
  -d 'grant_type=password' \
  -d 'client_id=justizia-backend' \
  -d 'client_secret=SECRET' \
  -d 'username=admin@justizia.com' \
  -d 'password=password' | jq -r .access_token)

# Test endpoint
curl http://localhost:3001/api/cases \
  -H "Authorization: Bearer $TOKEN"
```

---

## Security Best Practices

1. **Always use guards** - Never skip `@UseGuards()` on protected endpoints
2. **Validate cell_id** - CellScopeGuard prevents cross-cell access attempts
3. **Filter at query level** - Don't fetch all data then filter in code
4. **Audit all mutations** - AuditLogInterceptor logs all POST/PUT/PATCH/DELETE
5. **Use HTTPS in production** - Never send tokens over HTTP
6. **Rotate secrets** - Change KEYCLOAK_CLIENT_SECRET and ENCRYPTION_KEY regularly

---

## Future Enhancements

- [ ] Add row-level security in PostgreSQL
- [ ] Implement rate limiting per role
- [ ] Add permission-based (not just role-based) access
- [ ] Implement data masking for sensitive fields
- [ ] Add MFA requirement for HQ admin role
