import prisma from "../db";

export async function createVideo(data: {
  title: string;
  description?: string;
  tags?: string;
  fileUrl: string;
}) {
  return prisma.video.create({ data });
}

export async function getVideos(
  search?: string,
  tag?: string,
  page: number = 1,
  limit: number = 9,
) {
  const where = {
    ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
    ...(tag ? { tags: { contains: tag, mode: "insensitive" as const } } : {}),
  };

  const skip = (page - 1) * limit;

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      where,
      include: { thumbnails: { where: { isPrimary: true }, take: 1 } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.video.count({ where }),
  ]);

  return { videos, hasMore: skip + videos.length < total };
}

export async function getVideoById(id: string) {
  return prisma.video.findUnique({
    where: { id },
    include: { thumbnails: true },
  });
}
