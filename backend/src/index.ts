import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import videosRouter from "./routes/videos";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/videos", videosRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
