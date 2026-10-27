export const onRequest: PagesFunction = async (context) => {
  const { request } = context;
  const url = new URL(request.url);

  // バックエンドの api.jptutoraiyamato.com の /api/chat へ転送
  const targetUrl = `https://api.jptutoraiyamato.com${url.pathname}${url.search}`;

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
      // @ts-ignore (Cloudflare Pages の fetch オプション)
      duplex: "half",
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Proxy Error", message: err.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};