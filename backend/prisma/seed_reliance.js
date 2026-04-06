const dbManager = require('../services/databaseManager');
const prisma = dbManager.getWriteClient();

async function main() {
  console.log('🚀 [SEEDING] Reliance Industrial Scale Data (1420+ Records)...');

  // 1. Ensure Reliance exists as a company
  const reliance = await prisma.company.upsert({
    where: { name: 'Reliance Industries Ltd' },
    update: {},
    create: {
      name: 'Reliance Industries Ltd',
      category: 'Conglomerate',
      rating: 4.1
    }
  });

  const categories = ['Telecom', 'Retail', 'Digital', 'Petroleum', 'Finance'];
  const statuses = ['Submitted', 'Notice_Sent', 'Under_Review', 'Resolved', 'Court_Filed'];
  const jurisdictions = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Ahmedabad'];

  const batchSize = 100;
  const totalRecords = 1420;
  
  for (let i = 0; i < totalRecords; i += batchSize) {
    const currentBatch = Math.min(batchSize, totalRecords - i);
    const data = Array.from({ length: currentBatch }).map((_, j) => {
      const idx = i + j;
      return {
        title: `Reliance Litigation Case #${idx + 1000}: ${categories[idx % categories.length]} Dispute`,
        description: `Description for Reliance case #${idx}. Judicial context for consumer dispute regarding ${categories[idx % categories.length]} services.`,
        company: 'Reliance Industries Ltd',
        companyId: reliance.id,
        category: categories[idx % categories.length],
        jurisdiction: jurisdictions[idx % jurisdictions.length],
        status: statuses[idx % statuses.length],
        createdAt: new Date(Date.now() - idx * 3600000), // Staggered times
        noticeStatus: idx % 3 === 0 ? 'READ' : 'SENT',
        noticeDeadline: new Date(Date.now() + 15 * 24 * 3600000)
      };
    });

    await prisma.case.createMany({
      data: data,
      skipDuplicates: true
    });
    console.log(`...Seeded ${i + currentBatch}/${totalRecords} records`);
  }

  console.log('✅ Reliance Scale Seeding Complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
