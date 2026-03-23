import { describe, expect, it } from "vitest";

import { loader } from "../well-known.security.txt";

describe("GET /.well-known/security.txt", () => {
  it("보안 공개 문서를 반환한다", async () => {
    const response = loader();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600");
    expect(response.headers.get("Content-Type")).toContain("text/plain");
    expect(body).toContain("Contact: https://github.com/hellosunghyun/divelog/security");
    expect(body).toContain("Canonical: https://divelog.ada-kr-pos.com/.well-known/security.txt");
    expect(body).toMatch(/Expires: \d{4}-\d{2}-\d{2}T00:00:00\.000Z/);
  });
});
