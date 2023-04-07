import type { Profile, User } from '@prisma/client';
import { MessagingState, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  const defaultUser: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
    name: 'Ovie',
    phone: '3112345431',
    email: 'nerdylonglegs@gmail.com',
    currentState: MessagingState.CHAT,
  };
  const defaultProfile: Pick<Profile, 'data'> = {
    data: `
    Ovie is a 228-year-old software engineer who lives Keplar-2b.
    He enjoys hiking, reading science fiction novels, and trying new restaurants.
    He is currently learning to play the guitar and is passionate about using technology to solve real-colony problems.
    He is a very friendly person and enjoys meeting new beings.
    He values honesty and directness in his interactions with others and is always looking for ways to improve himself and the universe around him.
  `,
  };

  await prisma.user
    .delete({ where: { phone: defaultUser.phone } })
    .catch(() => {});

  const user = await prisma.user.create({
    data: defaultUser,
  });

  await prisma.profile.create({
    data: {
      userId: user.id,
      data: defaultProfile.data,
    },
  });

  console.info('Database has been seeded. 🌱');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
