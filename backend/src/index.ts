import "dotenv/config";
import express from "express";
import cors from "cors";
import videosRouter from "./routes/videos";
import { ensureBucket } from "./lib/storage";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/videos", videosRouter);

app.listen(PORT, async () => {
  await ensureBucket();
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
