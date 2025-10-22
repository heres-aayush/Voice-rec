import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { token, fileId } = await req.json();

    if (!token || !fileId) {
      return NextResponse.json(
        { error: "Missing token or fileId" },
        { status: 400 }
      );
    }

    const deleteRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!deleteRes.ok) {
      const errorText = await deleteRes.text();
      return NextResponse.json(
        { error: "Failed to delete", details: errorText },
        { status: deleteRes.status }
      );
    }

    return NextResponse.json({ success: true, deletedFileId: fileId });
  } catch (err: any) {
    console.error("Delete error:", err);
    return NextResponse.json(
      { error: "Unexpected server error", details: err.message },
      { status: 500 }
    );
  }
}
