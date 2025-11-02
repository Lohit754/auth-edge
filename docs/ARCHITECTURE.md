# SentinelAuth - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT APPLICATIONS                      │
│                     (Web, Mobile, Desktop)                       │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
         ┌──────────────────┐      ┌──────────────────┐
         │   REST API       │      │   GraphQL API    │
         │   /auth/*        │      │   /graphql       │
         │   /me            │      │   (Apollo v4)    │
         │   /admin/*       │      │   + Playground   │
         └──────────────────┘      └──────────────────┘
                    │                         │
                    └────────────┬────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │   Express Middleware    │
                    │   • CORS                │
                    │   • Cookie Parser       │
                    │   • Request Logger      │
                    │   • Error Handler       │
                    └─────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
         ┌──────────────────┐      ┌──────────────────┐
         │  Auth Middleware │      │  GraphQL Context │
         │  • JWT Verify    │      │  • Extract User  │
         │  • User Lookup   │      │  • Inject Prisma │
         └──────────────────┘      └──────────────────┘
                    │                         │
                    └────────────┬────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │   Business Logic Layer  │
                    │   • authService         │
                    │   • userService         │
                    └─────────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   Data Access Layer     │
                    │   • Prisma Client       │
                    │   • Query Builder       │
                    └─────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
         ┌──────────────────┐      ┌──────────────────┐
         │  SQLite (Dev)    │      │ PostgreSQL (Prod)│
         │  file:./dev.db   │      │  (via URL)       │
         └──────────────────┘      └──────────────────┘
```

## Authentication Flow

```
┌──────────┐                                          ┌──────────┐
│  Client  │                                          │  Server  │
└─────┬────┘                                          └────┬─────┘
      │                                                    │
      │ 1. POST /auth/register                            │
      │    { email, password }                            │
      ├──────────────────────────────────────────────────>│
      │                                                    │
      │                                    [Hash password]│
      │                                    [Create user]  │
      │                                                    │
      │ 2. { id, email, role }                            │
      │<──────────────────────────────────────────────────┤
      │                                                    │
      │ 3. POST /auth/login                               │
      │    { email, password }                            │
      ├──────────────────────────────────────────────────>│
      │                                                    │
      │                                [Verify password]  │
      │                                [Generate tokens]  │
      │                                [Store refresh]    │
      │                                                    │
      │ 4. { accessToken }                                │
      │    Set-Cookie: refresh_token (httpOnly)           │
      │<──────────────────────────────────────────────────┤
      │                                                    │
      │ 5. GET /me                                        │
      │    Authorization: Bearer <accessToken>            │
      ├──────────────────────────────────────────────────>│
      │                                                    │
      │                                [Verify access JWT]│
      │                                [Lookup user]      │
      │                                                    │
      │ 6. { id, email, role }                            │
      │<──────────────────────────────────────────────────┤
      │                                                    │
      │ ... (15 minutes pass, access token expires) ...   │
      │                                                    │
      │ 7. POST /auth/refresh                             │
      │    Cookie: refresh_token                          │
      ├──────────────────────────────────────────────────>│
      │                                                    │
      │                              [Verify refresh JWT] │
      │                              [Check DB hash]      │
      │                              [Revoke old token]   │
      │                              [Generate new pair]  │
      │                              [Store new refresh]  │
      │                                                    │
      │ 8. { accessToken }                                │
      │    Set-Cookie: refresh_token (new)                │
      │<──────────────────────────────────────────────────┤
      │                                                    │
      │ 9. POST /auth/logout                              │
      │    Cookie: refresh_token                          │
      ├──────────────────────────────────────────────────>│
      │                                                    │
      │                              [Revoke refresh]     │
      │                              [Clear cookie]       │
      │                                                    │
      │ 10. 204 No Content                                │
      │     Clear-Cookie: refresh_token                   │
      │<──────────────────────────────────────────────────┤
      │                                                    │
```

## Token Structure

### Access Token (JWT)
```
Header:
{
  "alg": "HS256",
  "typ": "JWT"
}

Payload:
{
  "sub": "clx123abc...",     // User ID
  "email": "user@example.com",
  "role": "USER",
  "iat": 1234567890,
  "exp": 1234568790          // +15 minutes
}

Signature: HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  ACCESS_TOKEN_SECRET
)
```

### Refresh Token (JWT)
```
Payload:
{
  "sub": "clx123abc...",
  "email": "user@example.com",
  "role": "USER",
  "jti": "a1b2c3d4...",      // Unique token ID
  "iat": 1234567890,
  "exp": 1235172690          // +7 days
}

Stored in DB as:
{
  id: "a1b2c3d4...",         // Same as jti
  hash: "sha256(token)",     // Hashed for security
  userId: "clx123abc...",
  expiresAt: "2024-11-07",
  revokedAt: null
}
```

## RBAC Implementation

```
┌─────────────────────────────────────────────────────────┐
│                    Request with JWT                      │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │  Authentication Check  │
            │  (auth middleware)     │
            └────────┬───────────────┘
                     │
        ┌────────────┴────────────┐
        │ Valid?                  │
        ├─────────────────────────┤
        │ Yes          │ No       │
        ▼              ▼          
   ┌─────────┐   ┌─────────┐
   │ Extract │   │ 401     │
   │ User    │   │ Denied  │
   └────┬────┘   └─────────┘
        │
        ▼
   ┌─────────────┐
   │ Attach user │
   │ to request  │
   └────┬────────┘
        │
        ▼
   ┌──────────────────┐
   │ Authorization    │
   │ Check            │
   │ (role middleware)│
   └────┬─────────────┘
        │
        ├──── USER role ────> ✅ Access /me
        │                     ✅ GraphQL: me
        │                     ❌ GraphQL: users
        │                     ❌ /admin/secret
        │
        └──── ADMIN role ───> ✅ All USER routes
                              ✅ GraphQL: users
                              ✅ GraphQL: setUserRole
                              ✅ /admin/secret
```

## Database Schema

```
┌─────────────────────────────────────────┐
│              User                        │
├─────────────────────────────────────────┤
│ id           String  @id @default(cuid)│
│ email        String  @unique            │
│ passwordHash String                     │
│ roleId       String? (FK to Role)       │
│ createdAt    DateTime @default(now)     │
│ updatedAt    DateTime @updatedAt        │
└──────────────┬──────────────────────────┘
               │
               │ N:1 (optional)
               │
               ▼
┌─────────────────────────────────────────┐
│              Role                        │
├─────────────────────────────────────────┤
│ id           String  @id @default(cuid)│
│ name         String  @unique            │
│ permissions  String (JSON array)        │
│ createdAt    DateTime @default(now)     │
│ updatedAt    DateTime @updatedAt        │
└─────────────────────────────────────────┘
Note: Role.users field exists in Prisma schema but is not
a database column - it's a virtual field for relations.

┌─────────────────────────────────────────┐
│              User                        │
├─────────────────────────────────────────┤
│ ...                                     │
└──────────────┬──────────────────────────┘
               │
               │ 1:N
               │
               ▼
┌─────────────────────────────────────────┐
│          RefreshToken                    │
├─────────────────────────────────────────┤
│ id         String   @id    (jti)        │
│ userId     String                       │
│ hash       String                       │
│ expiresAt  DateTime                     │
│ revokedAt  DateTime?                    │
│ createdAt  DateTime @default(now)       │
└─────────────────────────────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Transport Security                             │
│ • HTTPS (production)                                    │
│ • CORS with credentials                                 │
│ • Secure cookies                                        │
└────────────────────┬────────────────────────────────────┘
                     │
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Input Validation                               │
│ • Zod schemas                                           │
│ • Email format validation                               │
│ • Strong password requirements                          │
└────────────────────┬────────────────────────────────────┘
                     │
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Authentication                                 │
│ • JWT signature verification                            │
│ • Token expiration checks                               │
│ • User existence validation                             │
└────────────────────┬────────────────────────────────────┘
                     │
┌─────────────────────────────────────────────────────────┐
│ Layer 4: Authorization                                  │
│ • Role-based access control                             │
│ • Resource ownership checks                             │
└────────────────────┬────────────────────────────────────┘
                     │
┌─────────────────────────────────────────────────────────┐
│ Layer 5: Data Protection                                │
│ • Bcrypt password hashing (cost 12)                     │
│ • Refresh token hashing (SHA-256)                       │
│ • No sensitive data in logs                             │
└─────────────────────────────────────────────────────────┘
```

## API Response Patterns

### Success Responses
```javascript
// Registration
{
  "id": "clx123abc...",
  "email": "user@example.com",
  "role": "USER",
  "createdAt": "2024-10-31T12:00:00Z",
  "updatedAt": "2024-10-31T12:00:00Z"
}

// Login
{
  "accessToken": "eyJhbGc...",
  "user": {
    "id": "clx123abc...",
    "email": "user@example.com",
    "role": "USER"
  }
}
+ Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict
```

### Error Responses
```javascript
// Validation Error
{
  "error": "Validation failed",
  "details": {
    "email": ["Invalid email address"],
    "password": ["Password must be at least 8 characters"]
  }
}

// Authentication Error
{
  "error": "Invalid credentials"
}

// Authorization Error
{
  "error": "Forbidden: insufficient permissions"
}
```

## Testing Strategy

```
┌─────────────────────────────────────────────────────┐
│                   Unit Tests                         │
│ • JWT signing/verification                          │
│ • Password hashing/verification                     │
│ • Validation schemas                                │
│ • Service logic (register, login, refresh)          │
│ • Middleware (auth, roles)                          │
└─────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────┐
│              Integration Tests                       │
│ • Full REST auth flow                               │
│ • Full GraphQL auth flow                            │
│ • Token refresh and rotation                        │
│ • RBAC enforcement                                  │
│ • Cookie handling                                   │
└─────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
                  Development
┌─────────────────────────────────────────┐
│  Local Machine                          │
│  • SQLite (file:./dev.db)              │
│  • GraphQL Playground enabled           │
│  • Secure cookies: false                │
│  • Hot reload with ts-node-dev          │
└─────────────────────────────────────────┘

                  Production
┌─────────────────────────────────────────┐
│  Server / Container                     │
│  • PostgreSQL (DATABASE_URL)            │
│  • GraphQL Playground disabled          │
│  • Secure cookies: true                 │
│  • Compiled JavaScript (npm run build)  │
│  • HTTPS required                       │
└─────────────────────────────────────────┘
```

## Technology Stack

```
┌────────────────────────────────────┐
│  Runtime & Language                │
│  • Node.js 20+                     │
│  • TypeScript 5.3+                 │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│  Web Framework                     │
│  • Express 4.18+                   │
│  • Apollo Server 4.10+             │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│  Database & ORM                    │
│  • Prisma 5.9+                     │
│  • SQLite (dev)                    │
│  • PostgreSQL (prod)               │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│  Authentication & Security         │
│  • jsonwebtoken 9.0+               │
│  • bcrypt 5.1+                     │
│  • cookie-parser 1.4+              │
│  • zod 3.22+                       │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│  Development & Testing             │
│  • Vitest 1.2+                     │
│  • Supertest 6.3+                  │
│  • ESLint 8.56+                    │
│  • Prettier 3.2+                   │
│  • ts-node-dev 2.0+                │
└────────────────────────────────────┘
```

---

This architecture provides:
- ✅ Scalability (stateless JWT auth)
- ✅ Security (multiple layers of protection)
- ✅ Flexibility (REST + GraphQL)
- ✅ Maintainability (clean separation of concerns)
- ✅ Testability (comprehensive test coverage)
- ✅ Production-readiness (proper error handling, logging)

