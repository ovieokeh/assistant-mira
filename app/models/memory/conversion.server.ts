import type { ConversionJob } from '@prisma/client';
import { prisma } from '~/db.server';

export const getConversionJob = async (id: string) => {
  const jobInDb = await prisma.conversionJob.findUnique({
    where: {
      id,
    },
  });
  return jobInDb;
};

export const createConversionJob = async ({
  id,
  user,
  currentState,
  url,
}: ConversionJob) => {
  const data = await prisma.conversionJob.create({
    data: {
      id,
      user,
      currentState,
      url,
    },
  });

  return data;
};

export const updateConversionJob = async ({
  id,
  data,
}: {
  id: string;
  data: Partial<ConversionJob>;
}) => {
  const response = await prisma.conversionJob.update({
    where: {
      id,
    },
    data,
  });

  return response;
};
