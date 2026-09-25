import { parseEmsalListingText } from "@/lib/emsal/listing-extract";
import { GuvensizAdresHatasi, guvenliFetch } from "@/lib/net/guvenli-fetch";

const EN_FAZLA_BAYT = 2_000_000;

// Reads at most `limit` bytes of the body, so a huge response can't exhaust memory.
async function sinirliMetin(res: Response, limit: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const parcalar: Uint8Array[] = [];
  let toplam = 0;
  while (toplam < limit) {
    const { done, value } = await reader.read();
    if (done) break;
    parcalar.push(value);
    toplam += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  const birlesik = new Uint8Array(Math.min(toplam, limit));
  let konum = 0;
  for (const p of parcalar) {
    const kalan = birlesik.length - konum;
    if (kalan <= 0) break;
    birlesik.set(p.subarray(0, kalan), konum);
    konum += Math.min(p.byteLength, kalan);
  }
  return new TextDecoder().decode(birlesik);
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

  try {
    // Resolves and checks every hop against private / loopback / metadata addresses.
    const response = await guvenliFetch(parsed.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EksperixBot/1.0)",
        Accept: "text/html",
      },
    });

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

    const html = await sinirliMetin(response, EN_FAZLA_BAYT);
    const title = extractMeta(html, "og:title");
    const description = extractMeta(html, "og:description");
    const image = extractMeta(html, "og:image");
    const bodyText = stripToText(html).slice(0, 20000);

    const combinedText = [title, description, bodyText].filter(Boolean).join(" ");
    const fields = parseEmsalListingText(combinedText);

    return Response.json({ fields, gorselUrl: image ?? null, title: title ?? null });
  } catch (error) {
    if (error instanceof GuvensizAdresHatasi) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    // AbortSignal.timeout rejects with TimeoutError.
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
      return Response.json({ error: "Sayfa zaman aşımına uğradı." }, { status: 504 });
    }
    return Response.json({ error: "Sayfa alınırken bir hata oluştu." }, { status: 500 });
  }
}
