import { useRef, useState } from "react";
import {
  Link,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from "react-router";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => [
  { title: "Video Gallery | Thumbnail Generator" },
  { name: "description", content: "Browse and manage your uploaded videos." },
];
import { Input } from "~/components/ui/input";
import { buttonVariants } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { listVideos } from "~/api/videos";
import { VideoCard } from "~/components/VideoCard";
import type { Route } from "./+types/gallery";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? "";
  const tag = url.searchParams.get("tag") ?? "";

  // Filtered videos from backend + all videos just for tag list
  const [videos, allVideos] = await Promise.all([
    listVideos(search || undefined, tag || undefined),
    listVideos(),
  ]);

  const allTags = Array.from(
    new Set(
      allVideos.flatMap(
        (v) =>
          v.tags
            ?.split(",")
            .map((t) => t.trim())
            .filter(Boolean) ?? [],
      ),
    ),
  );

  return { videos, allTags, search, tag };
}

function VideoCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video w-full" />
      <CardContent className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
        <div className="flex gap-1">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Gallery() {
  const { videos, allTags, search, tag } = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";

  const [searchInput, setSearchInput] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchInput(e.target.value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchParams((prev) => {
        if (e.target.value) prev.set("search", e.target.value);
        else prev.delete("search");
        return prev;
      });
    }, 300);
  }

  function handleTagChange(value: string) {
    setSearchParams((prev) => {
      if (value) prev.set("tag", value);
      else prev.delete("tag");
      return prev;
    });
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Video Gallery</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Browse and manage your uploaded videos
          </p>
        </div>
        <Link to="/upload" className={buttonVariants({ size: "lg" })}>
          + Upload Video
        </Link>
      </div>

      <Separator className="my-4" />

      <div className="flex gap-3 mb-6">
        <Input
          placeholder="Search by title..."
          value={searchInput}
          onChange={handleSearchChange}
          className="max-w-xs"
        />
        <Select value={tag} onValueChange={handleTagChange}>
          <SelectTrigger className="w-40" aria-label="Filter by tag">
            <SelectValue placeholder="All tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All tags</SelectItem>
            {allTags.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center text-muted-foreground">
            <p className="text-lg font-medium">No videos found</p>
            <p className="text-sm mt-1">
              Try adjusting your filters or upload a new video.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </main>
  );
}
