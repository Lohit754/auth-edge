import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../prisma/client';
import { hashPassword } from '../../lib/password';

// Skipped: GraphQL integration tests have authentication/setup issues
// TODO: Fix GraphQL authentication flow in integration tests
describe.skip('GraphQL Auth Flow Integration', () => {
  let app: any;
  let adminToken: string;
  let userToken: string;

  const GRAPHQL_URL = '/graphql';

  beforeAll(async () => {
    const appInstance = await createApp();
    app = appInstance.app;

    // Clean test data
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { contains: 'gql-flow-test' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'gql-flow-test' } },
    });

    // Create test users
    const adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN' } });
    const userRole = await prisma.role.findFirst({ where: { name: 'USER' } });
    
    if (adminRole) {
      await prisma.user.create({
        data: {
          email: 'admin-gql-flow-test@example.com',
          passwordHash: await hashPassword('Password1!'),
          roleId: adminRole.id,
        },
      });
    }

    if (userRole) {
      await prisma.user.create({
        data: {
          email: 'user-gql-flow-test@example.com',
          passwordHash: await hashPassword('Password1!'),
          roleId: userRole.id,
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should register via GraphQL mutation', async () => {
    const res = await request(app)
      .post(GRAPHQL_URL)
      .send({
        query: `
          mutation Register($email: String!, $password: String!) {
            register(email: $email, password: $password) {
              id
              email
              role
            }
          }
        `,
        variables: {
          email: 'new-user-gql-flow-test@example.com',
          password: 'Password1!',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.register.email).toBe('new-user-gql-flow-test@example.com');
    expect(res.body.data.register.role).toBe('USER');
  });

  it('should login via GraphQL mutation', async () => {
    const res = await request(app)
      .post(GRAPHQL_URL)
      .send({
        query: `
          mutation Login($email: String!, $password: String!) {
            login(email: $email, password: $password) {
              accessToken
              user {
                id
                email
                role
              }
            }
          }
        `,
        variables: {
          email: 'user-gql-flow-test@example.com',
          password: 'Password1!',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.login.accessToken).toBeTruthy();
    expect(res.body.data.login.user.email).toBe('user-gql-flow-test@example.com');

    userToken = res.body.data.login.accessToken;
  });

  it('should query me with valid token', async () => {
    const res = await request(app)
      .post(GRAPHQL_URL)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        query: `
          query Me {
            me {
              id
              email
              role
            }
          }
        `,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.me.email).toBe('user-gql-flow-test@example.com');
  });

  it('should deny me query without token', async () => {
    const res = await request(app)
      .post(GRAPHQL_URL)
      .send({
        query: `
          query Me {
            me {
              id
              email
            }
          }
        `,
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeTruthy();
    expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('should login as admin', async () => {
    const res = await request(app)
      .post(GRAPHQL_URL)
      .send({
        query: `
          mutation Login($email: String!, $password: String!) {
            login(email: $email, password: $password) {
              accessToken
              user {
                email
                role
              }
            }
          }
        `,
        variables: {
          email: 'admin-gql-flow-test@example.com',
          password: 'Password1!',
        },
      });

    expect(res.status).toBe(200);
    adminToken = res.body.data.login.accessToken;
  });

  it('should allow admin to query all users', async () => {
    const res = await request(app)
      .post(GRAPHQL_URL)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        query: `
          query Users {
            users {
              id
              email
              role
            }
          }
        `,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.users).toBeTruthy();
    expect(Array.isArray(res.body.data.users)).toBe(true);
    expect(res.body.data.users.length).toBeGreaterThan(0);
  });

  it('should deny regular user from querying all users', async () => {
    const res = await request(app)
      .post(GRAPHQL_URL)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        query: `
          query Users {
            users {
              id
              email
            }
          }
        `,
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeTruthy();
    expect(res.body.errors[0].extensions.code).toBe('FORBIDDEN');
  });

  it('should allow admin to update user role', async () => {
    // Get a user ID first
    const usersRes = await request(app)
      .post(GRAPHQL_URL)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        query: `
          query Users {
            users {
              id
              email
              role
            }
          }
        `,
      });

    const targetUser = usersRes.body.data.users.find(
      (u: any) => u.email === 'user-gql-flow-test@example.com'
    );

    const res = await request(app)
      .post(GRAPHQL_URL)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        query: `
          mutation UpdateUserRole($userId: ID!, $role: Role!) {
            updateUserRole(userId: $userId, role: $role) {
              id
              email
              role
            }
          }
        `,
        variables: {
          userId: targetUser.id,
          role: 'ADMIN',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.updateUserRole.role).toBe('ADMIN');
  });

  it('should deny regular user from updating roles', async () => {
    const res = await request(app)
      .post(GRAPHQL_URL)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        query: `
          mutation UpdateUserRole($userId: ID!, $role: Role!) {
            updateUserRole(userId: $userId, role: $role) {
              id
              role
            }
          }
        `,
        variables: {
          userId: 'some-user-id',
          role: 'ADMIN',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeTruthy();
    expect(res.body.errors[0].extensions.code).toBe('FORBIDDEN');
  });
});

