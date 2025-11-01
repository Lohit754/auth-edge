# Database Setup Instructions

## Prerequisites

### ⚠️ Important: Node.js Version Required

This project requires **Node.js 20+**. Current Node version can be checked with:

```bash
node --version  # Should show v20.x.x or v21.x.x
```

### Installing/Upgrading Node.js

If you need to install or upgrade Node.js:

```bash
# Using nvm (recommended)
nvm install 20
nvm use 20
nvm alias default 20

# Verify installation
node --version

# Or download from https://nodejs.org/
# Choose LTS (Long Term Support) version
```

## Setup Steps

Follow these steps to set up the database:

### 1. Install Dependencies

```bash
npm install
```

If you encounter bcrypt errors after upgrading Node, reinstall it:
```bash
rm -rf node_modules/bcrypt
npm install bcrypt
```

### 2. Generate Prisma Client

```bash
npx prisma generate
```

This generates TypeScript types for database access.

### 3. Create Database Tables

```bash
npx prisma db push
```

This creates the SQLite database with all tables defined in the schema.

### 4. Seed Database

```bash
npm run seed
```

This creates:
- 3 roles (ADMIN, USER, SUPPORT)
- 7 test users with password `Password1!`

### 5. Start Development Server

```bash
npm run dev
```

Server will start at `http://localhost:4000`

## Understanding the Schema

### Schema Overview:
- **User table**: Stores user accounts with `roleId` foreign key
- **Role table**: Stores roles with permissions (JSON array)
- **RefreshToken table**: Stores JWT refresh tokens (hashed)
- **Virtual field**: `users User[]` in Role model exists only in Prisma schema for type definitions - NOT a database column

### Key Points:
- The User-Role relationship is stored via `User.roleId` foreign key column only
- The `users User[]` field is required by Prisma for defining the reverse side of the relation
- No actual `users` column exists in the Role table

## Verification

After setup, verify everything works:

```bash
# 1. Check server health
curl http://localhost:4000/health

# 2. Test login (should return access token)
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Password1!"}'

# 3. Visit GraphQL Playground
# Open http://localhost:4000/graphql in your browser

# 4. Run tests
npm test
```

## Test Credentials

After seeding, you'll have these test accounts:

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| admin@example.com | Password1! | ADMIN | Full access - all permissions |
| support@example.com | Password1! | SUPPORT | Read-only access to users/roles |
| user1-5@example.com | Password1! | USER | Self-access only (5 accounts) |

## Troubleshooting

### "Prisma only supports Node.js >= 16.13"
**Solution:** Upgrade to Node.js 20+. See Prerequisites section above.

### "Cannot find module bcrypt" or architecture mismatch
**Solution:** Reinstall bcrypt for your current Node version and architecture:
```bash
rm -rf node_modules/bcrypt
npm install bcrypt
```

### "Table does not exist in the current database"
**Solution:** Run database push before seeding:
```bash
npx prisma db push
npm run seed
```

### Port 4000 already in use
**Solution:** Either:
- Stop the process using port 4000
- Change `PORT=4001` in your `.env` file

### Database locked or corrupted
**Solution:** Delete and recreate:
```bash
rm dev.db dev.db-journal
npx prisma db push
npm run seed
```

