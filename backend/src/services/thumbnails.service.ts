import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import path from 'path';
import fs from 'fs';
import os from 'os';
import prisma from '../db';
import { uploadFile, downloadToFile } from '../lib/storage';

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

  // Download video from MinIO to a temp file so ffmpeg can read it
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thumbgen-'));
  const tmpVideo = path.join(tmpDir, `video${path.extname(video.fileUrl.split('?')[0])}`);

  await downloadToFile(video.fileUrl, tmpVideo);

  const duration = await getVideoDuration(tmpVideo);
  const interval = duration / (THUMBNAIL_COUNT + 1);

  const created = [];
  for (let i = 1; i <= THUMBNAIL_COUNT; i++) {
    const timestamp = interval * i;
    const filename = `${videoId}-thumb-${i}.jpg`;
    const tmpOutput = path.join(tmpDir, filename);

    await extractFrame(tmpVideo, tmpOutput, timestamp);

    const url = await uploadFile(`thumbnails/${filename}`, tmpOutput, 'image/jpeg');

    const thumbnail = await prisma.thumbnail.create({
      data: { videoId, url, isPrimary: i === 1 },
    });
    created.push(thumbnail);
  }

  // Clean up temp files
  fs.rmSync(tmpDir, { recursive: true, force: true });

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
