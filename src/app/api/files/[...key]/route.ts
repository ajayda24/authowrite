import { isUploadKey } from "@/lib/files";
import { getStorage } from "@/server/storage";

/** Serves uploaded files from whichever storage driver is configured. */
export async function GET(_request: Request, ctx: RouteContext<"/api/files/[...key]">) {
  const { key: parts } = await ctx.params;
  const key = parts.join("/");
  if (!isUploadKey(key)) return new Response("Not found", { status: 404 });

  const object = await getStorage().get(key);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.body, {
    headers: {
      "Content-Type": object.contentType,
      ...(object.size ? { "Content-Length": String(object.size) } : {}),
      // Keys are random and never reused, so files can be cached forever.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
