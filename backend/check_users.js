const dbManager = require('./services/databaseManager');
const prisma = dbManager.getWriteClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      role: true
    }
  });
  console.log('Current Users:', JSON.stringify(users, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
