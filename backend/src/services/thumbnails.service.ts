import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import path from 'path';
import fs from 'fs';
import prisma from '../db';

ffmpeg.setFfmpegPath(ffmpegStatic!);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const THUMBNAIL_COUNT = 5;

function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata.format.duration ?? 0);
    });
  });
}

function extractFrame(videoPath: string, outputPath: string, timestamp: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '640x360',
      })
      .on('end', () => resolve())
      .on('error', reject);
  });
}

export async function generateThumbnails(videoId: string) {
  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) throw new Error('Video not found');

  const videoPath = path.join(__dirname, '../../', video.fileUrl);
  if (!fs.existsSync(videoPath)) throw new Error('Video file not found on disk');

  const thumbnailsDir = path.join(__dirname, '../../uploads/thumbnails');
  if (!fs.existsSync(thumbnailsDir)) fs.mkdirSync(thumbnailsDir, { recursive: true });

  const duration = await getVideoDuration(videoPath);
  const interval = duration / (THUMBNAIL_COUNT + 1);

  const created = [];
  for (let i = 1; i <= THUMBNAIL_COUNT; i++) {
    const timestamp = interval * i;
    const filename = `${videoId}-thumb-${i}.jpg`;
    const outputPath = path.join(thumbnailsDir, filename);

    await extractFrame(videoPath, outputPath, timestamp);

    const thumbnail = await prisma.thumbnail.create({
      data: {
        videoId,
        url: `/uploads/thumbnails/${filename}`,
        isPrimary: i === 1,
      },
    });
    created.push(thumbnail);
  }

  return created;
}

export async function selectThumbnail(videoId: string, thumbnailId: string) {
  await prisma.thumbnail.updateMany({
    where: { videoId },
    data: { isPrimary: false },
  });

  return prisma.thumbnail.update({
    where: { id: thumbnailId },
    data: { isPrimary: true },
  });
}
