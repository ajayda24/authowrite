import { getAuth } from "@/server/auth";

// Resolve the auth instance per request so the build never needs secrets.
export const GET = (request: Request) => getAuth().handler(request);
export const POST = (request: Request) => getAuth().handler(request);
