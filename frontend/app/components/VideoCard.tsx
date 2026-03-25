import { Link } from "react-router";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import type { Video } from "~/api/videos";

export function VideoCard({ video }: { video: Video }) {
  const primary = video.thumbnails?.[0];
  const tags = video.tags?.split(",").map((t) => t.trim()).filter(Boolean) ?? [];

  return (
    <Link to={`/videos/${video.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer h-full">
        {primary ? (
          <img
            src={primary.url}
            alt={video.title}
            className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground text-sm">
            No thumbnail
          </div>
        )}
        <CardContent className="p-4">
          <p className="font-semibold truncate mb-1">{video.title}</p>
          <p className="text-xs text-muted-foreground mb-3">
            {new Date(video.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
