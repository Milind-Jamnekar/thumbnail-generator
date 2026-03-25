import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";
import fs from "fs";
import { Readable } from "stream";

const BUCKET = process.env.MINIO_BUCKET!;

const s3 = new S3Client({
  endpoint: `http${process.env.MINIO_USE_SSL === "true" ? "s" : ""}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`,
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
  forcePathStyle: true,
});

export async function ensureBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
  }

  // Make all objects publicly readable so the browser can load images/videos directly
  await s3.send(
    new PutBucketPolicyCommand({
      Bucket: BUCKET,
      Policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: "*",
            Action: "s3:GetObject",
            Resource: `arn:aws:s3:::${BUCKET}/*`,
          },
        ],
      }),
    })
  );
}

export async function uploadBuffer(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  await s3.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType })
  );
  return `${process.env.MINIO_PUBLIC_URL}/${BUCKET}/${key}`;
}

export async function uploadFile(
  key: string,
  filePath: string,
  contentType: string
): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  return uploadBuffer(key, buffer, contentType);
}

// Extracts the S3 key from a full MinIO public URL
function urlToKey(url: string): string {
  const prefix = `${process.env.MINIO_PUBLIC_URL}/${BUCKET}/`;
  return url.slice(prefix.length);
}

export async function downloadToFile(url: string, destPath: string): Promise<void> {
  const key = urlToKey(url);
  const { Body } = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!Body) throw new Error("Empty response from storage");
  await new Promise<void>((resolve, reject) => {
    const stream = fs.createWriteStream(destPath);
    (Body as Readable).pipe(stream);
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}
