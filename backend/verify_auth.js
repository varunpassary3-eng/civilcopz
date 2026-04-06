const dbManager = require('./services/databaseManager');
const prisma = dbManager.getWriteClient();
const bcrypt = require('bcryptjs');

async function verify() {
  console.log('🔍 [AUTH_AUDIT] Verifying Advocate Substrate...');
  
  const email = 'advocate.pro@civilcopz.gov.in';
  const password = 'Advocate@2026';

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.error(`❌ [FAILURE] User ${email} not found in database.`);
      console.log('👉 ACTION: Run "npx prisma db seed" in the backend folder.');
      return;
    }

    console.log(`✅ [FOUND] User: ${user.email} | Role: ${user.role} | Verified: ${user.isVerifiedProfessional}`);

    const match = await bcrypt.compare(password, user.password);
    if (match) {
      console.log('✅ [CREDENTIALS] Password verified OK. Login should be working.');
    } else {
      console.error('❌ [CREDENTIALS] Password mismatch for seeded account!');
    }
  } catch (error) {
    console.error('❌ [DB_FAILURE]', error.message);
  }
}

verify()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
