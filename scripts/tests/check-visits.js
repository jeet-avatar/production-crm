const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkVisits() {
  try {
    const total = await prisma.websiteVisit.count();
    console.log('=== Website Visitor Tracking Stats ===');
    console.log('Total visits in database:', total);
    console.log('');

    const visits = await prisma.websiteVisit.findMany({
      take: 10,
      orderBy: { visitedAt: 'desc' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    console.log('=== Latest 10 Website Visits ===');
    console.log('');

    visits.forEach((visit, index) => {
      console.log(`Visit #${index + 1}:`);
      console.log('  Time:', new Date(visit.visitedAt).toLocaleString());
      console.log('  URL:', visit.fullUrl);
      console.log('  Domain:', visit.domain);
      console.log('  Protocol:', visit.protocol);
      console.log('  Path:', visit.path);
      console.log('  IP:', visit.ipAddress);
      console.log('  Browser:', visit.browser || 'Unknown');
      console.log('  Device:', visit.device || 'Unknown');
      console.log('  OS:', visit.os || 'Unknown');
      if (visit.user) {
        console.log('  User:', `${visit.user.firstName} ${visit.user.lastName} (${visit.user.email})`);
      } else {
        console.log('  User: Anonymous');
      }
      console.log('  Authenticated:', visit.isAuthenticated);
      console.log('');
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkVisits();
