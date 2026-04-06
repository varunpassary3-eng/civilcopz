const dbManager = require('../services/databaseManager');
const prisma = dbManager.getWriteClient();
const bcrypt = require('bcryptjs');

async function main() {
  console.log('🚀 [SEEDING] Industrial Judicial Substrate...');

  // 1. Seed Advocates (Professional ID verification)
  const advocatePassword = await bcrypt.hash('Advocate@2026', 10);
  const advocate = await prisma.user.upsert({
    where: { email: 'advocate.pro@civilcopz.gov.in' },
    update: {},
    create: {
      email: 'advocate.pro@civilcopz.gov.in',
      password: advocatePassword,
      role: 'ADVOCATE',
      barCouncilId: 'BCI/ND/2026/001',
      isVerifiedProfessional: true,
      specialization: 'Consumer Law & Digital Litigation'
    }
  });
  console.log(`✅ Advocate Seeded: ${advocate.email} (BCI: ${advocate.barCouncilId})`);

  // 2. Seed Notaries (Jurisdictional directory)
  const notaryData = [
    { name: 'Kushal B. Notary', address: 'District Court Complex, Saket, Delhi', jurisdiction: 'New Delhi', contact: '+91 99XXXXXX01', fees: 150 },
    { name: 'Mehta & Associates', address: 'Civil Lines, Near State Commission, Pune', jurisdiction: 'Pune', contact: '+91 88XXXXXX22', fees: 100 },
    { name: 'National Judicial Center Notary', address: 'Mandir Marg, New Delhi', jurisdiction: 'New Delhi', contact: '+91 77XXXXXX33', fees: 200 }
  ];

  for (const n of notaryData) {
    await prisma.notary.upsert({
      where: { id: n.id || 'notary-id-' + n.name.replace(/\s+/g, '-') },
      update: {},
      create: n
    });
  }
  console.log('✅ Notary Directory Seeded.');

  // 3. Seed Companies (Standard Offenders)
  const companyData = [
    { name: 'Telecom Bharti', category: 'Telecom', rating: 4.2 },
    { name: 'FinBank India', category: 'Banking', rating: 3.8 },
    { name: 'MegaMart E-Store', category: 'E-Commerce', rating: 4.5 }
  ];

  for (const c of companyData) {
    await prisma.company.upsert({
      where: { name: c.name },
      update: {},
      create: c
    });
  }
  console.log('✅ Industrial Offender DB Seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
