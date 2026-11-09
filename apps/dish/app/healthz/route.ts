// Health checks must not depend on a public homepage or a particular restaurant.
export function GET() {
  return new Response("ok", { headers: { "Cache-Control": "no-store" } });
}
