import { Request, Response } from "express";
import {
  createVideo,
  getVideos,
  getVideoById,
} from "../services/videos.service";

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

  const fileUrl = `/uploads/videos/${file.filename}`;
  const video = await createVideo({ title, description, tags, fileUrl });
  res.status(201).json(video);
}

export async function listVideos(req: Request, res: Response) {
  const search =
    typeof req.query.search === "string" ? req.query.search : undefined;
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
