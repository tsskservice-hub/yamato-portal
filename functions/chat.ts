export const onRequest: PagesFunction = async (context) => {
  const { request } = context;
  const url = new URL(request.url);

  // 転送先のバックエンドURL（api.jptutoraiyamato.com の /chat）
  const targetUrl = `https://api.jptutoraiyamato.com${url.pathname}${url.search}`;

  try {
    // リクエストのメソッド、ヘッダー、ボディを引き継いでバックエンドに転送
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
      // @ts-ignore (Cloudflare Workers / Pages のfetchオプション)
      duplex: "half",
    });

    // バックエンドからのレスポンスをそのままブラウザに返す
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