import { Router } from 'express';
import { notFound } from '../../lib/errors';
import { prisma } from '../../lib/prisma';

export const servicesRouter = Router();

const publicFields = {
  id: true,
  nameEn: true,
  nameAr: true,
  descriptionEn: true,
  descriptionAr: true,
  durationMinutes: true,
  priceHalalas: true,
  depositHalalas: true,
} as const;

servicesRouter.get('/services', async (_req, res) => {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: publicFields,
  });
  res.json(services);
});

servicesRouter.get('/services/:id', async (req, res) => {
  const service = await prisma.service.findFirst({ where: { id: req.params.id, active: true }, select: publicFields });
  if (!service) throw notFound('Service');
  res.json(service);
});
