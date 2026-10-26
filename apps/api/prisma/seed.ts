import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const h = (hours: number, minutes = 0) => hours * 60 + minutes;

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@mawid.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'change-me-please';

  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Owner', passwordHash: await bcrypt.hash(password, 10) },
  });

  // Typical barbershop hours here: open late, Friday only after Asr.
  const hours = [
    { weekday: 0, openMinute: h(10), closeMinute: h(23) },
    { weekday: 1, openMinute: h(10), closeMinute: h(23) },
    { weekday: 2, openMinute: h(10), closeMinute: h(23) },
    { weekday: 3, openMinute: h(10), closeMinute: h(23) },
    { weekday: 4, openMinute: h(10), closeMinute: h(23, 30) },
    { weekday: 5, openMinute: h(16), closeMinute: h(23, 30) },
    { weekday: 6, openMinute: h(10), closeMinute: h(23) },
  ];
  for (const row of hours) {
    await prisma.workingHours.upsert({ where: { weekday: row.weekday }, update: row, create: row });
  }

  if ((await prisma.service.count()) === 0) {
    await prisma.service.createMany({
      data: [
        {
          nameEn: 'Haircut',
          nameAr: 'قص شعر',
          descriptionEn: 'Wash, cut and style.',
          descriptionAr: 'غسيل وقص وتصفيف.',
          durationMinutes: 30,
          priceHalalas: 6000,
          depositHalalas: 2000,
          sortOrder: 1,
        },
        {
          nameEn: 'Beard trim',
          nameAr: 'تحديد اللحية',
          durationMinutes: 20,
          priceHalalas: 3500,
          sortOrder: 2,
        },
        {
          nameEn: 'Haircut + beard',
          nameAr: 'قص شعر ولحية',
          descriptionEn: 'The full package. Includes hot towel.',
          descriptionAr: 'الباقة الكاملة مع منشفة ساخنة.',
          durationMinutes: 45,
          priceHalalas: 8500,
          depositHalalas: 2500,
          sortOrder: 3,
        },
        {
          nameEn: 'Kids haircut',
          nameAr: 'قص شعر أطفال',
          descriptionEn: 'Under 12.',
          descriptionAr: 'للأطفال أقل من ١٢ سنة.',
          durationMinutes: 25,
          priceHalalas: 4500,
          sortOrder: 4,
        },
      ],
    });
  }

  console.log(`Seeded. Admin login: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
