import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { token, filename } = await req.json();

    if (!token || !filename) {
      return NextResponse.json(
        { error: "Missing token or filename" },
        { status: 400 }
      );
    }

    // 1. Find the voice-saptarshi folder
    const folderQuery = encodeURIComponent(
      "name = 'voice-saptarshi' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    );

    const folderRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${folderQuery}&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const folderData = await folderRes.json();
    if (!folderRes.ok || !folderData.files?.length) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const folderId = folderData.files[0].id;

    // 2. Search for the file inside this folder
    //  (you can use exact match or contains)
    const fileQuery = encodeURIComponent(
      `name = '${filename}' and '${folderId}' in parents and trashed = false`
    );

    const fileRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${fileQuery}&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const fileData = await fileRes.json();
    if (!fileRes.ok || !fileData.files?.length) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileId = fileData.files[0].id;

    // 3. Delete the file
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
