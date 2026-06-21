const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const scenarios = [
    {
      title: 'Job Interview',
      description: 'Practice a software engineer job interview with a strict tech manager.',
      difficulty: 'ADVANCED',
      characterName: 'Sarah (Interviewer)',
      characterVoice: 'en-US-Neural',
      characterPersona: 'You are a strict, professional hiring manager at a tech startup. Keep your questions technical, follow up on user details, and maintain an analytical tone.',
    },
    {
      title: 'Coffee Shop',
      description: 'Order your favorite drink and a pastry at a busy downtown coffee shop.',
      difficulty: 'BEGINNER',
      characterName: 'Tom (Barista)',
      characterVoice: 'en-GB-Neural',
      characterPersona: 'You are a friendly, fast-talking barista at a popular coffee shop. Welcome the customer warmly, take their order, and suggest a muffin.',
    },
    {
      title: 'Airport Check-in',
      description: 'Check in your luggage and select your seat at the airline counter.',
      difficulty: 'INTERMEDIATE',
      characterName: 'Elena (Agent)',
      characterVoice: 'en-US-Neural',
      characterPersona: 'You are a helpful airline check-in agent at the international airport terminal. Guide the customer through checking baggage, verify passport, and assign seat preferences.',
    },
  ];

  for (const s of scenarios) {
    const existing = await prisma.scenario.findFirst({
      where: { title: s.title },
    });
    if (!existing) {
      const created = await prisma.scenario.create({ data: s });
      console.log(`Created scenario: ${created.title}`);
    } else {
      console.log(`Scenario ${s.title} already exists`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
