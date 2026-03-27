import { Request, Response } from "express";
import { createVideo, getVideos, getVideoById } from "../services/videos.service";
import { uploadBuffer } from "../lib/storage";
import path from "path";

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
  const key = `videos/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const fileUrl = await uploadBuffer(key, file.buffer, file.mimetype);

  const video = await createVideo({ title, description, tags, fileUrl });
  res.status(201).json(video);
}

export async function listVideos(req: Request, res: Response) {
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;
  const page = typeof req.query.page === "string" ? parseInt(req.query.page) || undefined : undefined;
  const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit) || undefined : undefined;
  const result = await getVideos(search, tag, page, limit);
  res.json(result);
}

export async function getVideo(req: Request<{ id: string }>, res: Response) {
  const video = await getVideoById(req.params.id);
  if (!video) {
    res.status(404).json({ error: "Video not found" });
    return;
  }
  res.json(video);
}
