import { NextRequest, NextResponse } from "next/server";
import { Socket } from "net";

export const runtime = "nodejs";

// Allow only private/LAN + loopback addresses so the cloud server can't be used
// as an SSRF proxy to arbitrary external hosts. LAN printers are the use case.
function isPrivateIp(ip: string): boolean {
  if (ip === "localhost" || ip === "127.0.0.1" || ip.startsWith("127.")) return true;
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

function parsePort(raw: any): number {
  const p = Number(raw) || 9100;
  return p >= 1 && p <= 65535 ? p : 9100;
}

/**
 * Send ESC/POS bytes to a network (Ethernet/Wi-Fi) thermal printer via raw TCP
 * on its IP:port (default 9100). Used by the web/app so you can print to a
 * printer over the network — no Bluetooth pairing required.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ip = String(body.ip || "").trim();
  const port = parsePort(body.port);
  const b64 = String(body.data || "");
  const bytes = Buffer.from(b64, "base64");

  if (!ip || !isPrivateIp(ip)) {
    return NextResponse.json({ error: "A valid private/LAN printer IP is required" }, { status: 400 });
  }
  if (!bytes.length || bytes.length > 256 * 1024) {
    return NextResponse.json({ error: "Print data missing or too large" }, { status: 400 });
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const sock = new Socket();
      const timer = setTimeout(() => {
        sock.destroy();
        reject(new Error("Timed out"));
      }, 8000);
      sock.setTimeout(8000);
      sock.connect(port, ip);
      sock.once("connect", () => {
        sock.write(bytes, () => {
          sock.end();
          clearTimeout(timer);
        });
      });
      sock.once("close", () => {
        clearTimeout(timer);
        resolve();
      });
      sock.once("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
    return NextResponse.json({ ok: true, ip, port, bytes: bytes.length });
  } catch (e) {
    return NextResponse.json(
      { error: `Could not reach printer ${ip}:${port} — ${e instanceof Error ? e.message : "failed"}` },
      { status: 502 },
    );
  }
}
