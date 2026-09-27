import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/server/auth/session";
import { RateLimitError } from "@/server/rate-limit";
import { DomainError } from "@/server/services/errors";
import { MAX_UPLOAD_BYTES, uploadImage } from "@/server/services/uploads";

/** POST multipart/form-data with a single `file` field. Returns { url, key }. */
export async function POST(request: NextRequest) {
  // Same-origin check: uploads are only accepted from our own pages.
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Cross-origin upload rejected." }, { status: 403 });
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "Images must be 5 MB or smaller." }, { status: 413 });
  }

  const viewer = await getViewer();
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file was provided." }, { status: 400 });
    }
    const result = await uploadImage(viewer, new Uint8Array(await file.arrayBuffer()));
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429 });
    console.error("[upload] failed", error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
