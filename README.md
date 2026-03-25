# Thumbnail Generator

A full-stack web app for uploading videos, auto-generating thumbnails with FFmpeg, and browsing a searchable video gallery.

---

## What it does

- Upload a video with a title, description, and tags
- Automatically extract 5 thumbnail frames from the video using FFmpeg
- Pick one thumbnail as the primary image shown in the gallery
- Browse all uploaded videos in a gallery with live search and tag filtering
- View a video detail page where you can re-select the primary thumbnail at any time

---

## Tech Stack

### Backend

| Tech                           | Why                                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| **Node.js + Express **         | Minimal, flexible HTTP server.                                                                                                |
| **TypeScript**                 | Type safety across request params, body, and service layer.                                                                   |
| **Prisma 5 + PostgreSQL**      | Prisma gives a clean query API and migrations. PostgreSQL handles concurrent writes reliably in production.                   |
| **Multer 2**                   | Handles `multipart/form-data` video uploads using memory storage — file never touches disk.                                   |
| **fluent-ffmpeg**              | Node.js wrapper around FFmpeg. Used to probe video duration (`ffprobe`) and extract frames at even intervals (`screenshots`). |
| **ffmpeg-static**              | Bundles the FFmpeg binary as an npm package — no system install required.                                                     |
| **@ffprobe-installer/ffprobe** | Bundles the ffprobe binary as an npm package.                                                                                 |
| **@aws-sdk/client-s3**         | S3-compatible client used to upload and download files from MinIO.                                                            |
| **dotenv**                     | Loads environment variables from `.env` at startup.                                                                           |

### Frontend

| Tech                                 | Why                                                                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **React 19**                         | Latest React with concurrent features.                                                                                                      |
| **React Router v7 (framework mode)** | Provides server-side loaders, actions, pending UI, and file-based routing. Data fetching happens in loaders, not `useEffect`.               |
| **TypeScript**                       | Full type coverage across routes, API client, and components.                                                                               |
| **Tailwind CSS v4**                  | Utility-first styling with CSS variable tokens.                                                                                             |
| **shadcn/ui (base-nova)**            | Pre-built, accessible components (Card, Badge, Input, Select, Skeleton, ScrollArea, Separator). Based on `@base-ui/react` instead of Radix. |
| **Geist Variable font**              | Clean, modern font loaded via `@fontsource-variable/geist`.                                                                                 |
| **Vite**                             | Fast dev server and bundler. Used under the hood by React Router's framework tooling.                                                       |

### Infrastructure

| Tech           | Why                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **MinIO**      | Self-hosted S3-compatible object storage. Stores uploaded videos and generated thumbnails. Runs as a Docker container. |
| **PostgreSQL** | Production database. Runs as a Docker container.                                                                       |
| **PM2**        | Node.js process manager. Keeps both backend and frontend processes running and restarts them on server reboot.         |
| **nginx**      | Reverse proxy routing subdomains to the correct PM2 processes.                                                         |

---

## Architecture

### Backend — Three-layer pattern

```
routes/videos.ts        → Multer setup, route definitions
controllers/            → Parse req/res, validate input, call services
services/               → All business logic and DB queries (Prisma)
lib/storage.ts          → MinIO S3 client (upload, download, bucket setup)
db/index.ts             → Prisma client singleton
```

This keeps route handlers thin and logic testable in isolation.

### Frontend — React Router v7 framework features

```
routes/gallery.tsx       → loader fetches videos from backend, URL-driven search + tag filter
routes/upload.tsx        → action handles upload then thumbnail generation (two intents: upload / select)
routes/video.tsx         → loader fetches full video + thumbnails, action selects primary thumbnail
components/VideoCard.tsx → Extracted card component used in gallery grid
app/api/videos.ts        → Typed fetch wrappers shared by loaders, actions, and client code
```

**Why loaders/actions instead of `useEffect`:**
Data fetching lives in loaders so the page renders with data immediately (no waterfall). Form submissions use actions — no manual `fetch` calls or loading state in components, React Router handles it via `useNavigation` and `useFetcher`.

**Optimistic UI:**
On the video detail page, clicking a thumbnail is optimistic — `fetcher.formData` is read immediately to highlight the selected thumbnail before the server responds, making the UI feel instant.

**Pending UI:**
The gallery shows skeleton cards while navigating (via `useNavigation`). The upload page shows skeleton thumbnails while the video uploads and FFmpeg processes frames.

---

## Database Schema

```prisma
model Video {
  id          String      @id @default(uuid())
  title       String
  description String?
  tags        String?     // comma-separated: "react, typescript, vite"
  fileUrl     String      // full MinIO URL
  createdAt   DateTime    @default(now())
  thumbnails  Thumbnail[]
}

model Thumbnail {
  id        String  @id @default(uuid())
  videoId   String
  url       String  // full MinIO URL
  isPrimary Boolean @default(false)
  video     Video   @relation(fields: [videoId], references: [id])
}
```

One video has many thumbnails. Only one thumbnail per video has `isPrimary: true` — enforced in the `selectThumbnail` service with an `updateMany` reset before setting the new primary.

---

## How thumbnail generation works

1. Frontend POSTs the video file → multer holds it in memory as a buffer
2. Buffer is uploaded directly to MinIO under `videos/` — full MinIO URL stored in DB
3. Frontend POSTs to `/videos/:id/thumbnails/generate`
4. Backend downloads the video from MinIO to a temp directory using `GetObjectCommand`
5. `ffprobe` reads the video duration
6. 5 timestamps computed at even intervals: `duration / 6 * i` for `i = 1..5`
7. `ffmpeg.screenshots` extracts a `640x360` JPEG at each timestamp into the temp dir
8. Each JPEG is uploaded to MinIO under `thumbnails/` and saved as a `Thumbnail` record
9. Temp directory is deleted
10. Frontend displays all 5 thumbnails and lets the user pick one

---

## API Reference

| Method | Endpoint                          | Description                                                                       |
| ------ | --------------------------------- | --------------------------------------------------------------------------------- |
| `GET`  | `/health`                         | Health check                                                                      |
| `POST` | `/videos`                         | Upload a video (`multipart/form-data`: `video`, `title`, `description?`, `tags?`) |
| `GET`  | `/videos`                         | List videos (query: `search?`, `tag?`)                                            |
| `GET`  | `/videos/:id`                     | Get single video with all thumbnails                                              |
| `POST` | `/videos/:id/thumbnails/generate` | Extract and save 5 thumbnails via FFmpeg                                          |
| `POST` | `/videos/:id/thumbnails/select`   | Set primary thumbnail (`{ thumbnailId }`)                                         |

---

## Deployment

The app is deployed on a Hetzner VPS with the following setup:

```
app.milindjamnekar.dev      → frontend  (PM2 → react-router-serve)
api.milindjamnekar.dev      → backend   (PM2 → node dist/index.js)
storage.milindjamnekar.dev  → MinIO     (Docker)
```

nginx sits in front of all three, handling SSL termination via certbot.

### CI/CD — GitHub Actions

Every push to `main` triggers an automatic deployment:

```
push to main
  ↓
GitHub Actions (ubuntu-latest)
  ↓
SSH into Hetzner server
  ↓
git pull origin main
  ↓
pnpm install + build backend (tsc)
pnpm install + build frontend (react-router build)
  ↓
prisma migrate deploy
  ↓
pm2 restart thumbnail-backend
pm2 restart thumbnail-frontend
```

No manual steps needed after the initial server setup.

---

## Running locally

### Prerequisites

- Node.js 20+
- pnpm
- Docker (for PostgreSQL and MinIO)

### Start infrastructure

```bash
docker compose up -d
```

### Backend

```bash
cd backend
pnpm install
cp .env.example .env
pnpm exec prisma migrate dev
pnpm dev
```

Server runs at `http://localhost:3003`.

### Frontend

```bash
cd frontend
pnpm install
cp .env.example .env
pnpm dev
```

App runs at `http://localhost:5173`.

### MinIO console

Available at `http://localhost:9001` — default credentials: `minioadmin / minioadmin`.
