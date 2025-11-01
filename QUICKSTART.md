# 🚀 Quick Start Guide

Get SentinelAuth up and running in under 5 minutes!

## Prerequisites

**Important:** This project requires **Node.js 20+**. Check your version:

```bash
node --version  # Should be v20.x.x or higher
```

If you need to upgrade Node.js:

```bash
# Using nvm (recommended)
nvm install 20
nvm use 20

# Or download from https://nodejs.org/
```

## Installation

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Initialize database (creates SQLite database)
npx prisma db push

# 4. Seed database with test users
npm run seed

# 5. Start development server
npm run dev
```

The server will start on `http://localhost:4000`

**Note:** If you're using nvm, make sure to run `nvm use 20` before each session.

## Test the API

### Using REST

**1. Register a new user:**
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password1!"}'
```

**2. Login (save cookies):**
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Password1!"}' \
  -c cookies.txt
```

**3. Get your profile (use the access token from login response):**
```bash
curl http://localhost:4000/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**4. Refresh your access token:**
```bash
curl -X POST http://localhost:4000/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

**5. Access admin-only endpoint:**
```bash
curl http://localhost:4000/admin/secret \
  -H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN"
```

**6. Logout:**
```bash
curl -X POST http://localhost:4000/auth/logout \
  -b cookies.txt
```

**7. Get all users (admin only):**
```bash
# Get all users
curl http://localhost:4000/users \
  -H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN"

# Search by email
curl "http://localhost:4000/users?search=user1" \
  -H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN"

# Filter by role
curl "http://localhost:4000/users?role=USER" \
  -H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN"
```

### Using GraphQL

**Option 1: GraphQL Playground (Browser)**

Visit http://localhost:4000/graphql in your browser to access the GraphQL Playground.

Try this mutation to login:

```graphql
mutation {
  login(email: "admin@example.com", password: "Password1!") {
    accessToken
    user {
      email
      role
    }
  }
}
```

Then add the access token to HTTP headers:
```json
{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}
```

And query your profile:
```graphql
query {
  me {
    id
    email
    role
    createdAt
  }
}
```

**Option 2: Using curl**

**Query current user:**
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"query":"query { me { id email role createdAt } }"}'
```

**Get all users (ADMIN only):**
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN" \
  -d '{"query":"query { users { id email role createdAt updatedAt } }"}'
```

**Update user role (ADMIN only):**
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN" \
  -d '{"query":"mutation { setUserRole(userId: \"USER_ID_HERE\", roleId: \"ROLE_ID_HERE\") { id name permissions } }"}'
```

**Logout:**
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"query":"mutation { logout }"}'
```

## Run Tests

```bash
npm test
```

## Test Credentials

Created by the seed script:

| Email | Password | Role | Permissions |
|-------|----------|------|-------------|
| admin@example.com | Password1! | ADMIN | All permissions |
| support@example.com | Password1! | SUPPORT | Read-only access |
| user1@example.com | Password1! | USER | Self-access only |
| user2@example.com | Password1! | USER | Self-access only |
| user3@example.com | Password1! | USER | Self-access only |
| user4@example.com | Password1! | USER | Self-access only |
| user5@example.com | Password1! | USER | Self-access only |

## Available Endpoints

- **Health Check**: http://localhost:4000/health
- **GraphQL Playground**: http://localhost:4000/graphql
- **REST Auth**: http://localhost:4000/auth/*
- **User Profile**: http://localhost:4000/me
- **Users List**: http://localhost:4000/users (Admin only)
- **Admin Only**: http://localhost:4000/admin/secret

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Explore the GraphQL schema in the playground
- Check out the test files in `src/tests/` for usage examples
- Review security best practices in the README

## Troubleshooting

**"Prisma only supports Node.js >= 16.13" error?**
Upgrade to Node.js 20+. See Prerequisites section above.

**"Cannot find module bcrypt" or architecture error?**
```bash
# Reinstall bcrypt for your architecture
rm -rf node_modules/bcrypt
npm install bcrypt
```

**Port already in use?**
Change `PORT` in `.env` file.

**Database errors?**
Delete `dev.db` and run `npx prisma db push` again.

**Tests failing?**
Ensure you ran `npx prisma generate` after installing dependencies.

---

Happy coding! 🎉

