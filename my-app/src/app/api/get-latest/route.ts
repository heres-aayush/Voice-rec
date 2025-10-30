import { NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = process.env.S3_OUTPUT_BUCKET_NAME!;
const REGION = process.env.NEXT_PUBLIC_AWS_REGION!;
const PREFIX = "medical/"; 

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET() {
  try {
    const listRes = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: PREFIX,
    }));

    const contents = listRes.Contents;
    if (!contents || contents.length === 0) {
      return NextResponse.json({ error: "No objects found" }, { status: 404 });
    }

    const newest = contents.reduce((prev, current) => {
      if (!prev.LastModified) return current;
      if (!current.LastModified) return prev;
      return current.LastModified > prev.LastModified ? current : prev;
    });

    const key = newest.Key!;
    console.log("Newest key:", key);

    const getRes = await s3.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }));

    return NextResponse.json({
      key,
      lastModified: newest.LastModified,
      message: "Latest file found successfully 🎉",
    });
  } catch (err: any) {
    console.error("Error retrieving latest file:", err);
    return NextResponse.json({
      error: "Internal server error",
      details: err.message,
    }, { status: 500 });
  }
}
