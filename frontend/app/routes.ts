import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/gallery.tsx"),
  route("upload", "routes/upload.tsx"),
  route("videos/:id", "routes/video.tsx"),
] satisfies RouteConfig;
