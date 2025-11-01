import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data
  console.log('Cleaning existing data...');
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});

  // Create roles
  console.log('Creating roles...');

  const adminRole = await prisma.role.create({
    data: {
      name: 'ADMIN',
      permissions: JSON.stringify([
        'VIEW_USERS',
        'CREATE_USER',
        'EDIT_USER',
        'DELETE_USER',
        'VIEW_ROLES',
        'CREATE_ROLE',
        'EDIT_ROLE',
        'DELETE_ROLE',
        'ASSIGN_ROLE',
        'VIEW_AUDIT_LOGS',
        'MANAGE_TOKENS',
        'ADMIN_PANEL_ACCESS',
      ]),
    },
  });

  const userRole = await prisma.role.create({
    data: {
      name: 'USER',
      permissions: JSON.stringify([]),
    },
  });

  const supportRole = await prisma.role.create({
    data: {
      name: 'SUPPORT',
      permissions: JSON.stringify(['VIEW_USERS', 'VIEW_AUDIT_LOGS', 'VIEW_ROLES']),
    },
  });

  console.log(`✅ Created ${3} roles`);

  // Hash password for all users
  const passwordHash = await bcrypt.hash('Password1!', 12);

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      passwordHash,
      roleId: adminRole.id,
    },
  });

  // Create support user
  const support = await prisma.user.create({
    data: {
      email: 'support@example.com',
      passwordHash,
      roleId: supportRole.id,
    },
  });

  // Create regular users
  const users = [];
  for (let i = 1; i <= 5; i++) {
    const user = await prisma.user.create({
      data: {
        email: `user${i}@example.com`,
        passwordHash,
        roleId: userRole.id,
      },
    });
    users.push(user);
  }

  console.log(`✅ Created ${7} users`);

  console.log('\n📊 Seed Summary:');
  console.log('━'.repeat(50));
  console.log('Roles:');
  console.log(`  • ADMIN: ${adminRole.name} (all permissions)`);
  console.log(`  • USER: ${userRole.name} (no permissions - self-access is implicit)`);
  console.log(`  • SUPPORT: ${supportRole.name} (read-only permissions)`);
  console.log('\nUsers:');
  console.log(`  • ${admin.email} → ADMIN role`);
  console.log(`  • ${support.email} → SUPPORT role`);
  console.log(`  • user1-5@example.com → USER role`);
  console.log('\nPassword for all users: Password1!');
  console.log('━'.repeat(50));
  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

