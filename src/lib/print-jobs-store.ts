/** In-memory print-job queue so a laptop/admin can send a job that a mobile
 * station (Capacitor APK + printer) picks up and prints. Single-instance store
 * (per-tenant lightweight). Jobs expire after 10 minutes. */

export interface PrintJob {
  id: string;
  text: string;
  dataBase64: string;
  target: string;
  status: "pending" | "claimed" | "done" | "failed";
  createdAt: number;
  expiresAt: number;
  claimedBy?: string;
  error?: string | null;
  orderId?: string | null;
  orderRef?: string | null;
}

interface StoreOpts {
  ttlMs?: number;
}

export function createPrintJobsStore(opts: StoreOpts = {}) {
  const ttl = opts.ttlMs ?? 10 * 60 * 1000;
  const jobs = new Map<string, PrintJob>();

  function newId() {
    return `job_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  function prune() {
    const now = Date.now();
    for (const [id, j] of jobs) if (j.expiresAt < now) jobs.delete(id);
  }

  return {
    createPrintJob(input: {
      text?: string;
      dataBase64?: string;
      target?: string;
      orderId?: string | null;
      orderRef?: string | null;
      staffUser?: unknown;
    }): PrintJob {
      prune();
      const now = Date.now();
      const job: PrintJob = {
        id: newId(),
        text: input.text || "",
        dataBase64: input.dataBase64 || "",
        target: input.target || "any",
        status: "pending",
        createdAt: now,
        expiresAt: now + ttl,
        orderId: input.orderId ?? null,
        orderRef: input.orderRef ?? null,
      };
      jobs.set(job.id, job);
      return job;
    },
    listPendingPrintJobs(station?: string): PrintJob[] {
      prune();
      const list: PrintJob[] = [];
      for (const j of jobs.values()) {
        if (j.status !== "pending") continue;
        if (station && j.target !== "any" && j.target !== station) continue;
        list.push(j);
      }
      return list;
    },
    getPrintJob(id: string): PrintJob | null {
      prune();
      return jobs.get(id) || null;
    },
    claimPrintJob(id: string, opts: { station?: string; user?: unknown }): PrintJob | null {
      prune();
      const j = jobs.get(id);
      if (!j || j.status !== "pending") return null;
      j.status = "claimed";
      j.claimedBy = opts?.station;
      return j;
    },
    completePrintJob(id: string, opts: { status?: "done" | "failed"; error?: string | null; user?: unknown }): PrintJob | null {
      const j = jobs.get(id);
      if (!j) return null;
      j.status = opts?.status === "failed" ? "failed" : "done";
      if (opts?.error) j.error = opts.error;
      return j;
    },
  };
}

export type PrintJobsStore = ReturnType<typeof createPrintJobsStore>;
