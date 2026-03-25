import { useState } from "react";
import { Link, useFetcher, useLoaderData } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import { buttonVariants } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { getVideo, selectThumbnail } from "~/api/videos";
import type { Route } from "./+types/video";

export async function loader({ params }: Route.LoaderArgs) {
  const video = await getVideo(params.id!);
  return { video };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { thumbnailId } = Object.fromEntries(await request.formData());
  await selectThumbnail(params.id!, thumbnailId as string);
  return { ok: true };
}

function VideoPlayer({ src, poster }: { src: string; poster?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="w-full aspect-video bg-muted flex flex-col items-center justify-center text-muted-foreground gap-2">
        <p className="text-sm font-medium">Video unavailable</p>
        <p className="text-xs">The file may have been removed or is not accessible.</p>
      </div>
    );
  }
  return (
    <video
      src={src}
      controls
      poster={poster}
      onError={() => setFailed(true)}
      className="w-full aspect-video bg-black"
    />
  );
}

function ThumbnailImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="w-full aspect-video bg-muted flex items-center justify-center text-muted-foreground text-xs">
        Image unavailable
      </div>
    );
  }
  return (
    <img
      src={src}
      alt="thumbnail"
      onError={() => setFailed(true)}
      className="w-full aspect-video object-cover"
    />
  );
}

export function HydrateFallback() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="aspect-video w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

export default function VideoDetail() {
  const { video } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const optimisticSelectedId = fetcher.formData?.get("thumbnailId") as string | undefined;
  const selectedId = optimisticSelectedId ?? video.thumbnails.find((t) => t.isPrimary)?.id ?? video.thumbnails[0]?.id;

  const tags = video.tags?.split(",").map((t) => t.trim()).filter(Boolean) ?? [];
  const primaryThumb = video.thumbnails.find((t) => t.isPrimary);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Link
        to="/"
        className={buttonVariants({ variant: "ghost", size: "sm" }) + " mb-4 inline-flex"}
      >
        ← Back to Gallery
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: video + info */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden">
            <VideoPlayer
              src={video.fileUrl}
              poster={primaryThumb?.url}
            />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{video.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {new Date(video.createdAt).toLocaleDateString("en-US", {
                  year: "numeric", month: "long", day: "numeric",
                })}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {video.description && (
                <p className="text-sm text-muted-foreground">{video.description}</p>
              )}
              <Separator />
              <div className="flex flex-wrap gap-2">
                {tags.length > 0
                  ? tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)
                  : <span className="text-sm text-muted-foreground">No tags</span>
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: thumbnails panel */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Thumbnails</CardTitle>
              <p className="text-xs text-muted-foreground">Click to set as primary</p>
            </CardHeader>
            <CardContent>
              {video.thumbnails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                  <p>No thumbnails generated yet.</p>
                </div>
              ) : (
                <ScrollArea className="h-[420px] pr-2">
                  <div className="space-y-3">
                    {video.thumbnails.map((thumb) => {
                      const isSelected = thumb.id === selectedId;
                      const isPending = fetcher.state === "submitting" && optimisticSelectedId === thumb.id;
                      return (
                        <fetcher.Form key={thumb.id} method="post">
                          <input type="hidden" name="thumbnailId" value={thumb.id} />
                          <button
                            type="submit"
                            className={`w-full rounded-lg overflow-hidden border-2 transition-all ${
                              isSelected
                                ? "border-primary shadow-md"
                                : "border-transparent hover:border-muted-foreground/30"
                            } ${isPending ? "opacity-75" : ""}`}
                          >
                            <ThumbnailImage src={thumb.url} />
                            {isSelected && (
                              <p className="text-xs text-center py-1 bg-primary text-primary-foreground font-medium">
                                {isPending ? "Saving..." : "Primary"}
                              </p>
                            )}
                          </button>
                        </fetcher.Form>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
