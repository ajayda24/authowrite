import { getStorage } from "@/server/storage";

const KEY_PATTERN = /^u\/[A-Za-z0-9_-]+\/\d{4}-\d{2}\/[A-Za-z0-9_-]+\.(png|jpg|webp|gif|avif)$/;

/** Serves uploaded files from whichever storage driver is configured. */
export async function GET(_request: Request, ctx: RouteContext<"/api/files/[...key]">) {
  const { key: parts } = await ctx.params;
  const key = parts.join("/");
  if (!KEY_PATTERN.test(key)) return new Response("Not found", { status: 404 });

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
