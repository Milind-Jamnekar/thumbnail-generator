import { useEffect, useRef, useState } from "react";
import type { MetaFunction } from "react-router";
import {
  Link,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from "react-router";
import { listVideos } from "~/api/videos";
import { buttonVariants } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { VideoCard } from "~/components/VideoCard";
import type { Route } from "./+types/gallery";

export const meta: MetaFunction = () => [
  { title: "Video Gallery | Thumbnail Generator" },
  { name: "description", content: "Browse and manage your uploaded videos." },
];

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? "";
  const tag = url.searchParams.get("tag") ?? "";

  const [result, allResult] = await Promise.all([
    listVideos(search || undefined, tag || undefined, 1, 2).catch(() => ({
      videos: [],
      hasMore: false,
    })),
    listVideos(undefined, undefined, 1, 1000).catch(() => ({
      videos: [],
      hasMore: false,
    })),
  ]);

  const allTags = Array.from(
    new Set(
      allResult.videos.flatMap(
        (v) =>
          v.tags
            ?.split(",")
            .map((t) => t.trim())
            .filter(Boolean) ?? [],
      ),
    ),
  );

  return {
    videos: result.videos,
    hasMore: result.hasMore,
    allTags,
    search,
    tag,
  };
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
  const {
    videos: initialVideos,
    hasMore: initialHasMore,
    allTags,
    search,
    tag,
  } = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";

  const [allVideos, setAllVideos] = useState(initialVideos);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(2);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState(search);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingRef = useRef(false);

  // Always keep latest values accessible inside the observer
  const stateRef = useRef({ hasMore, page, search, tag });
  stateRef.current = { hasMore, page, search, tag };

  // Reset when search/tag changes
  useEffect(() => {
    setAllVideos(initialVideos);
    setHasMore(initialHasMore);
    setPage(2);
  }, [initialVideos, initialHasMore]);

  // Infinite scroll observer — runs once
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (
          !entry.isIntersecting ||
          isLoadingRef.current ||
          !stateRef.current.hasMore
        )
          return;

        isLoadingRef.current = true;
        setIsLoadingMore(true);
        try {
          const { page, search, tag } = stateRef.current;
          const result = await listVideos(
            search || undefined,
            tag || undefined,
            page,
            5,
          );
          setAllVideos((prev) => [...prev, ...result.videos]);
          setHasMore(result.hasMore);
          setPage((prev) => prev + 1);
        } catch {}
        isLoadingRef.current = false;
        setIsLoadingMore(false);
      },
      { rootMargin: "200px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
      ) : allVideos.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center text-muted-foreground">
            <p className="text-lg font-medium">No videos found</p>
            <p className="text-sm mt-1">
              Try adjusting your filters or upload a new video.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {allVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
          {isLoadingMore && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mt-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <VideoCardSkeleton key={i} />
              ))}
            </div>
          )}
          <div ref={sentinelRef} className="h-4" />
        </>
      )}
    </main>
  );
}
