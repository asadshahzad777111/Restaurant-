export async function uploadTenantMedia(
  token: string | null,
  kind: "logo" | "menu",
  file: File,
): Promise<{ url: string; storage: "r2" | "file-store" }> {
  if (!token) throw new Error("Sign in required");
  const body = new FormData();
  body.append("kind", kind);
  body.append("file", file);
  const res = await fetch("/api/media", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    storage?: "r2" | "file-store";
    error?: string;
  };
  if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
  return { url: data.url, storage: data.storage || "file-store" };
}
