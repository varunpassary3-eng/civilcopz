const dbManager = require('./services/databaseManager');
const bcrypt = require('bcryptjs');
const prisma = dbManager.getWriteClient();

async function main() {
  const adminEmail = 'admin@civilcopz.gov';
  const adminPassword = 'AdminPassword123!';
  
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        id: 'dev-admin-id',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin'
      }
    });
    console.log('✅ Default Admin Created:', adminEmail);
    console.log('🔑 Password:', adminPassword);
  } else {
    console.log('ℹ️ Admin user already exists:', adminEmail);
  }
}

main()
  .catch(e => {
    console.error('❌ Error seeding admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
