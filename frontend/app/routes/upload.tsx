import { useState } from "react";
import {
  Form,
  redirect,
  useActionData,
  useFetcher,
  useNavigation,
} from "react-router";
import type { Thumbnail } from "~/api/videos";
import { generateThumbnails, uploadVideo, selectThumbnail } from "~/api/videos";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import type { Route } from "./+types/upload";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "select") {
    const videoId = formData.get("videoId") as string;
    const thumbnailId = formData.get("thumbnailId") as string;
    await selectThumbnail(videoId, thumbnailId);
    return redirect(`/videos/${videoId}`);
  }

  // intent === "upload"
  const video = await uploadVideo(formData);
  const thumbnails = await generateThumbnails(video.id);
  return { videoId: video.id, thumbnails };
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

export default function Upload() {
  const actionData = useActionData<typeof action>() as
    | { videoId: string; thumbnails: Thumbnail[] }
    | undefined;
  const navigation = useNavigation();
  const fetcher = useFetcher();

  const isUploading = navigation.state === "submitting";
  const isSelecting = fetcher.state === "submitting";

  // Optimistic selected thumbnail
  const optimisticSelectedId = fetcher.formData?.get("thumbnailId") as
    | string
    | undefined;
  const [selectedId, setSelectedId] = useState("");

  const activeSelectedId = optimisticSelectedId ?? selectedId;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Upload Video</h1>

      {/* Step 1 — Upload form */}
      {!actionData && !isUploading && (
        <Card>
          <CardHeader>
            <CardTitle>Video Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form
              method="post"
              encType="multipart/form-data"
              className="space-y-4"
            >
              <input type="hidden" name="intent" value="upload" />
              <div className="space-y-1">
                <Label htmlFor="video">Video File</Label>
                <Input
                  id="video"
                  name="video"
                  type="file"
                  accept="video/*"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Enter title"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Optional description"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tags">Tags</Label>
                <Input id="tags" name="tags" placeholder="tag1, tag2, tag3" />
              </div>
              <Button type="submit" className="w-full">
                Upload
              </Button>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Step 2 — Loading */}
      {isUploading && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-lg font-medium">
              Uploading and generating thumbnails...
            </p>
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="aspect-video w-full rounded-md" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 — Thumbnail selection */}
      {actionData && !isUploading && (
        <Card>
          <CardHeader>
            <CardTitle>Select a Thumbnail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {actionData.thumbnails.map((thumb) => (
                <button
                  key={thumb.id}
                  disabled={isSelecting}
                  onClick={() => setSelectedId(thumb.id)}
                  className={`rounded overflow-hidden border-2 transition-colors disabled:opacity-60 ${
                    activeSelectedId === thumb.id
                      ? "border-primary"
                      : "border-transparent"
                  }`}
                >
                  <ThumbnailImage src={thumb.url} />
                </button>
              ))}
            </div>
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="select" />
              <input type="hidden" name="videoId" value={actionData.videoId} />
              <input
                type="hidden"
                name="thumbnailId"
                value={activeSelectedId}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={!activeSelectedId || isSelecting}
              >
                {isSelecting ? "Saving..." : "Done"}
              </Button>
            </fetcher.Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
