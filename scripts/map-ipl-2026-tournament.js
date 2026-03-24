/**
 * Map IPL 2026 Tournament to Buddykhel Database Series
 * 
 * This script updates the IPL 2026 tournament in our database
 * to link it with Series 12 in the Buddykhel database.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function mapTournament() {
  try {
    console.log('🔗 Mapping IPL 2026 tournament to Buddykhel Series 12...\n');

    // Find the IPL 2026 tournament
    const tournament = await prisma.tournament.findFirst({
      where: { name: 'IPL 2026' }
    });

    if (!tournament) {
      console.error('❌ IPL 2026 tournament not found in database!');
      return;
    }

    console.log('📋 Current Tournament Details:');
    console.log(`   ID: ${tournament.id}`);
    console.log(`   Name: ${tournament.name}`);
    console.log(`   Status: ${tournament.status}`);
    console.log(`   Start Date: ${tournament.startDate.toISOString().split('T')[0]}`);
    console.log(`   End Date: ${tournament.endDate.toISOString().split('T')[0]}`);
    console.log(`   External Series ID: ${tournament.externalSeriesId || 'Not set'}\n`);

    // Update with Buddykhel Series ID 12 (IPL 2026)
    const updated = await prisma.tournament.update({
      where: { id: tournament.id },
      data: {
        externalSeriesId: 12  // Series 12 = IPL 2026 in Buddykhel DB
      }
    });

    console.log('✅ Tournament mapping updated successfully!');
    console.log(`   External Series ID: ${updated.externalSeriesId}`);
    console.log('\n📊 Buddykhel Database Mapping:');
    console.log('   Series 12 → IPL 2026 (20 scheduled games)');
    console.log('   Date Range: Mar 28, 2026 - Apr 12, 2026');
    console.log('\n💡 Note: You can now use the search-external-games.js script');
    console.log('   to find specific games and their external game IDs for score fetching.');

  } catch (error) {
    console.error('❌ Error mapping tournament:', error);
  } finally {
    await prisma.$disconnect();
  }
}

mapTournament();
