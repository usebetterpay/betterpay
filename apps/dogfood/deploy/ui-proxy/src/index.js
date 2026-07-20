const UPSTREAM = "https://betterpay-ui-site.pages.dev";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = new URL(url.pathname + url.search, UPSTREAM);
    const headers = new Headers(request.headers);
    headers.set("Host", new URL(UPSTREAM).host);
    headers.delete("cf-connecting-ip");

    const init = {
      method: request.method,
      headers,
      redirect: "manual",
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    const res = await fetch(target, init);
    const out = new Headers(res.headers);
    out.set("Access-Control-Allow-Origin", "*");
    // Rewrite absolute redirects
    const loc = out.get("Location");
    if (loc && loc.includes("betterpay-ui-site.pages.dev")) {
      out.set("Location", loc.replace("https://betterpay-ui-site.pages.dev", "https://ui.betterpay.dev"));
    }
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
  },
};
