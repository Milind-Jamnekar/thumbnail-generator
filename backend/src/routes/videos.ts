import { Router } from "express";
import multer from "multer";
import {
  uploadVideo,
  listVideos,
  getVideo,
} from "../controllers/videos.controller";
import { generate, select } from "../controllers/thumbnails.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("Only video files are allowed"));
  },
});

const router = Router();

router.post("/", upload.single("video"), uploadVideo);
router.get("/", listVideos);
router.get("/:id", getVideo);
router.post("/:id/thumbnails/generate", generate);
router.post("/:id/thumbnails/select", select);

export default router;
