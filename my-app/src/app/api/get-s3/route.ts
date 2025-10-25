import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const REGION = process.env.NEXT_PUBLIC_AWS_REGION!;
const ACCESS_KEY = process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!;
const SECRET_KEY = process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!;
const BUCKET_NAME = process.env.S3_OUTPUT_BUCKET_NAME!;

const s3 = new S3Client({
  region: REGION!,
  credentials: {
    accessKeyId: ACCESS_KEY!,
    secretAccessKey: SECRET_KEY!,
  },
});

// Helper to convert stream to string
const streamToString = async (stream: any): Promise<string> => {
  return await new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", reject);
  });
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME!,
      Key: key,
    });

    const { Body } = await s3.send(command);
    const data = await streamToString(Body);
    const json = JSON.parse(data);

    return NextResponse.json(json);
  } catch (err: any) {
    console.error("❌ S3 Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch file", details: err.message },
      { status: 500 }
    );
  }
}
