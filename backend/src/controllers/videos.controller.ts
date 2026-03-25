import { Request, Response } from "express";
import { createVideo, getVideos, getVideoById } from "../services/videos.service";
import { uploadBuffer } from "../lib/storage";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import path from "path";
import fs from "fs";
import os from "os";

ffmpeg.setFfmpegPath(ffmpegStatic!);

function faststart(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions("-movflags", "faststart")
      .outputOptions("-codec", "copy")
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject);
  });
}

export async function uploadVideo(req: Request, res: Response) {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "No video file provided" });
    return;
  }

  const { title, description, tags } = req.body;
  if (!title) {
    res.status(400).json({ error: "Title is required" });
    return;
  }

  const ext = path.extname(file.originalname);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "upload-"));
  const tmpInput = path.join(tmpDir, `input${ext}`);
  const tmpOutput = path.join(tmpDir, `output${ext}`);

  try {
    fs.writeFileSync(tmpInput, file.buffer);
    await faststart(tmpInput, tmpOutput);

    const key = `videos/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const fileUrl = await uploadBuffer(key, fs.readFileSync(tmpOutput), file.mimetype);

    const video = await createVideo({ title, description, tags, fileUrl });
    res.status(201).json(video);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

export async function listVideos(req: Request, res: Response) {
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;
  const videos = await getVideos(search, tag);
  res.json(videos);
}

export async function getVideo(req: Request<{ id: string }>, res: Response) {
  const video = await getVideoById(req.params.id);
  if (!video) {
    res.status(404).json({ error: "Video not found" });
    return;
  }
  res.json(video);
}
