# SentinelAuth Developer Guide - REST API Reference

## Base Information

- **Base URL**: `http://localhost:4000`
- **GraphQL Endpoint**: `http://localhost:4000/graphql`
- **Authentication**: Bearer token in `Authorization` header
- **Refresh Token**: HttpOnly cookie

## Table of Contents

1. [Authentication Flow](#authentication-flow)
2. [User Management](#user-management)
3. [Role Management](#role-management)
4. [Admin Endpoints](#admin-endpoints)
5. [GraphQL Examples](#graphql-examples)

---

## Authentication Flow

### 1. Register a New User

No authentication required.

```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "Password1!"
  }'
```

**With role parameter (defaults to USER):**
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "Password1!",
    "role": "USER"
  }'
```

**Response:**
```json
{
  "id": "clxxx...",
  "email": "newuser@example.com",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**⚠️ Security Note:** Attempting to register with `"role": "ADMIN"` will be rejected with a 403 Forbidden error. ADMIN users must be created via seed script or by existing administrators.

**Error Response (ADMIN registration attempt):**
```json
{
  "error": "ADMIN role cannot be assigned during public registration. Please contact an administrator."
}
```

---

### 2. Login

Returns access token and sets refresh token cookie.

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "admin@example.com",
    "password": "Password1!"
  }'
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxxx...",
    "email": "admin@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**💡 Tip:** Save the `accessToken` for use in subsequent requests.

---

### 3. Get Current User Info (/me)

Returns authenticated user with role and permissions.

```bash
curl http://localhost:4000/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**
```json
{
  "id": "clxxx...",
  "email": "admin@example.com",
  "role": {
    "id": "role_xxx",
    "name": "ADMIN",
    "permissions": [
      "VIEW_USERS", "CREATE_USER", "EDIT_USER", "DELETE_USER",
      "VIEW_ROLES", "CREATE_ROLE", "EDIT_ROLE", "DELETE_ROLE",
      "ASSIGN_ROLE", "VIEW_AUDIT_LOGS", "MANAGE_TOKENS",
      "ADMIN_PANEL_ACCESS"
    ]
  },
  "permissions": [
    "VIEW_USERS", "CREATE_USER", "EDIT_USER", "DELETE_USER",
    "VIEW_ROLES", "CREATE_ROLE", "EDIT_ROLE", "DELETE_ROLE",
    "ASSIGN_ROLE", "VIEW_AUDIT_LOGS", "MANAGE_TOKENS",
    "ADMIN_PANEL_ACCESS"
  ]
}
```

---

### 4. Refresh Access Token

Uses refresh token from cookie to get a new access token.

```bash
curl -X POST http://localhost:4000/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxxx...",
    "email": "admin@example.com"
  }
}
```

---

### 5. Logout

Revokes the refresh token and clears cookie.

```bash
curl -X POST http://localhost:4000/auth/logout \
  -b cookies.txt
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

---

## User Management

### Get All Users

**Permission Required:** `VIEW_USERS`

```bash
curl http://localhost:4000/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**With search filter:**
```bash
curl "http://localhost:4000/users?search=admin" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**
```json
{
  "total": 5,
  "users": [
    {
      "id": "clxxx1",
      "email": "admin@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "clxxx2",
      "email": "user1@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Get User by ID

**Permission Required:** `VIEW_USERS` OR self-access (authenticated user viewing own profile)

**Note:** Any authenticated user can view their own profile without needing special permissions.

```bash
curl http://localhost:4000/users/USER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**
```json
{
  "id": "clxxx...",
  "email": "user@example.com",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### Get User's Role

**Permission Required:** `VIEW_USERS` OR self-access (authenticated user viewing own role)

**Note:** Any authenticated user can view their own role without needing special permissions.

```bash
curl http://localhost:4000/users/USER_ID/role \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (with role):**
```json
{
  "id": "role_xxx",
  "name": "USER",
  "permissions": [],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Response (no role assigned):**
```json
null
```

---

### Set User's Role

**Permission Required:** `ASSIGN_ROLE`

**Assign a role:**
```bash
curl -X PUT http://localhost:4000/users/USER_ID/role \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": "ROLE_ID"
  }'
```

**Remove role:**
```bash
curl -X PUT http://localhost:4000/users/USER_ID/role \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": null
  }'
```

**Response:**
```json
{
  "id": "role_xxx",
  "name": "ADMIN",
  "permissions": ["VIEW_USERS", "CREATE_USER", ...],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Role Management

### Get All Roles

**Permission Required:** `VIEW_ROLES`

```bash
curl http://localhost:4000/roles \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**
```json
[
  {
    "id": "role_1",
    "name": "ADMIN",
    "permissions": [
      "VIEW_USERS", "CREATE_USER", "EDIT_USER", "DELETE_USER",
      "VIEW_ROLES", "CREATE_ROLE", "EDIT_ROLE", "DELETE_ROLE",
      "ASSIGN_ROLE", "VIEW_AUDIT_LOGS", "MANAGE_TOKENS",
      "ADMIN_PANEL_ACCESS", "VIEW_SELF", "EDIT_SELF"
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "role_2",
    "name": "USER",
    "permissions": [],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "role_3",
    "name": "SUPPORT",
    "permissions": ["VIEW_USERS", "VIEW_AUDIT_LOGS", "VIEW_ROLES"],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### Get Role by ID

**Permission Required:** `VIEW_ROLES`

```bash
curl http://localhost:4000/roles/ROLE_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**
```json
{
  "id": "role_xxx",
  "name": "ADMIN",
  "permissions": ["VIEW_USERS", "CREATE_USER", "EDIT_USER", ...],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### Create Role

**Permission Required:** `CREATE_ROLE`

```bash
curl -X POST http://localhost:4000/roles \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "EDITOR",
    "permissions": ["VIEW_USERS", "EDIT_USER"]
  }'
```

**Response:**
```json
{
  "id": "role_new",
  "name": "EDITOR",
  "permissions": ["VIEW_USERS", "EDIT_USER"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Available Permissions:**
```
VIEW_USERS, CREATE_USER, EDIT_USER, DELETE_USER
VIEW_ROLES, CREATE_ROLE, EDIT_ROLE, DELETE_ROLE, ASSIGN_ROLE
VIEW_AUDIT_LOGS, MANAGE_TOKENS, ADMIN_PANEL_ACCESS
```

**Note:** Self-access permissions (VIEW_SELF, EDIT_SELF) have been removed as they are implicit for all authenticated users.

---

### Update Role

**Permission Required:** `EDIT_ROLE`

**Update permissions only:**
```bash
curl -X PATCH http://localhost:4000/roles/ROLE_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": ["VIEW_USERS", "EDIT_USER", "DELETE_USER"]
  }'
```

**Update name only:**
```bash
curl -X PATCH http://localhost:4000/roles/ROLE_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "SUPER_USER"
  }'
```

**Update both:**
```bash
curl -X PATCH http://localhost:4000/roles/ROLE_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MODERATOR",
    "permissions": ["VIEW_USERS", "EDIT_USER"]
  }'
```

**Response:**
```json
{
  "id": "role_xxx",
  "name": "MODERATOR",
  "permissions": ["VIEW_USERS", "EDIT_USER"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### Delete Role (Hard Delete)

**Permission Required:** `DELETE_ROLE`

```bash
curl -X DELETE http://localhost:4000/roles/ROLE_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:** `204 No Content`

**⚠️ Note:** Role deletion will fail with a 409 error if the role is currently assigned to any users. You must remove all user assignments before deleting a role. **Deletion is permanent and cannot be undone.**

---

## Admin Endpoints

### Admin Secret Endpoint

**Permission Required:** `VIEW_USERS` AND `VIEW_ROLES`

```bash
curl http://localhost:4000/admin/secret \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**
```json
{
  "secret": "This is a secret message only admins can see! 🔐",
  "admin": "admin@example.com"
}
```

---

## GraphQL Examples

### Using GraphQL Playground

Visit `http://localhost:4000/graphql` in your browser (development only).

**Set Authorization Header:**
```json
{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}
```

### Query: Get Current User (me)

```graphql
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
```

**Response:**
```json
{
  "data": {
    "me": {
      "id": "clxxx...",
      "email": "admin@example.com",
      "role": {
        "id": "role_xxx",
        "name": "ADMIN",
        "permissions": ["VIEW_USERS", "CREATE_USER", ...]
      },
      "permissions": ["VIEW_USERS", "CREATE_USER", ...],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Query: Get All Users

**Permission Required:** `VIEW_USERS`

```graphql
query {
  users {
    id
    email
    role {
      name
      permissions
    }
    createdAt
  }
}
```

### Query: Get All Roles

**Permission Required:** `VIEW_ROLES`

```graphql
query {
  roles {
    id
    name
    permissions
    createdAt
    updatedAt
  }
}
```

### Query: Get Specific Role

**Permission Required:** `VIEW_ROLES`

```graphql
query {
  role(id: "ROLE_ID") {
    id
    name
    permissions
    createdAt
    updatedAt
  }
}
```

### Query: Get User's Role

**Permission Required:** `VIEW_USERS` OR self with `VIEW_SELF`

```graphql
query {
  userRole(userId: "USER_ID") {
    id
    name
    permissions
  }
}
```

### Mutation: Register

```graphql
mutation {
  register(
    email: "test@example.com"
    password: "Password1!"
    role: "USER"  # Optional, defaults to USER
  ) {
    id
    email
    createdAt
  }
}
```

**Note:** Attempting to register with `role: "ADMIN"` will result in a FORBIDDEN error.

### Mutation: Login

```graphql
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
    }
  }
}
```

### Mutation: Refresh Token

Uses cookie automatically.

```graphql
mutation {
  refreshToken {
    accessToken
    user {
      id
      email
    }
  }
}
```

### Mutation: Logout

```graphql
mutation {
  logout
}
```

### Mutation: Create Role

**Permission Required:** `CREATE_ROLE`

```graphql
mutation {
  createRole(
    name: "EDITOR"
    permissions: ["VIEW_USERS", "EDIT_USER"]
  ) {
    id
    name
    permissions
  }
}
```

### Mutation: Update Role

**Permission Required:** `EDIT_ROLE`

```graphql
mutation {
  updateRole(
    id: "ROLE_ID"
    permissions: ["VIEW_USERS", "EDIT_USER", "DELETE_USER"]
  ) {
    id
    name
    permissions
  }
}
```

### Mutation: Delete Role

**Permission Required:** `DELETE_ROLE`

```graphql
mutation {
  deleteRole(id: "ROLE_ID")
}
```

### Mutation: Set User Role

**Permission Required:** `ASSIGN_ROLE`

```graphql
# Assign role
mutation {
  setUserRole(userId: "USER_ID", roleId: "ROLE_ID") {
    id
    name
    permissions
  }
}

# Remove role
mutation {
  setUserRole(userId: "USER_ID", roleId: null) {
    id
    name
    permissions
  }
}
```

---

## Quick Test Workflow

### Complete REST Flow

```bash
# 1. Login as admin
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"admin@example.com","password":"Password1!"}' \
  | jq -r '.accessToken' > token.txt

# Save token to variable
TOKEN=$(cat token.txt)

# 2. Get current user info
curl http://localhost:4000/me \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. List all users
curl http://localhost:4000/users \
  -H "Authorization: Bearer $TOKEN" | jq

# 4. List all roles
curl http://localhost:4000/roles \
  -H "Authorization: Bearer $TOKEN" | jq

# 5. Create a new role
curl -X POST http://localhost:4000/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"MODERATOR","permissions":["VIEW_USERS","EDIT_USER"]}' | jq

# 6. Get a user's role
curl http://localhost:4000/users/USER_ID/role \
  -H "Authorization: Bearer $TOKEN" | jq

# 7. Assign role to user
curl -X PUT http://localhost:4000/users/USER_ID/role \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"roleId":"ROLE_ID"}' | jq

# 8. Logout
curl -X POST http://localhost:4000/auth/logout \
  -b cookies.txt
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error",
  "details": "Password must be at least 8 characters"
}
```

### 401 Unauthorized
```json
{
  "error": "No token provided"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden: insufficient permissions",
  "missing": ["VIEW_USERS"]
}
```

### 404 Not Found
```json
{
  "error": "User not found"
}
```

### 409 Conflict
```json
{
  "error": "Cannot delete role: it is currently assigned to 3 user(s). Remove all assignments first."
}
```

---

## Test Credentials

After running `npm run seed`:

| Email | Password | Role | Permissions |
|-------|----------|------|-------------|
| admin@example.com | Password1! | ADMIN | All permissions |
| support@example.com | Password1! | SUPPORT | VIEW_USERS, VIEW_AUDIT_LOGS, VIEW_ROLES |
| user1@example.com | Password1! | USER | [] (self-access is implicit) |
| user2@example.com | Password1! | USER | [] (self-access is implicit) |
| user3@example.com | Password1! | USER | [] (self-access is implicit) |

---

## Tips & Best Practices

1. **Always save the access token** after login - it's needed for all authenticated requests
2. **Use cookies.txt** to persist refresh tokens across requests
3. **Check permissions** before making requests - saves you 403 errors
4. **Use jq** to format JSON responses for better readability
5. **Store tokens securely** - never commit them to git
6. **Refresh tokens expire after 7 days** - login again if needed
7. **Access tokens expire after 15 minutes** - use refresh endpoint to get new ones
8. **Roles cannot be deleted if assigned** - remove user assignments first
9. **Permission checks are case-sensitive** - use ALL_CAPS_UNDERSCORE format
10. **One user = one role** - use `setUserRole` to change, passing `null` removes role
11. **Self-access is automatic** - authenticated users don't need VIEW_SELF/EDIT_SELF permissions
12. **ADMIN registration blocked** - create ADMINs via seed script or existing ADMIN

---

## Permission System

### How It Works

1. **User logs in** → JWT issued
2. **JWT verified** → User loaded with role
3. **Permissions computed** → Union of role permissions
4. **Stored in memory** → `req.permissions` (REST) or `ctx.permissions` (GraphQL)
5. **Authorization checks** → Use in-memory Set (no DB queries!)

### All Available Permissions

```typescript
const PERMISSIONS = [
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
  'ADMIN_PANEL_ACCESS',
];
```

**Note:** `VIEW_SELF` and `EDIT_SELF` have been removed as self-access is implicit for all authenticated users.

### Default Role Configurations

**ADMIN:**
```json
{
  "name": "ADMIN",
  "permissions": [/* ALL PERMISSIONS */]
}
```

**USER:**
```json
{
  "name": "USER",
  "permissions": []
}
```
*Note: Empty permissions because self-access is implicit for all authenticated users*

**SUPPORT:**
```json
{
  "name": "SUPPORT",
  "permissions": ["VIEW_USERS", "VIEW_AUDIT_LOGS", "VIEW_ROLES"]
}
```

---

## Troubleshooting

**Q: Getting "No token provided" error?**  
A: Make sure you're sending the `Authorization: Bearer YOUR_TOKEN` header

**Q: Getting "Token expired" error?**  
A: Use the refresh endpoint with your cookies to get a new access token

**Q: Getting "Forbidden: insufficient permissions"?**  
A: Check that your user has the required permissions for that endpoint

**Q: Can't delete a role?**  
A: Remove all user assignments first, then try deleting again

**Q: GraphQL Playground not working?**  
A: Make sure you're in development mode and the server is running

**Q: How do I test permission-protected endpoints?**  
A: Login as admin first to get a token with all permissions

---

For more information, see:
- `README.md` - Project overview
- `COMPLETE_CHANGES_SUMMARY.md` - Recent changes
- `MIGRATION_INSTRUCTIONS.md` - Database migration guide

