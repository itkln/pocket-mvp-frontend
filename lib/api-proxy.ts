const backendURL = process.env.INTERNAL_API_URL ?? "http://localhost:8080";

export type APIProxyContext = {
  params: Promise<{ path?: string[] }>;
};

export async function proxyAPIRequest(request: Request, context: APIProxyContext) {
  const { path = [] } = await context.params;
  const sourceURL = new URL(request.url);
  const targetURL = new URL(`/api/v1/${path.join("/")}`, backendURL);
  targetURL.search = sourceURL.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("origin");
  headers.delete("content-length");

  const upstream = await fetch(targetURL, {
    method: request.method,
    headers,
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer(),
    redirect: "manual",
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("transfer-encoding");
  responseHeaders.delete("access-control-allow-origin");
  responseHeaders.delete("access-control-allow-credentials");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
