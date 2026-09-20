import { parseEmsalListingText } from "@/lib/emsal/listing-extract";

const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^\[?::1\]?$/,
];

function isBlockedHost(hostname: string): boolean {
  return BLOCKED_HOSTNAME_PATTERNS.some((pattern) => pattern.test(hostname));
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractMeta(html: string, property: string): string | undefined {
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`,
    "i",
  );
  const match = html.match(pattern);
  return match ? decodeEntities(match[1]).trim() : undefined;
}

function stripToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
  ).trim();
}

export async function POST(request: Request) {
  let url: string;
  try {
    const body = await request.json();
    url = String(body.url ?? "");
  } catch {
    return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return Response.json({ error: "Geçerli bir web adresi girin." }, { status: 400 });
  }

  if (!["http:", "https:"].includes(parsed.protocol) || isBlockedHost(parsed.hostname)) {
    return Response.json({ error: "Bu adres desteklenmiyor." }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EksperixBot/1.0)",
        Accept: "text/html",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const blocked = response.status === 403 || response.status === 429 || response.status === 503;
      const error = blocked
        ? "Bu site otomatik erişime izin vermiyor. Verileri manuel doldurabilir veya görsel yükleyip ayrıştırabilirsiniz."
        : `Sayfa alınamadı (HTTP ${response.status}).`;
      return Response.json({ error }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return Response.json({ error: "Bu adres bir web sayfası değil." }, { status: 400 });
    }

    const html = (await response.text()).slice(0, 2_000_000);
    const title = extractMeta(html, "og:title");
    const description = extractMeta(html, "og:description");
    const image = extractMeta(html, "og:image");
    const bodyText = stripToText(html).slice(0, 20000);

    const combinedText = [title, description, bodyText].filter(Boolean).join(" ");
    const fields = parseEmsalListingText(combinedText);

    return Response.json({ fields, gorselUrl: image ?? null, title: title ?? null });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return Response.json({ error: "Sayfa zaman aşımına uğradı." }, { status: 504 });
    }
    return Response.json({ error: "Sayfa alınırken bir hata oluştu." }, { status: 500 });
  }
}
