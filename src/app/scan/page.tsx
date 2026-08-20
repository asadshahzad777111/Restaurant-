"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LAST_GUEST_TENANT_KEY, guestOrderPath, parseGuestQr } from "@/lib/guest";
import styles from "./scan.module.css";

type DetectorCtor = new (options?: { formats: string[] }) => {
  detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]>;
};

function getDetector(): DetectorCtor | undefined {
  return (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
}

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Point the camera at a table QR");
  const [manual, setManual] = useState("");
  const [supported, setSupported] = useState(true);
  const lock = useRef(false);

  useEffect(() => {
    let stream: MediaStream | undefined;
    let raf = 0;
    let dead = false;

    async function start() {
      const Detector = getDetector();
      if (!Detector) {
        setSupported(false);
        setStatus("This browser cannot decode QR from camera. Paste the link below.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch {
        setSupported(false);
        setError("Camera permission was denied. Paste the QR link or enter a code instead.");
        return;
      }
      const video = videoRef.current;
      if (!video || dead) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = stream;
      await video.play();
      const detector = new Detector({ formats: ["qr_code"] });

      const tick = async () => {
        if (dead || lock.current) return;
        try {
          if (video.readyState >= 2) {
            const codes = await detector.detect(video);
            const raw = codes[0]?.rawValue;
            if (raw) {
              const parsed = parseGuestQr(raw);
              if (!parsed) {
                setError("That QR is not an ORDO restaurant link.");
              } else {
                lock.current = true;
                setStatus(`Opening ${parsed.tenant}…`);
                localStorage.setItem(LAST_GUEST_TENANT_KEY, parsed.tenant);
                router.push(guestOrderPath(parsed));
                return;
              }
            }
          }
        } catch {
          /* frame skipped */
        }
        raf = requestAnimationFrame(() => void tick());
      };
      raf = requestAnimationFrame(() => void tick());
    }

    void start();
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [router]);

  async function onManual(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseGuestQr(manual);
    if (!parsed) {
      setError("Use a restaurant code or an /order?tenant=… URL.");
      return;
    }
    localStorage.setItem(LAST_GUEST_TENANT_KEY, parsed.tenant);
    router.push(guestOrderPath(parsed));
  }

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Link href="/guest" className={styles.back}>
          Back
        </Link>
        <span className={styles.brand}>ORDO</span>
      </header>

      <main className={styles.main}>
        <h1>Scan QR</h1>
        <p className={styles.lead}>
          Table QRs open dining for that restaurant only. Pickup and delivery links work the same way.
        </p>

        <div className={styles.view}>
          <video ref={videoRef} className={styles.video} playsInline muted />
          <div className={styles.frame} aria-hidden />
          <p className={styles.status}>{status}</p>
        </div>

        {!supported && (
          <p className={styles.hint}>
            Camera decoding needs a Chromium browser on HTTPS (or localhost). The paste field always works.
          </p>
        )}

        <form className={styles.form} onSubmit={(e) => void onManual(e)}>
          <label className={styles.field}>
            Paste QR text or restaurant code
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="DEMO or /order?tenant=DEMO&table=7"
            />
          </label>
          <button type="submit">Open</button>
        </form>

        {error && <p className={styles.error}>{error}</p>}
      </main>
    </div>
  );
}
