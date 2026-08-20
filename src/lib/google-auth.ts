/**
 * Google ID token verification (no extra npm dep).
 * Set NEXT_PUBLIC_GOOGLE_CLIENT_ID (+ optional GOOGLE_CLIENT_ID) to enable Sign in with Google.
 */

export type GoogleIdentity = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
};

export function googleClientId() {
  return (
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    ""
  ).trim();
}

export function googleSignInEnabled() {
  return Boolean(googleClientId());
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  const clientId = googleClientId();
  if (!clientId) {
    throw new Error("Google Sign-In is not configured");
  }
  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Invalid Google token");
  }
  const data = (await res.json()) as {
    sub?: string;
    email?: string;
    email_verified?: string | boolean;
    name?: string;
    picture?: string;
    aud?: string;
  };
  if (!data.sub || !data.email) {
    throw new Error("Google token missing email");
  }
  if (data.aud && data.aud !== clientId) {
    throw new Error("Google token audience mismatch");
  }
  const verified = data.email_verified === true || data.email_verified === "true";
  if (!verified) {
    throw new Error("Google email is not verified");
  }
  return {
    sub: data.sub,
    email: data.email.trim().toLowerCase(),
    emailVerified: true,
    name: (data.name || data.email.split("@")[0] || "Guest").trim(),
    picture: data.picture,
  };
}
