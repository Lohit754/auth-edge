# SentinelAuth - Quick Setup for Interviewers

This is a production-grade authentication backend with JWT, role-based access control (RBAC), REST & GraphQL APIs.

## 🚀 One-Command Setup

**Prerequisites:** Node.js 20+ required

```bash
# Check your Node version
node --version  # Must be 20.x.x or higher

# If you need to upgrade:
nvm install 20 && nvm use 20
```

**Setup & Run:**

```bash
# 1. Install dependencies
npm install

# 2. Setup database and seed data
npx prisma generate
npx prisma db push
npm run seed

# 3. Start server
npm run dev
```

Server runs at: **http://localhost:4000**

## 🧪 Quick Test

### Health Check
```bash
curl http://localhost:4000/health
```

### Login as Admin
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Password1!"}' \
  -c cookies.txt
```

Save the `accessToken` from the response!

### Test Protected Endpoint
```bash
curl http://localhost:4000/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### GraphQL Playground
Open **http://localhost:4000/graphql** in your browser

## 🔐 Test Accounts

| Email | Password | Role | Access Level |
|-------|----------|------|--------------|
| admin@example.com | Password1! | ADMIN | Full access |
| support@example.com | Password1! | SUPPORT | Read-only |
| user1@example.com | Password1! | USER | Self-access |

## 📡 Key Features to Review

### REST API
- **Authentication**: `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`
- **User Management**: `/users`, `/users/:id`, `/users/:id/role`
- **Role Management**: `/roles` (CRUD operations)
- **Protected Routes**: `/admin/secret` (requires admin permissions)

### GraphQL API
- Visit: http://localhost:4000/graphql
- All REST operations available via GraphQL
- Permission-based access control
- Interactive playground

### RBAC System
- **Permission-based** (not role-based) authorization
- **One role per user** with multiple permissions
- **Dynamic role management** via API
- **No N+1 queries** - permissions loaded once per request

### Security Features
- JWT with refresh token rotation
- Bcrypt password hashing (cost factor: 12)
- httpOnly secure cookies
- Token revocation on logout
- Input validation with Zod

## 🧪 Run Tests

```bash
npm test
```

Tests cover:
- Unit tests (JWT, auth service, RBAC)
- Integration tests (REST & GraphQL flows)
- All authentication & authorization scenarios

## 📚 Documentation

- **[README.md](README.md)** - Full project documentation
- **[REST_API_GUIDE.md](REST_API_GUIDE.md)** - Complete API reference with curl examples
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and design decisions
- **[QUICKSTART.md](QUICKSTART.md)** - Detailed setup guide

## ⚠️ Troubleshooting

**"Prisma only supports Node.js >= 16.13"**
```bash
nvm install 20 && nvm use 20
npm install
```

**"Cannot find module bcrypt"**
```bash
rm -rf node_modules/bcrypt
npm install bcrypt
```

**Port 4000 in use**
```bash
# Edit .env file
PORT=4001
```

**Database issues**
```bash
rm dev.db
npx prisma db push
npm run seed
```

## 🎯 What to Look For

1. **Clean Architecture**: Layered structure (routes → services → database)
2. **Type Safety**: Full TypeScript with strict mode
3. **Security**: Multiple layers of protection
4. **RBAC Implementation**: Permission-based authorization system
5. **Testing**: Comprehensive unit & integration tests
6. **Documentation**: Well-documented codebase
7. **Production Ready**: Environment configuration, error handling, logging

## 📂 Project Structure

```
src/
├── routes/         # REST endpoints
├── graphql/        # GraphQL schema & resolvers
├── services/       # Business logic
├── middleware/     # Auth, CORS, error handling
├── rbac/           # Permission system
├── lib/            # Utilities (JWT, password, validation)
├── prisma/         # Database client
└── tests/          # Unit & integration tests
```

## 💡 Technical Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js + Apollo Server v4
- **Database**: Prisma ORM (SQLite dev, PostgreSQL prod)
- **Auth**: JWT with rotating refresh tokens
- **Testing**: Vitest with supertest
- **Validation**: Zod schemas

---

**Questions?** Check the full documentation in README.md or other guide files.

**Ready for production** ✅ Just switch to PostgreSQL and deploy!

