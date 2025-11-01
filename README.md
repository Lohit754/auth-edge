# SentinelAuth 🔐

A production-grade authentication backend built with Node.js, TypeScript, Express, GraphQL, and Prisma. Features JWT-based authentication with rotating refresh tokens, comprehensive role-based access control (RBAC) with fine-grained permissions, and comprehensive testing.

## 🚀 Quick Start

**For Interviewers:** See [SETUP_FOR_INTERVIEWER.md](SETUP_FOR_INTERVIEWER.md) for a one-page quick start guide.

See [QUICKSTART.md](QUICKSTART.md) for a 3-minute setup guide or [REST_API_GUIDE.md](REST_API_GUIDE.md) for complete API reference with curl examples.

**Prerequisites:** Node.js 20+ required. Check with `node --version`

```bash
# Install and setup
npm install
npx prisma generate
npx prisma db push
npm run seed

# Start server
npm run dev

# Test endpoints
curl http://localhost:4000/health
```

For detailed guides, see the [Documentation](#-documentation) section below.

## 🚀 Features

- **Dual API Support**: REST and GraphQL endpoints
- **JWT Authentication**: 
  - Short-lived access tokens (15m)
  - Rotating refresh tokens (7d) stored as hashed values
  - httpOnly, secure cookies for refresh tokens
- **Granular Role-Based Access Control (RBAC)**:
  - One-to-many user-role mapping (one user = one role)
  - Code-defined permissions constant (expandable)
  - Permission-based authorization (not hardcoded roles)
  - Role CRUD with hard delete
  - User role assignment endpoints
- **Security Best Practices**:
  - Bcrypt password hashing (cost factor: 12)
  - Token rotation on refresh
  - Secure cookie configuration
  - CORS with credentials support
- **GraphQL IDE**: In-app Apollo Server playground (dev only)
- **Database Flexibility**: SQLite for local development, PostgreSQL for QA/production
- **Comprehensive Testing**: Unit and integration tests with Vitest
- **Type Safety**: Full TypeScript coverage with strict mode

## 📋 Prerequisites

- **Node.js 20 or higher** (required - check with `node --version`)
- npm or yarn
- (Optional) PostgreSQL for production deployment

### Installing Node.js 20+

If you don't have Node.js 20+:

```bash
# Using nvm (recommended)
nvm install 20
nvm use 20
nvm alias default 20

# Or download from https://nodejs.org/
```

## 🛠️ Installation

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and update the secrets:

```bash
cp .env.example .env
```

**Important**: Replace the JWT secrets with long, random strings (minimum 32 characters). You can generate them using:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Edit `.env` and update:
```env
ACCESS_TOKEN_SECRET=your-generated-secret-here
REFRESH_TOKEN_SECRET=your-other-generated-secret-here
```

### 3. Initialize Database

For SQLite (local development):

```bash
npx prisma db push
```

Or for proper migrations:

```bash
npx prisma migrate dev
```

### 4. Seed Database

Create roles and test users:

```bash
npm run seed
```

This creates:
- **Roles**: ADMIN (all permissions), USER (view/edit self), SUPPORT (read-only access)
- **Admin**: `admin@example.com` / `Password1!` (ADMIN role)
- **Support**: `support@example.com` / `Password1!` (SUPPORT role)
- **User1-5**: `user1@example.com` / `Password1!` (USER role each)

### 5. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:4000`

## 📚 Documentation

- **[SETUP_FOR_INTERVIEWER.md](SETUP_FOR_INTERVIEWER.md)**: One-page quick start for interviewers/reviewers
- **[REST_API_GUIDE.md](REST_API_GUIDE.md)**: Complete REST API reference with curl examples for all endpoints
- **[QUICKSTART.md](QUICKSTART.md)**: Quick 3-minute setup guide
- **[ARCHITECTURE.md](ARCHITECTURE.md)**: System design and architecture decisions
- **[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)**: Development workflow, testing, and deployment
- **[MIGRATION_INSTRUCTIONS.md](MIGRATION_INSTRUCTIONS.md)**: Database setup instructions
- **[CHECKLIST.md](CHECKLIST.md)**: Progress tracker for all features and requirements

## 🔐 Role-Based Access Control (RBAC)

SentinelAuth implements a granular, permission-based RBAC system with one-to-many user-role mapping.

### Permission-First Authorization

**Key Principle**: Authorization checks are performed using **permissions**, not roles. User role is loaded once during authentication, and effective permissions (from the user's role) are computed and cached in the request context.

**Benefits:**
- **No N+1 queries**: Role and permissions are loaded once during JWT authentication
- **Fast authorization checks**: Permissions are available in memory (no DB queries)
- **Flexible role changes**: Update user role, and next request reflects new permissions
- **Single role per user**: Simpler data model, no duplicate data

### How It Works

1. **Authentication**: When a JWT token is verified, the system:
   - Loads the user with their assigned role
   - Computes effective permissions from the role
   - Attaches `user`, `role`, and `permissions` to the request/context

2. **Authorization**: Protected routes/resolvers check permissions from the request:
   ```typescript
   // REST
   requirePermissions('VIEW_USERS', 'EDIT_USER')
   
   // GraphQL
   ctx.requirePermissions('VIEW_USERS', 'EDIT_USER')
   ```

3. **No role checks**: The system never checks "is user ADMIN?", it checks "does user have permission X?"

### Permission Model

Permissions are defined as a **code-only constant** in `src/rbac/permissions.ts`:

```typescript
export const PERMISSIONS = [
  // User management
  'VIEW_USERS',
  'CREATE_USER',
  'EDIT_USER',
  'DELETE_USER',
  
  // Role management
  'VIEW_ROLES',
  'CREATE_ROLE',
  'EDIT_ROLE',
  'DELETE_ROLE',
  'ASSIGN_ROLE',
  
  // System
  'VIEW_AUDIT_LOGS',
  'MANAGE_TOKENS',
  
  // Self-service
  'VIEW_SELF',
  'EDIT_SELF',
] as const;
```

**Key Features:**
- Permissions are validated against this constant at runtime
- No database table for permissions (keeps it simple and fast)
- Add new permissions by editing the constant and redeploying
- Roles store their permissions as a JSON array (validated subset of PERMISSIONS)

### Roles

Roles are stored in the database and have:
- **name**: Unique identifier (ALL_CAPS_UNDERSCORE format, e.g., `ADMIN`, `SUPER_USER`)
- **permissions**: Array of permission strings (must be from PERMISSIONS constant)
- **users**: Prisma reverse relation field (virtual - not a database column, only for type system)
- **Hard delete**: Roles are permanently deleted when using DELETE endpoints

### One-to-One User-Role Mapping

- Each user can have **one role** via the `roleId` foreign key in the User table
- Users inherit **all permissions from their assigned role**
- Example: A user with the SUPPORT role has VIEW_USERS, VIEW_AUDIT_LOGS, and VIEW_ROLES permissions
- If a user has no role assigned (roleId is null), they have no special permissions but can still access self-service endpoints

### Default Roles

The seed creates three roles:
- **ADMIN**: All permissions (full system access)
- **USER**: VIEW_SELF, EDIT_SELF (basic self-service)
- **SUPPORT**: VIEW_USERS, VIEW_AUDIT_LOGS, VIEW_ROLES (read-only support)

## 📡 API Endpoints

### REST Endpoints

For complete API documentation with curl examples for every endpoint, see **[REST_API_GUIDE.md](REST_API_GUIDE.md)**.

| Method | Endpoint | Description | Required Permission |
|--------|----------|-------------|---------------------|
| **Auth** |
| POST | `/auth/register` | Register new user | None |
| POST | `/auth/login` | Login user | None |
| POST | `/auth/refresh` | Refresh access token | Refresh cookie |
| POST | `/auth/logout` | Logout user | None |
| **Profile** |
| GET | `/me` | Get current user with role and permissions | Bearer token |
| **Users** |
| GET | `/users` | Get all users | VIEW_USERS |
| GET | `/users/:id` | Get user by ID | VIEW_USERS or self+VIEW_SELF |
| GET | `/users/:id/role` | Get user's role | VIEW_USERS or self+VIEW_SELF |
| PUT | `/users/:id/role` | Set user's role | ASSIGN_ROLE |
| **Roles** |
| GET | `/roles` | List all roles | VIEW_ROLES |
| GET | `/roles/:id` | Get specific role | VIEW_ROLES |
| POST | `/roles` | Create new role | CREATE_ROLE |
| PATCH | `/roles/:id` | Update role | EDIT_ROLE |
| DELETE | `/roles/:id` | Delete role (soft) | DELETE_ROLE |
| **Admin** |
| GET | `/admin/secret` | Admin-only endpoint | VIEW_USERS, VIEW_ROLES |

### GraphQL Endpoint

Visit `http://localhost:4000/graphql` for the interactive GraphQL Playground (development only).

**Queries:**
```graphql
# Get current user with role and permissions (requires Bearer token in headers)
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
  }
}

# Get all users (requires VIEW_USERS permission)
query {
  users {
    id
    email
    role {
      name
      permissions
    }
  }
}

# Get all roles (requires VIEW_ROLES permission)
query {
  roles {
    id
    name
    permissions
    createdAt
    updatedAt
  }
}

# Get specific role (requires VIEW_ROLES permission)
query {
  role(id: "role-id") {
    id
    name
    permissions
    createdAt
    updatedAt
  }
}

# Get user's role (requires VIEW_USERS permission or self)
query {
  userRole(userId: "user-id") {
    id
    name
    permissions
  }
}
```

**Mutations:**
```graphql
# Register
mutation {
  register(email: "test@example.com", password: "Password1!") {
    id
    email
  }
}

# Login
mutation {
  login(email: "test@example.com", password: "Password1!") {
    accessToken
    user {
      id
      email
      role {
        name
        permissions
      }
    }
  }
}

# Refresh token (uses cookie automatically)
mutation {
  refreshToken {
    accessToken
    user {
      email
    }
  }
}

# Logout
mutation {
  logout
}

# Create role (requires CREATE_ROLE permission)
mutation {
  createRole(name: "EDITOR", permissions: ["VIEW_USERS", "EDIT_USER"]) {
    id
    name
    permissions
  }
}

# Update role (requires EDIT_ROLE permission)
mutation {
  updateRole(id: "role-id", permissions: ["VIEW_USERS", "EDIT_USER", "DELETE_USER"]) {
    id
    name
    permissions
  }
}

# Delete role (requires DELETE_ROLE permission)
mutation {
  deleteRole(id: "role-id")
}

# Set user role (requires ASSIGN_ROLE permission)
mutation {
  setUserRole(userId: "user-id", roleId: "role-id") {
    id
    name
    permissions
  }
}

# Remove user role (requires ASSIGN_ROLE permission)
mutation {
  setUserRole(userId: "user-id", roleId: null) {
    id
    name
    permissions
  }
}
```

## 🔐 RBAC Examples

For more examples with complete curl commands, see **[REST_API_GUIDE.md](REST_API_GUIDE.md)**.

### REST API Examples

#### 1. Login as Admin
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "Password1!"}' \
  -c cookies.txt
```

Save the `accessToken` from the response for subsequent requests.

#### 2. List All Roles (requires VIEW_ROLES)
```bash
curl http://localhost:4000/roles \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 3. Create New Role (requires CREATE_ROLE)
```bash
curl -X POST http://localhost:4000/roles \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "EDITOR",
    "permissions": ["VIEW_USERS", "EDIT_USER", "VIEW_SELF", "EDIT_SELF"]
  }'
```

#### 4. Update Role (requires EDIT_ROLE)
```bash
curl -X PATCH http://localhost:4000/roles/ROLE_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": ["VIEW_USERS", "EDIT_USER", "DELETE_USER", "VIEW_SELF", "EDIT_SELF"]
  }'
```

#### 5. Assign Role to User (requires ASSIGN_ROLE)
```bash
# Set user's role
curl -X PUT http://localhost:4000/users/USER_ID/role \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": "role-id"
  }'

# Remove role (set to null)
curl -X PUT http://localhost:4000/users/USER_ID/role \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": null
  }'
```

#### 6. View User's Role (requires VIEW_USERS or self+VIEW_SELF)
```bash
curl http://localhost:4000/users/USER_ID/role \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 7. Delete Role (requires DELETE_ROLE)
```bash
# Will fail if role is assigned to any users
curl -X DELETE http://localhost:4000/roles/ROLE_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Note:** Roles are hard deleted (permanently removed). Deletion is blocked with a 409 error if the role is assigned to users.

### Adding New Permissions

To add a new permission to the system:

1. **Edit `src/rbac/permissions.ts`**:
```typescript
export const PERMISSIONS = [
  // ... existing permissions ...
  'NEW_PERMISSION',
  'ANOTHER_PERMISSION',
] as const;
```

2. **Redeploy** (no database migration needed)

3. **Assign to roles** via API or seed:
```bash
curl -X PATCH http://localhost:4000/roles/ROLE_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": ["VIEW_USERS", "NEW_PERMISSION", "ANOTHER_PERMISSION"]
  }'
```

4. **Use in code**:
```typescript
// REST - Using middleware from middleware/roles
import { requirePermissions } from './middleware/roles';

router.get('/my-protected-route', 
  authenticate, 
  requirePermissions('NEW_PERMISSION'), 
  async (req, res) => {
    // Your route handler
    // Permissions are already loaded in req.permissions
  }
);

// GraphQL - Using context helpers
// In resolver
async myProtectedResolver(_parent: any, _args: any, ctx: GraphQLContext) {
  ctx.requirePermissions('NEW_PERMISSION');
  // Your resolver logic
  // Permissions are already loaded in ctx.permissions
}
```

### Authorization Enforcement

**Key Concept**: All authorization is permission-based. The system loads roles and permissions during authentication, so no additional database queries are needed for authorization checks.

**REST (Express middleware):**
```typescript
import { requirePermissions, requireAnyPermission } from '../middleware/roles';

// Require specific permissions (ALL required)
router.get('/users', authenticate, requirePermissions('VIEW_USERS'), handler);

// Require multiple permissions (ALL must be present)
router.post('/roles', authenticate, requirePermissions('CREATE_ROLE', 'EDIT_ROLE'), handler);

// Require at least ONE permission (OR semantics)
router.get('/dashboard', 
  authenticate, 
  requireAnyPermission('VIEW_USERS', 'VIEW_ROLES'), 
  handler
);

// Permissions are available in req.permissions as a Set
router.get('/my-route', authenticate, (req, res) => {
  if (req.permissions?.has('VIEW_USERS')) {
    // User has VIEW_USERS permission
  }
});
```

**GraphQL (in resolvers using context):**
```typescript
// In resolver - permissions are already loaded in context
async roles(_parent: any, _args: any, ctx: GraphQLContext) {
  ctx.requirePermissions('VIEW_ROLES');
  return getAllRoles();
}

// Check permissions programmatically
async myResolver(_parent: any, _args: any, ctx: GraphQLContext) {
  if (ctx.hasPermission('VIEW_USERS')) {
    // User has VIEW_USERS permission
  }
  // Or require them (throws if missing)
  ctx.requirePermissions('VIEW_USERS', 'EDIT_USER');
}
```

**Self-Access Pattern:**
```typescript
// Allow viewing own profile with VIEW_SELF, or others with VIEW_USERS
router.get('/users/:userId/role', authenticate, (req, res, next) => {
  if (req.user?.id === req.params.userId && req.permissions?.has('VIEW_SELF')) {
    return next();
  }
  if (req.permissions?.has('VIEW_USERS')) {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden' });
});
```

## 🧪 Testing

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run tests with UI:

```bash
npm run test:ui
```

### Test Coverage

- **Unit Tests**:
  - JWT token generation and verification
  - Password hashing and verification
  - RBAC permission resolution and enforcement
  - Permission validation
  - Auth service logic (register, login, refresh, logout)

- **Integration Tests**:
  - Complete REST authentication flow
  - Complete GraphQL authentication flow
  - RBAC enforcement on protected routes
  - Role CRUD operations
  - User role assignment
  - Permission-based access control
  - Token refresh and rotation
  - Cookie handling

## 🚢 Production Deployment

### 1. Switch to PostgreSQL

Update `.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/sentinelauth?schema=public
```

### 2. Update Prisma Schema

Edit `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Changed from sqlite
  url      = env("DATABASE_URL")
}
```

### 3. Run Migrations

```bash
npm run migrate:deploy
```

### 4. Seed Database (Optional)

```bash
npm run seed
```

### 5. Build and Start

```bash
npm run build
npm start
```

## 🏗️ Project Structure

```
auth-edge/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Database seeding script
├── src/
│   ├── config/
│   │   └── env.ts             # Environment configuration
│   ├── graphql/
│   │   ├── context.ts         # GraphQL context
│   │   ├── permissions.ts     # GraphQL auth guards
│   │   ├── schema.ts          # GraphQL type definitions
│   │   └── resolvers/         # GraphQL resolvers
│   ├── lib/
│   │   ├── jwt.ts             # JWT utilities
│   │   ├── password.ts        # Password hashing
│   │   └── validate.ts        # Zod validation schemas
│   ├── middleware/
│   │   ├── auth.ts            # JWT authentication
│   │   ├── cors.ts            # CORS configuration
│   │   ├── error.ts           # Error handling
│   │   └── roles.ts           # Legacy role middleware (deprecated)
│   ├── prisma/
│   │   └── client.ts          # Prisma client singleton
│   ├── rbac/
│   │   ├── permissions.ts     # Permission constant & validation
│   │   ├── rbac.ts            # Authorization helpers & middleware
│   │   └── validation.ts      # Role/permission validation schemas
│   ├── routes/
│   │   ├── admin.ts           # Admin routes
│   │   ├── auth.ts            # Auth routes
│   │   ├── me.ts              # User profile routes
│   │   ├── roles.ts           # Role CRUD routes
│   │   ├── users.ts           # User management routes
│   │   └── userRoles.ts       # User-role mapping routes
│   ├── services/
│   │   ├── authService.ts     # Auth business logic
│   │   ├── roleService.ts     # Role business logic
│   │   └── userService.ts     # User business logic
│   ├── tests/
│   │   ├── unit/              # Unit tests
│   │   └── integration/       # Integration tests
│   ├── types/
│   │   └── global.d.ts        # TypeScript declarations
│   ├── app.ts                 # Express app setup
│   └── server.ts              # Server bootstrap
├── .env.example               # Environment template
├── .eslintrc.json             # ESLint configuration
├── .prettierrc.json           # Prettier configuration
├── package.json
├── tsconfig.json
└── vitest.config.ts           # Test configuration
```

## 🔒 Security Notes

### Refresh Token Storage

- Refresh tokens are **never stored in plain text**
- They are hashed using SHA-256 before storage
- Each token has a unique `jti` (JWT ID) for tracking
- Tokens can be revoked by setting `revokedAt` timestamp

### Cookie Configuration

- `httpOnly`: Prevents JavaScript access
- `secure`: HTTPS only (disabled in development)
- `sameSite: 'strict'`: CSRF protection
- `path: '/auth/refresh'`: Limited scope

### Token Rotation

- Each refresh invalidates the old token
- Prevents token replay attacks
- Detects compromised tokens

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### RBAC Security

- **Permission-first authorization**: All checks use permissions, not roles
- **Loaded once per request**: Roles and permissions are fetched during JWT verification
- **No N+1 queries**: Authorization checks use in-memory Set (no DB queries)
- **Permissions validated at runtime**: Against the PERMISSIONS constant
- **Role names follow convention**: ALL_CAPS_UNDERSCORE format
- **Roles cannot be deleted if assigned**: Prevents orphaned user references
- **User effective permissions**: All permissions from the single assigned role
- **JWT tokens do NOT contain roles/permissions**: Fetched fresh on each request to ensure up-to-date access control

## 📚 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| NODE_ENV | Environment mode | development | No |
| PORT | Server port | 4000 | No |
| DATABASE_URL | Database connection string | file:./dev.db | Yes |
| ACCESS_TOKEN_SECRET | JWT access token secret | - | Yes |
| REFRESH_TOKEN_SECRET | JWT refresh token secret | - | Yes |
| ACCESS_TOKEN_TTL | Access token lifetime | 15m | No |
| REFRESH_TOKEN_TTL | Refresh token lifetime | 7d | No |
| CORS_ORIGIN | Allowed CORS origin | http://localhost:5173 | No |

## 🐛 Troubleshooting

### "Invalid environment variables" error

Make sure your `.env` file has both JWT secrets set with at least 32 characters each.

### Database connection errors

For SQLite, ensure the directory is writable. For PostgreSQL, verify connection string and credentials.

### Tests failing

Run `npm run db:push` to ensure the test database schema is up to date.

### CORS issues

Update `CORS_ORIGIN` in `.env` to match your frontend URL.

### "Invalid permissions" error

Ensure the permissions you're assigning to roles exist in the PERMISSIONS constant (`src/rbac/permissions.ts`).

### "Cannot delete role" error (409)

The role is assigned to one or more users. Remove all user-role assignments before deleting the role.

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please ensure:
- All tests pass (`npm test`)
- Code is formatted (`npm run format`)
- No linting errors (`npm run lint`)

---

Built with ❤️ using Node.js, TypeScript, Express, GraphQL, and Prisma.
