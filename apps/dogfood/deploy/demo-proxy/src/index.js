// Origin hop: VPS nginx :9080 → dogfood :8791
// Workers cannot fetch bare IPs and rewrite Host on URL hostnames.
const ORIGIN = "http://app.wazapin.id:9080";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const target = new URL(url.pathname + url.search, ORIGIN);

    const headers = new Headers(request.headers);
    headers.set("X-BetterPay-Origin-Key", env.ORIGIN_KEY);
    headers.set("X-Forwarded-Host", "demo.betterpay.dev");
    headers.set("X-Forwarded-Proto", "https");
    headers.delete("cf-connecting-ip");
    headers.delete("host");

    const init = {
      method: request.method,
      headers,
      redirect: "manual",
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    const res = await fetch(target, init);
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  },
};
