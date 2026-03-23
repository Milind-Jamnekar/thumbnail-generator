import prisma from '../db';

export async function createVideo(data: {
  title: string;
  description?: string;
  tags?: string;
  fileUrl: string;
}) {
  return prisma.video.create({ data });
}

export async function getVideos(search?: string, tag?: string) {
  return prisma.video.findMany({
    where: {
      ...(search ? { title: { contains: search } } : {}),
      ...(tag ? { tags: { contains: tag } } : {}),
    },
    include: {
      thumbnails: {
        where: { isPrimary: true },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getVideoById(id: string) {
  return prisma.video.findUnique({
    where: { id },
    include: { thumbnails: true },
  });
}
