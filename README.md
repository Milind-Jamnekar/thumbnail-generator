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

| Tech                    | Why                                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Node.js + Express 5** | Minimal, flexible HTTP server. Express 5 adds async error handling out of the box.                                            |
| **TypeScript**          | Type safety across request params, body, and service layer.                                                                   |
| **Prisma 5 + SQLite**   | Prisma gives a clean query API and migrations without needing a separate DB server. SQLite is zero-config for local dev.      |
| **Multer 2**            | Handles `multipart/form-data` video uploads, saves files to disk with unique names.                                           |
| **fluent-ffmpeg**       | Node.js wrapper around FFmpeg. Used to probe video duration (`ffprobe`) and extract frames at even intervals (`screenshots`). |
| **ffmpeg-static**       | Bundles the FFmpeg binary as an npm package — no system install required. |
| **@ffprobe-installer/ffprobe** | Bundles the ffprobe binary as an npm package. |
| **dotenv**              | Loads `DATABASE_URL` and `PORT` from `.env` at startup.                                                                       |

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

---

## Architecture

### Backend — Three-layer pattern

```
routes/videos.ts        → Multer setup, route definitions
controllers/            → Parse req/res, validate input, call services
services/               → All business logic and DB queries (Prisma)
db/index.ts             → Prisma client singleton
```

This keeps route handlers thin and logic testable in isolation.

### Frontend — React Router v7 framework features

```
routes/gallery.tsx      → loader fetches videos from backend, URL-driven search + tag filter
routes/upload.tsx       → action handles upload then thumbnail generation (two intents: upload / select)
routes/video.tsx        → loader fetches full video + thumbnails, action selects primary thumbnail
components/VideoCard.tsx → Extracted card component used in gallery grid
app/api/videos.ts       → Typed fetch wrappers shared by loaders, actions, and client code
```

**Why loaders/actions instead of `useEffect`:**
Data fetching lives in loaders so the page renders with data immediately (no waterfall). Form submissions use actions, which means no manual `fetch` calls or loading state in components — React Router handles it via `useNavigation` and `useFetcher`.

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
  fileUrl     String      // e.g. /uploads/videos/1234567890.mp4
  createdAt   DateTime    @default(now())
  thumbnails  Thumbnail[]
}

model Thumbnail {
  id        String  @id @default(uuid())
  videoId   String
  url       String  // e.g. /uploads/thumbnails/abc-thumb-1.jpg
  isPrimary Boolean @default(false)
  video     Video   @relation(fields: [videoId], references: [id])
}
```

One video has many thumbnails. Only one thumbnail per video should have `isPrimary: true` — enforced in the `selectThumbnail` service with an `updateMany` reset before setting the new primary.

---

## How thumbnail generation works

1. The frontend POSTs the video file → backend saves it to `uploads/videos/`
2. Frontend POSTs to `/videos/:id/thumbnails/generate`
3. `ffprobe` reads the video's duration
4. 5 timestamps are computed at even intervals: `duration / 6 * i` for `i = 1..5`
5. `ffmpeg.screenshots` extracts a `640x360` JPEG at each timestamp into `uploads/thumbnails/`
6. Each frame is saved as a `Thumbnail` record in the DB; the first one is set as `isPrimary: true`
7. The frontend displays all 5 thumbnails and lets the user pick one

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

## Running locally

### Prerequisites

- Node.js 20+
- pnpm

### Backend

```bash
cd backend
pnpm install
cp .env.example .env          # set DATABASE_URL=file:./prisma/dev.db
pnpm exec prisma migrate dev
pnpm dev
```

Server runs at `http://localhost:3000`.

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

App runs at `http://localhost:5173`.
