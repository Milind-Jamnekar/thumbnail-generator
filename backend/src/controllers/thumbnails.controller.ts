import { Request, Response } from 'express';
import { generateThumbnails, selectThumbnail } from '../services/thumbnails.service';

export async function generate(req: Request<{ id: string }>, res: Response) {
  const thumbnails = await generateThumbnails(req.params.id);
  res.status(201).json(thumbnails);
}

export async function select(req: Request<{ id: string }>, res: Response) {
  const { thumbnailId } = req.body;
  if (!thumbnailId) {
    res.status(400).json({ error: 'thumbnailId is required' });
    return;
  }
  const thumbnail = await selectThumbnail(req.params.id, thumbnailId);
  res.json(thumbnail);
}
