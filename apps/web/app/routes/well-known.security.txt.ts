const SECURITY_CONTACT_URL = "https://github.com/hellosunghyun/divelog/security";
const SECURITY_CANONICAL_URL = "https://divelog.ada-kr-pos.com/.well-known/security.txt";

function getExpiresAt(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear() + 1, now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export function loader() {
  const body = [
    `Contact: ${SECURITY_CONTACT_URL}`,
    `Canonical: ${SECURITY_CANONICAL_URL}`,
    `Expires: ${getExpiresAt(new Date())}`,
  ].join("\n");

  return new Response(`${body}\n`, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
