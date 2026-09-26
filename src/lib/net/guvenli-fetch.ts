import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Fetching a user-supplied URL from the server (listing pages for "Getir").
// Without care this is an SSRF hole: a URL can point — directly, through a
// hostname that resolves inward (127.0.0.1.nip.io), through odd IP spellings
// (2130706433, [::ffff:127.0.0.1]) or through a redirect — at loopback, the
// private network or the cloud metadata service. Every hop is resolved and
// every address checked before the request goes out; redirects are followed
// by hand so each one is re-checked.

export class GuvensizAdresHatasi extends Error {}

function ipv4Ozel(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  return (
    a === 0 || // "this" network
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, incl. cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) || // IETF protocol assignments
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    a >= 224 // multicast, reserved, broadcast
  );
}

function ipv6Ozel(ip: string): boolean {
  const v = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (v === "::" || v === "::1") return true;
  // IPv4-mapped / -compatible: judge the embedded IPv4.
  const gomulu = v.match(/^(?:::ffff:|::)(\d+\.\d+\.\d+\.\d+)$/);
  if (gomulu) return ipv4Ozel(gomulu[1]);
  if (/^::ffff:/.test(v)) return true;
  return (
    /^f[cd]/.test(v) || // unique local
    /^fe[89ab]/.test(v) || // link-local
    /^ff/.test(v) // multicast
  );
}

export function ozelAdresMi(ip: string): boolean {
  const tur = isIP(ip.replace(/^\[|\]$/g, ""));
  if (tur === 4) return ipv4Ozel(ip);
  if (tur === 6) return ipv6Ozel(ip);
  return true;
}

async function adresiDogrula(url: URL): Promise<void> {
  if (!["http:", "https:"].includes(url.protocol)) throw new GuvensizAdresHatasi("Yalnızca http(s) adresleri desteklenir.");
  if (url.username || url.password) throw new GuvensizAdresHatasi("Kullanıcı bilgisi içeren adresler desteklenmez.");
  if (url.port && !["80", "443"].includes(url.port)) throw new GuvensizAdresHatasi("Standart dışı port desteklenmez.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host || /^localhost$/i.test(host) || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new GuvensizAdresHatasi("Bu adres desteklenmiyor.");
  }
  // The WHATWG URL parser already normalises 2130706433 / 0x7f.1 to dotted IPv4.
  const adresler = isIP(host) ? [host] : (await lookup(host, { all: true, verbatim: true })).map((a) => a.address);
  if (adresler.length === 0 || adresler.some(ozelAdresMi)) {
    throw new GuvensizAdresHatasi("Bu adres iç ağa işaret ediyor; desteklenmiyor.");
  }
}

const EN_FAZLA_YONLENDIRME = 4;

export async function guvenliFetch(adres: string, init: RequestInit & { zamanAsimiMs?: number } = {}): Promise<Response> {
  const { zamanAsimiMs = 10_000, ...istek } = init;
  const signal = AbortSignal.timeout(zamanAsimiMs);
  let url = new URL(adres);
  for (let adim = 0; adim <= EN_FAZLA_YONLENDIRME; adim++) {
    await adresiDogrula(url);
    const res = await fetch(url, { ...istek, redirect: "manual", signal });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      continue;
    }
    return res;
  }
  throw new GuvensizAdresHatasi("Çok fazla yönlendirme.");
}
