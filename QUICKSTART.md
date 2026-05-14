# Justizia Backend - Quick Start Guide

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
cd pente-justizia-be
npm install
```

### 2. Start Infrastructure Services

Start Keycloak and Redis using Docker Compose:

```bash
docker-compose up -d
```

This will start:
- **Keycloak** on http://localhost:8080
- **Redis** on localhost:6379

### 3. Configure Keycloak

1. Access Keycloak Admin Console: http://localhost:8080
2. Login with credentials: `admin` / `admin`
3. Create a new realm called `justizia`
4. Create a client called `justizia-backend`:
   - Client Protocol: `openid-connect`
   - Access Type: `confidential`
   - Valid Redirect URIs: `http://localhost:3001/*`
   - Enable "Service Accounts Enabled"
5. Note the client secret from the Credentials tab
6. Update `.env` file with the client secret

### 4. Configure Realm Roles

Create the following roles in Keycloak:
- `hq_admin` - Full access to all cells
- `hq_compliance` - Compliance officer access
- `hq_bdm` - Business development manager
- `cell_admin` - Cell administrator
- `cell_solicitor` - Cell solicitor
- `cell_paralegal` - Cell paralegal
- `funder` - Funding company (7 Stars)
- `insurer` - Insurance company (FairShield)

### 5. Add Custom JWT Claims

Configure a Token Mapper to add custom claims to the JWT:

1. Go to Client Scopes → `justizia-backend` → Mappers
2. Create a mapper for `cell_id`:
   - Mapper Type: User Attribute
   - User Attribute: `cell_id`
   - Token Claim Name: `cell_id`
   - Claim JSON Type: String
3. Create a mapper for `funded_cell_ids`:
   - Mapper Type: User Attribute
   - User Attribute: `funded_cell_ids`
   - Token Claim Name: `funded_cell_ids`
   - Claim JSON Type: JSON

### 6. Environment Variables

Update your `.env` file with the following:

```env
# Keycloak Client Secret (from step 3)
KEYCLOAK_CLIENT_SECRET=your-actual-client-secret

# AWS S3 (if using file storage)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret

# Clio OAuth (get from Clio developer portal)
CLIO_CLIENT_ID=your-clio-client-id
CLIO_CLIENT_SECRET=your-clio-client-secret

# Change encryption key for production
ENCRYPTION_KEY=generate-a-secure-32-character-key
```

### 7. Run Database Migrations

Generate and run the initial migration:

```bash
# Generate migration from entities
npm run typeorm migration:generate -- -n InitialMigration

# Run migrations
npm run migration:run
```

### 8. Seed Initial Data (Optional)

```bash
npm run seed
```

### 9. Start the Development Server

```bash
npm run start:dev
```

The API will be available at:
- **API**: http://localhost:3001/api
- **Swagger Docs**: http://localhost:3001/api/docs
- **Health Check**: http://localhost:3001/api/health

---

## 📁 Project Structure

```
src/
├── config/              # Configuration modules
├── common/              # Shared utilities (guards, decorators, etc.)
├── database/            # Migrations and seeds
├── modules/             # Feature modules
│   ├── auth/           # Authentication
│   ├── users/          # User management
│   ├── cells/          # Cell management
│   ├── clio/           # Clio integration
│   ├── cases/          # Case management
│   ├── compliance/     # SRA compliance tracking
│   ├── audit/          # Audit schedules & logs
│   ├── funding/        # Funding data (7 Stars)
│   ├── insurance/      # Insurance policies (FairShield)
│   ├── dashboard/      # Role-based dashboards
│   └── notifications/  # User notifications
├── queues/             # BullMQ job queues
├── main.ts             # Application bootstrap
└── app.module.ts       # Root module
```

---

## 🔐 Authentication

All endpoints (except health check) require a valid Keycloak JWT token.

### Getting a Token

Use Keycloak's token endpoint:

```bash
curl -X POST 'http://localhost:8080/realms/justizia/protocol/openid-connect/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=password' \
  -d 'client_id=justizia-backend' \
  -d 'client_secret=YOUR_CLIENT_SECRET' \
  -d 'username=YOUR_USERNAME' \
  -d 'password=YOUR_PASSWORD'
```

Use the `access_token` from the response in your API requests:

```bash
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🎯 API Endpoints

### Auth
- `GET /api/auth/me` - Get current user profile

### Users (HQ Admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Cells (HQ Admin only)
- `GET /api/cells` - List all cells
- `POST /api/cells` - Create cell
- `PATCH /api/cells/:id` - Update cell
- `DELETE /api/cells/:id` - Delete cell

### Cases (Cell-scoped)
- `GET /api/cases` - List cases (scoped to user's accessible cells)
- `GET /api/cases/:id` - Get case details

### Compliance
- `GET /api/compliance/checklists` - Get SRA checklists
- `GET /api/compliance/issues` - Get compliance issues
- `GET /api/compliance/score/:cellId` - Get compliance score

### Funding (Funder role)
- `GET /api/funding` - Get funding data
- `GET /api/funding/exposure` - Get total exposure

### Insurance (Insurer role)
- `GET /api/insurance` - Get insurance policies
- `GET /api/insurance/exposure` - Get total ATE exposure

### Dashboard (All roles)
- `GET /api/dashboard` - Get role-specific dashboard data

---

## 🧪 Testing the API

Use the Swagger UI at http://localhost:3001/api/docs to explore and test endpoints.

---

## 📝 Next Steps

1. **Configure Keycloak realm and roles** as described above
2. **Run migrations** to create database schema
3. **Create test users** in Keycloak with different roles
4. **Test RBAC** by making API calls with different user tokens
5. **Set up Clio OAuth** for production Clio integration
6. **Configure AWS S3** for document storage

---

## 🐛 Troubleshooting

### Cannot connect to database
- Check DATABASE_URL in .env
- Verify network connectivity to Aiven PostgreSQL

### Keycloak connection failed
- Ensure Docker containers are running: `docker-compose ps`
- Check Keycloak is accessible at http://localhost:8080

### JWT validation errors
- Verify KEYCLOAK_REALM and KEYCLOAK_CLIENT_ID match your setup
- Check token hasn't expired
- Ensure custom claims are configured in Keycloak

---

## 📚 Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [TypeORM Documentation](https://typeorm.io)
- [BullMQ Documentation](https://docs.bullmq.io)
