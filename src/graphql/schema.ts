import gql from 'graphql-tag';

export const typeDefs = gql`
  scalar DateTime

  type Role {
    id: ID!
    name: String!
    permissions: [String!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type User {
    id: ID!
    email: String!
    role: Role
    permissions: [String!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type AuthPayload {
    accessToken: String!
    user: User!
  }

  type Query {
    """
    Get the current authenticated user
    """
    me: User

    """
    List all users (requires VIEW_USERS permission)
    """
    users: [User!]!

    """
    List all roles (requires VIEW_ROLES permission)
    """
    roles: [Role!]!

    """
    Get a specific role by ID (requires VIEW_ROLES permission)
    """
    role(id: ID!): Role

    """
    Get role assigned to a user (requires VIEW_USERS or self-access for own role)
    """
    userRole(userId: ID!): Role

  }

  type Mutation {
    """
    Register a new user with optional role (USER or ADMIN, defaults to USER)
    Note: ADMIN registration is blocked for security
    """
    register(email: String!, password: String!, role: String): User!

    """
    Login and receive access token
    """
    login(email: String!, password: String!): AuthPayload!

    """
    Refresh access token using cookie
    """
    refreshToken: AuthPayload!

    """
    Logout and revoke refresh token
    """
    logout: Boolean!

    """
    Create a new role (requires CREATE_ROLE permission)
    """
    createRole(name: String!, permissions: [String!]!): Role!

    """
    Update an existing role (requires EDIT_ROLE permission)
    """
    updateRole(id: ID!, name: String, permissions: [String!]): Role!

    """
    Delete a role (requires DELETE_ROLE permission)
    """
    deleteRole(id: ID!): Boolean!

    """
    Set role for a user (requires ASSIGN_ROLE permission)
    """
    setUserRole(userId: ID!, roleId: ID): Role
  }
`;

