"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LAST_GUEST_TENANT_KEY, guestOrderPath, parseGuestQr } from "@/lib/guest";
import {
  listContainer,
  listItem,
  pageEnter,
  useIsCoarsePointer,
  usePrefersReducedMotion,
} from "@/lib/motion";
import styles from "./scan.module.css";

type DetectorCtor = new (options?: { formats: string[] }) => {
  detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]>;
};

function getDetector(): DetectorCtor | undefined {
  return (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
}

const RECENT_KEY = "ordo_recent_kitchens";

type RecentKitchen = { code: string; at: number };

function readRecent(): RecentKitchen[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as RecentKitchen[];
    return Array.isArray(list) ? list.filter((k) => k && /^[A-Z0-9_-]{2,24}$/.test(k.code)).slice(0, 6) : [];
  } catch {
    return [];
  }
}

function rememberKitchen(code: string) {
  try {
    const next = [{ code, at: Date.now() }, ...readRecent().filter((k) => k.code !== code)].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

type CamState = "starting" | "live" | "unsupported" | "denied";

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Point the camera at a table QR");
  const [cam, setCam] = useState<CamState>("starting");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [manual, setManual] = useState("");
  const [recent, setRecent] = useState<RecentKitchen[]>([]);
  const [opening, setOpening] = useState<string | null>(null);
  const lock = useRef(false);
  const openingRef = useRef<string | null>(null);
  const reduced = usePrefersReducedMotion();
  const coarse = useIsCoarsePointer();
  const enter = pageEnter(reduced, coarse);
  const item = listItem(reduced, coarse);

  useEffect(() => {
    setRecent(readRecent());
  }, []);

  const openKitchen = useCallback(
    (code: string, extra?: { table?: string; mode?: "pickup" | "delivery" | "table" }) => {
      const tenant = code.trim().toUpperCase();
      if (openingRef.current) return;
      openingRef.current = tenant;
      setOpening(tenant);
      setStatus(`Opening ${tenant}…`);
      localStorage.setItem(LAST_GUEST_TENANT_KEY, tenant);
      rememberKitchen(tenant);
      window.setTimeout(() => {
        router.push(guestOrderPath({ tenant, table: extra?.table, mode: extra?.mode }));
      }, reduced ? 0 : 420);
    },
    [reduced, router],
  );

  // Camera + BarcodeDetector loop. Restarts when `facing` toggles.
  useEffect(() => {
    let stream: MediaStream | undefined;
    let raf = 0;
    let dead = false;

    async function start() {
      const Detector = getDetector();
      if (!Detector) {
        setCam("unsupported");
        setStatus("This browser cannot decode QR from camera. Paste the link below.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } },
          audio: false,
        });
      } catch {
        setCam("denied");
        setStatus("Camera permission denied. Paste the QR link or enter a code instead.");
        return;
      }
      setCam("live");
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
                setStatus("QR read — not an ORDO link. Try another table.");
              } else {
                lock.current = true;
                openKitchen(parsed.tenant, { table: parsed.table, mode: parsed.mode });
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
  }, [facing, openKitchen]);

  function toggleCamera() {
    setError("");
    setStatus("Switching camera…");
    setFacing((f) => (f === "environment" ? "user" : "environment"));
  }

  async function onManual(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseGuestQr(manual);
    if (!parsed) {
      setError("Use a restaurant code or an /order?tenant=… URL.");
      return;
    }
    localStorage.setItem(LAST_GUEST_TENANT_KEY, parsed.tenant);
    rememberKitchen(parsed.tenant);
    router.push(guestOrderPath(parsed));
  }

  const statusTone =
    cam === "live"
      ? styles.statusLive
      : opening
        ? styles.statusOpen
        : cam === "denied" || error
          ? styles.statusError
          : styles.statusIdle;

  return (
    <motion.div className={styles.page} variants={enter} initial="hidden" animate="show">
      <header className={styles.top}>
        <Link href="/guest" className={styles.back}>
          ← Back
        </Link>
        <span className={styles.brand}>ORDO</span>
      </header>

      <main className={styles.main}>
        <motion.div variants={item} initial="hidden" animate="show">
          <h1>Scan QR</h1>
          <p className={styles.lead}>
            Table QRs open dining for that restaurant only. Pickup and delivery links work the same way.
          </p>
        </motion.div>

        <motion.div
          className={styles.view}
          variants={item}
          initial="hidden"
          animate="show"
          transition={{ delay: reduced ? 0 : 0.05 }}
        >
          <video ref={videoRef} className={styles.video} playsInline muted />

          {/* Viewfinder: corners + laser + shimmer */}
          <div className={styles.corners} aria-hidden>
            <i className={styles.cornerTL} />
            <i className={styles.cornerTR} />
            <i className={styles.cornerBL} />
            <i className={styles.cornerBR} />
          </div>
          {cam === "live" && <div className={styles.laser} aria-hidden />}

          <p className={`${styles.status} ${statusTone}`} role="status">
            {opening ? (
              <>
                <span className={styles.spinner} aria-hidden />
                Opening {opening}…
              </>
            ) : (
              status
            )}
          </p>
        </motion.div>

        <motion.div
          className={styles.actions}
          variants={listContainer(0.05)}
          initial="hidden"
          animate="show"
        >
          {cam === "live" && (
            <button type="button" className={styles.flip} onClick={toggleCamera}>
              {facing === "environment" ? "📷 Front camera" : "📷 Back camera"}
            </button>
          )}
          <button type="button" className={styles.demo} onClick={() => openKitchen("DEMO")}>
            ✨ Open DEMO kitchen
          </button>
        </motion.div>

        {/* Pick a table in the demo — select a table number and go */}
        <motion.section
          className={styles.demoTables}
          variants={listContainer(0.04)}
          initial="hidden"
          animate="show"
        >
          <div className={styles.demoTablesHead}>
            <span>DEMO · choose a table</span>
          </div>
          <div className={styles.chips}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <motion.button
                key={n}
                type="button"
                variants={item}
                className={styles.chip}
                onClick={() => openKitchen("DEMO", { table: String(n) })}
              >
                T{n}
              </motion.button>
            ))}
          </div>
        </motion.section>

        <motion.div className={styles.installGroup} variants={item} initial="hidden" animate="show">
          <div className={styles.installHead}>📲 Get ORDO on your phone</div>
          <div className={styles.installRow}>
            <motion.a className={styles.install} href="/apk/ordo-staff.apk" download>
              🧑‍🍳 Staff app
            </motion.a>
          </div>
        </motion.div>

        {recent.length > 0 && (
          <motion.section
            className={styles.recent}
            variants={listContainer(0.04)}
            initial="hidden"
            animate="show"
          >
            <div className={styles.recentHead}>
              <span>Recent kitchens</span>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem(RECENT_KEY);
                  setRecent([]);
                }}
              >
                Clear
              </button>
            </div>
            <div className={styles.chips}>
              {recent.map((k) => (
                <motion.button
                  key={k.code}
                  type="button"
                  variants={item}
                  className={styles.chip}
                  onClick={() => openKitchen(k.code)}
                >
                  {k.code}
                </motion.button>
              ))}
            </div>
          </motion.section>
        )}

        <motion.form className={styles.form} variants={item} initial="hidden" animate="show" onSubmit={(e) => void onManual(e)}>
          <label className={styles.field}>
            Paste QR text or restaurant code
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="DEMO or /order?tenant=DEMO&table=7"
              autoCapitalize="characters"
            />
          </label>
          <button type="submit" className={styles.openBtn}>
            Open
          </button>
        </motion.form>

        {cam === "unsupported" && (
          <motion.p className={styles.hint} variants={item} initial="hidden" animate="show">
            Camera decoding needs a Chromium browser on HTTPS (or localhost). The paste field and
            recent kitchens always work.
          </motion.p>
        )}

        {error && (
          <motion.p
            className={styles.error}
            variants={item}
            initial="hidden"
            animate="show"
            key={error}
          >
            {error}
          </motion.p>
        )}
      </main>
    </motion.div>
  );
}
