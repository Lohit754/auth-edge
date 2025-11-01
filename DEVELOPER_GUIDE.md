# Developer Guide

## Development Workflow

### Initial Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Create database and schema
npm run db:push

# Seed with test data
npm run seed

# Start development server
npm run dev
```

### Daily Development

```bash
# Start server (auto-reloads on changes)
npm run dev

# Run tests in watch mode
npm run test:watch

# Format code
npm run format

# Lint code
npm run lint
```

### Database Changes

```bash
# After modifying schema.prisma:

# Option 1: Push changes directly (dev only)
npm run db:push

# Option 2: Create a migration (recommended)
npm run migrate:dev

# Regenerate Prisma client
npm run prisma:generate

# Re-seed database
npm run seed
```

### Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With UI
npm run test:ui

# Specific test file
npx vitest run src/tests/unit/jwt.test.ts
```

## Common Tasks

### Complete REST API Endpoint Reference

| Method | Endpoint | Description | Auth Required | Permissions |
|--------|----------|-------------|---------------|-------------|
| `GET` | `/health` | Health check | No | None |
| `POST` | `/auth/register` | Register new user | No | None |
| `POST` | `/auth/login` | Login and get tokens | No | None |
| `POST` | `/auth/refresh` | Refresh access token | Cookie | None |
| `POST` | `/auth/logout` | Logout and revoke tokens | Cookie | None |
| `GET` | `/me` | Get current user profile | Bearer | None |
| `GET` | `/admin/secret` | Admin test endpoint | Bearer | `VIEW_USERS` + `VIEW_ROLES` |
| `GET` | `/users` | List all users | Bearer | `VIEW_USERS` |
| `GET` | `/users/:id` | Get user by ID | Bearer | `VIEW_USERS` or self |
| `GET` | `/users/:id/role` | Get user's role | Bearer | `VIEW_USERS` or self |
| `PUT` | `/users/:id/role` | Set user's role | Bearer | `ASSIGN_ROLE` |
| `GET` | `/roles` | List all roles | Bearer | `VIEW_ROLES` |
| `GET` | `/roles/:id` | Get role by ID | Bearer | `VIEW_ROLES` |
| `POST` | `/roles` | Create new role | Bearer | `CREATE_ROLE` |
| `PATCH` | `/roles/:id` | Update role | Bearer | `EDIT_ROLE` |
| `DELETE` | `/roles/:id` | Delete role | Bearer | `DELETE_ROLE` |

### Test REST API with curl

**Complete Authentication Flow:**

```bash
# 1. Register a new user
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"Password1!"}'

# Response: { "id": "...", "email": "dev@example.com", "role": "USER", ... }

# 2. Login and save cookies
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Password1!"}' \
  -c cookies.txt \
  -v

# Response includes accessToken in JSON body
# Refresh token is saved to cookies.txt

# 3. Save the access token to a variable
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  # Copy from login response

# 4. Get your profile
curl http://localhost:4000/me \
  -H "Authorization: Bearer $TOKEN"

# Response: { "id": "...", "email": "admin@example.com", "role": "ADMIN" }

# 5. Refresh access token (when it expires after 15 minutes)
curl -X POST http://localhost:4000/auth/refresh \
  -b cookies.txt \
  -c cookies.txt

# Response: { "accessToken": "new_token_here..." }
# New refresh token is saved to cookies.txt

# 6. Access admin-only endpoint
curl http://localhost:4000/admin/secret \
  -H "Authorization: Bearer $TOKEN"

# Response: { "secret": "This is a secret message only admins can see! 🔐", "admin": "admin@example.com" }

# 7. Logout (revokes refresh token)
curl -X POST http://localhost:4000/auth/logout \
  -b cookies.txt

# Response: 204 No Content
```

**User Management (Requires VIEW_USERS permission):**

```bash
# Get all users with optional search
curl http://localhost:4000/users \
  -H "Authorization: Bearer $TOKEN"

# Response: { "total": 4, "users": [...] }

# Search users by email (case-insensitive, partial match)
curl "http://localhost:4000/users?search=admin" \
  -H "Authorization: Bearer $TOKEN"

# Get a specific user by ID
curl http://localhost:4000/users/USER_ID \
  -H "Authorization: Bearer $TOKEN"

# Response: { "id": "...", "email": "user@example.com", "role": {...}, "createdAt": "..." }

# Get a user's role
curl http://localhost:4000/users/USER_ID/role \
  -H "Authorization: Bearer $TOKEN"

# Response: { "id": "...", "name": "ADMIN", "permissions": [...], "createdAt": "...", "updatedAt": "..." }

# Set/update a user's role (Requires ASSIGN_ROLE permission)
curl -X PUT http://localhost:4000/users/USER_ID/role \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"roleId":"ROLE_ID"}'

# To remove a user's role (set to null)
curl -X PUT http://localhost:4000/users/USER_ID/role \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"roleId":null}'

# Response: { "id": "...", "name": "Admin", "permissions": [...], ... }
```

**Role Management (CRUD Operations):**

```bash
# List all roles (Requires VIEW_ROLES permission)
curl http://localhost:4000/roles \
  -H "Authorization: Bearer $TOKEN"

# Response: [{ "id": "...", "name": "Admin", "permissions": [...], "createdAt": "...", "updatedAt": "..." }, ...]

# Get a specific role (Requires VIEW_ROLES permission)
curl http://localhost:4000/roles/ROLE_ID \
  -H "Authorization: Bearer $TOKEN"

# Response: { "id": "...", "name": "Admin", "permissions": [...], "createdAt": "...", "updatedAt": "..." }

# Create a new role (Requires CREATE_ROLE permission)
curl -X POST http://localhost:4000/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Moderator",
    "permissions": ["VIEW_USERS", "VIEW_ROLES"]
  }'

# Response: { "id": "...", "name": "Moderator", "permissions": ["VIEW_USERS", "VIEW_ROLES"], ... }

# Update a role (Requires EDIT_ROLE permission)
curl -X PATCH http://localhost:4000/roles/ROLE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Senior Moderator",
    "permissions": ["VIEW_USERS", "VIEW_ROLES", "ASSIGN_ROLE"]
  }'

# Response: { "id": "...", "name": "Senior Moderator", "permissions": [...], ... }

# Delete a role (Requires DELETE_ROLE permission)
# Note: Will fail if role is assigned to any users
curl -X DELETE http://localhost:4000/roles/ROLE_ID \
  -H "Authorization: Bearer $TOKEN"

# Response: 204 No Content (success)
# Or 400 Bad Request if role has users assigned
```

**Quick Test with Non-Admin User:**

```bash
# Login as regular user
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@example.com","password":"Password1!"}' \
  | jq -r '.accessToken'

# Try to access admin endpoint (should fail with 403)
curl http://localhost:4000/admin/secret \
  -H "Authorization: Bearer USER_TOKEN" \
  -w "\nStatus: %{http_code}\n"

# Response: 403 Forbidden
```

**Health Check:**

```bash
curl http://localhost:4000/health
# Response: { "status": "ok", "timestamp": "2024-11-01T12:00:00.000Z" }
```

### Test GraphQL API

#### Complete GraphQL Operations Reference

**Queries:**

| Operation | Description | Auth Required | Permissions |
|-----------|-------------|---------------|-------------|
| `me` | Get current user profile | Bearer | None |
| `users` | List all users | Bearer | `VIEW_USERS` |
| `roles` | List all roles | Bearer | `VIEW_ROLES` |
| `role(id)` | Get specific role | Bearer | `VIEW_ROLES` |
| `userRole(userId)` | Get user's role | Bearer | `VIEW_USERS` or self |

**Mutations:**

| Operation | Description | Auth Required | Permissions |
|-----------|-------------|---------------|-------------|
| `register` | Register new user | No | None |
| `login` | Login and get tokens | No | None |
| `refreshToken` | Refresh access token | Cookie | None |
| `logout` | Logout and revoke tokens | Cookie | None |
| `createRole` | Create new role | Bearer | `CREATE_ROLE` |
| `updateRole` | Update existing role | Bearer | `EDIT_ROLE` |
| `deleteRole` | Delete role | Bearer | `DELETE_ROLE` |
| `setUserRole` | Set user's role | Bearer | `ASSIGN_ROLE` |

#### GraphQL Playground Examples

Visit http://localhost:4000/graphql and try:

```graphql
# 1. Register a new user
mutation {
  register(email: "newuser@example.com", password: "Password1!") {
    id
    email
    role {
      name
      permissions
    }
    permissions
    createdAt
  }
}

# 2. Login
mutation {
  login(email: "admin@example.com", password: "Password1!") {
    accessToken
    user {
      id
      email
      role {
        name
        permissions
      }
      permissions
    }
  }
}

# 3. Add token to HTTP HEADERS (bottom left in GraphQL Playground):
# {
#   "Authorization": "Bearer YOUR_TOKEN_HERE"
# }

# 4. Query your profile
query {
  me {
    id
    email
    role {
      id
      name
      permissions
    }
    permissions
    createdAt
    updatedAt
  }
}

# 5. List all users (requires VIEW_USERS permission)
query {
  users {
    id
    email
    role {
      name
      permissions
    }
    permissions
    createdAt
  }
}

# 6. List all roles (requires VIEW_ROLES permission)
query {
  roles {
    id
    name
    permissions
    createdAt
    updatedAt
  }
}

# 7. Get a specific role (requires VIEW_ROLES permission)
query {
  role(id: "ROLE_ID") {
    id
    name
    permissions
    createdAt
  }
}

# 8. Get a user's role (requires VIEW_USERS or self-access)
query {
  userRole(userId: "USER_ID") {
    id
    name
    permissions
  }
}

# 9. Create a new role (requires CREATE_ROLE permission)
mutation {
  createRole(
    name: "Moderator"
    permissions: ["VIEW_USERS", "VIEW_ROLES"]
  ) {
    id
    name
    permissions
    createdAt
  }
}

# 10. Update a role (requires EDIT_ROLE permission)
mutation {
  updateRole(
    id: "ROLE_ID"
    name: "Senior Moderator"
    permissions: ["VIEW_USERS", "VIEW_ROLES", "ASSIGN_ROLE"]
  ) {
    id
    name
    permissions
    updatedAt
  }
}

# 11. Set user's role (requires ASSIGN_ROLE permission)
mutation {
  setUserRole(userId: "USER_ID", roleId: "ROLE_ID") {
    id
    name
    permissions
  }
}

# To remove a user's role, pass null for roleId:
mutation {
  setUserRole(userId: "USER_ID", roleId: null) {
    id
    name
    permissions
  }
}

# 12. Delete a role (requires DELETE_ROLE permission)
mutation {
  deleteRole(id: "ROLE_ID")
}

# 13. Refresh token (uses refresh_token cookie)
mutation {
  refreshToken {
    accessToken
    user {
      email
      role {
        name
      }
    }
  }
}

# 14. Logout
mutation {
  logout
}
```

**Using curl for GraphQL:**

```bash
# 1. Register via GraphQL
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation($email: String!, $password: String!) { register(email: $email, password: $password) { id email role { name permissions } permissions } }",
    "variables": {
      "email": "newuser@example.com",
      "password": "Password1!"
    }
  }'

# 2. Login via GraphQL
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "query": "mutation($email: String!, $password: String!) { login(email: $email, password: $password) { accessToken user { email role { name permissions } permissions } } }",
    "variables": {
      "email": "admin@example.com",
      "password": "Password1!"
    }
  }'

# Save the token from response
TOKEN="your_token_here"

# 3. Get current user
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"query { me { id email role { name permissions } permissions createdAt } }"}'

# 4. Get all users (requires VIEW_USERS permission)
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"query { users { id email role { name permissions } permissions createdAt } }"}'

# 5. List all roles (requires VIEW_ROLES permission)
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"query { roles { id name permissions createdAt } }"}'

# 6. Get a specific role (requires VIEW_ROLES permission)
ROLE_ID="clx123abc..."
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"query\":\"query { role(id: \\\"$ROLE_ID\\\") { id name permissions createdAt } }\"}"

# 7. Get user's role (requires VIEW_USERS or self-access)
USER_ID="clx123abc..."
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"query\":\"query { userRole(userId: \\\"$USER_ID\\\") { id name permissions } }\"}"

# 8. Create a new role (requires CREATE_ROLE permission)
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "mutation($name: String!, $permissions: [String!]!) { createRole(name: $name, permissions: $permissions) { id name permissions createdAt } }",
    "variables": {
      "name": "Moderator",
      "permissions": ["VIEW_USERS", "VIEW_ROLES"]
    }
  }'

# 9. Update a role (requires EDIT_ROLE permission)
ROLE_ID="clx123abc..."
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"query\": \"mutation { updateRole(id: \\\"$ROLE_ID\\\", name: \\\"Senior Moderator\\\", permissions: [\\\"VIEW_USERS\\\", \\\"VIEW_ROLES\\\", \\\"ASSIGN_ROLE\\\"]) { id name permissions updatedAt } }\"
  }"

# 10. Set user's role (requires ASSIGN_ROLE permission)
USER_ID="clx123abc..."
ROLE_ID="clx456def..."
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"query\":\"mutation { setUserRole(userId: \\\"$USER_ID\\\", roleId: \\\"$ROLE_ID\\\") { id name permissions } }\"}"

# To remove a user's role (set to null)
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"query\":\"mutation { setUserRole(userId: \\\"$USER_ID\\\", roleId: null) { id name permissions } }\"}"

# 11. Delete a role (requires DELETE_ROLE permission)
ROLE_ID="clx123abc..."
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"query\":\"mutation { deleteRole(id: \\\"$ROLE_ID\\\") }\"}"

# 12. Refresh token
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -c cookies.txt \
  -d '{"query":"mutation { refreshToken { accessToken user { email role { name } } } }"}'

# 13. Logout
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"query":"mutation { logout }"}'
```

## Permission System

### Available Permissions

The system has a flexible, permission-based RBAC system. Here are all available permissions:

**User Management:**
- `VIEW_USERS` - View user lists and profiles (others)
- `CREATE_USER` - Create new users
- `EDIT_USER` - Edit user information (others)
- `DELETE_USER` - Delete users

**Role Management:**
- `VIEW_ROLES` - View role lists and details
- `CREATE_ROLE` - Create new roles
- `EDIT_ROLE` - Edit existing roles
- `DELETE_ROLE` - Delete roles
- `ASSIGN_ROLE` - Assign roles to users

**System & Audit:**
- `VIEW_AUDIT_LOGS` - View audit logs (future use)
- `MANAGE_TOKENS` - Manage tokens (future use)
- `ADMIN_PANEL_ACCESS` - Access admin panel (future use)

### Self-Access Policy

All authenticated users have implicit permissions to:
- View their own profile (`/me`, `/users/:id` when `id` matches their own)
- View their own role (`/users/:id/role` when `id` matches their own)

These self-access permissions don't require explicit permission grants.

### Testing Permissions

```bash
# Get your current permissions
curl http://localhost:4000/me \
  -H "Authorization: Bearer $TOKEN"

# Response includes:
# {
#   "id": "...",
#   "email": "user@example.com",
#   "role": {
#     "name": "Admin",
#     "permissions": ["VIEW_USERS", "VIEW_ROLES", ...]
#   },
#   "permissions": ["VIEW_USERS", "VIEW_ROLES", ...]
# }
```

### Default Admin Role

When you seed the database, an "Admin" role is created with all permissions:

```json
{
  "name": "Admin",
  "permissions": [
    "VIEW_USERS",
    "CREATE_USER",
    "EDIT_USER",
    "DELETE_USER",
    "VIEW_ROLES",
    "CREATE_ROLE",
    "EDIT_ROLE",
    "DELETE_ROLE",
    "ASSIGN_ROLE",
    "VIEW_AUDIT_LOGS",
    "MANAGE_TOKENS",
    "ADMIN_PANEL_ACCESS"
  ]
}
```

## Debugging

### View Database Content

```bash
# Open Prisma Studio
npx prisma studio

# Or use sqlite3 directly
sqlite3 dev.db "SELECT * FROM User;"
sqlite3 dev.db "SELECT * FROM RefreshToken;"
```

### Check Environment

```bash
# Verify environment variables are loaded
node -e "require('dotenv').config(); console.log(process.env.ACCESS_TOKEN_SECRET)"
```

### Common Issues

**"Invalid environment variables"**
- Check `.env` file exists
- Ensure JWT secrets are at least 32 characters

**"prisma not found"**
```bash
npm run prisma:generate
```

**Database locked**
```bash
# Delete and recreate
rm dev.db dev.db-journal
npm run db:push
npm run seed
```

**Port in use**
```bash
# Find process
lsof -i :4000

# Kill process
kill -9 PID

# Or change PORT in .env
```

## Code Organization

### Adding a New REST Endpoint

1. Create route handler in `src/routes/`
2. Add middleware if needed (auth, roles)
3. Import and mount in `src/app.ts`
4. Write integration test in `src/tests/integration/`

### Adding a New GraphQL Operation

1. Add type/query/mutation to `src/graphql/schema.ts`
2. Implement resolver in `src/graphql/resolvers/`
3. Export from `src/graphql/resolvers/index.ts`
4. Add permission checks if needed
5. Write test in `src/tests/integration/`

### Adding Business Logic

1. Create/update service in `src/services/`
2. Add Zod validation in `src/lib/validate.ts`
3. Write unit tests in `src/tests/unit/`
4. Use in route handlers and resolvers

## Production Deployment

### 1. Switch to PostgreSQL

Update `.env`:
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname?schema=public
```

Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 2. Generate Secrets

```bash
# Generate strong secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Build and Deploy

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run migrate:deploy

# Build TypeScript
npm run build

# Start production server
NODE_ENV=production npm start
```

### 4. Environment Variables for Production

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...
ACCESS_TOKEN_SECRET=<generated-secret>
REFRESH_TOKEN_SECRET=<generated-secret>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
CORS_ORIGIN=https://your-frontend.com
```

## Best Practices

### Security
- Never commit `.env` file
- Use environment-specific secrets
- Enable HTTPS in production
- Set `secure: true` for cookies in production
- Regularly rotate JWT secrets
- Keep dependencies updated

### Code Quality
- Run tests before committing: `npm test`
- Format code: `npm run format`
- Fix linting issues: `npm run lint`
- Write tests for new features
- Document complex logic

### Database
- Use migrations in production
- Backup database regularly
- Index frequently queried fields
- Monitor query performance

## Useful Commands

```bash
# View npm scripts
npm run

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json && npm install

# Check for outdated packages
npm outdated

# Update packages (carefully!)
npm update

# Generate Prisma migration
npm run migrate:dev -- --name descriptive_name

# Reset database (careful!)
npx prisma migrate reset

# Format Prisma schema
npx prisma format
```

## Resources

- [Prisma Docs](https://www.prisma.io/docs)
- [Apollo Server Docs](https://www.apollographql.com/docs/apollo-server/)
- [Express Docs](https://expressjs.com/)
- [Vitest Docs](https://vitest.dev/)
- [Zod Docs](https://zod.dev/)

---

Happy coding! 🚀


