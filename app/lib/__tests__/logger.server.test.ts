import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createLogger, createModuleLogger } from "../logger.server";

function parseLog(spy: ReturnType<typeof vi.spyOn>) {
  const firstCall = spy.mock.calls[0];
  expect(firstCall).toBeTruthy();
  return JSON.parse(String(firstCall[0])) as Record<string, unknown>;
}

describe("logger.server", () => {
  let debugSpy: ReturnType<typeof vi.spyOn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    debugSpy = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    infoSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createRequest(url = "https://example.com/journey", cfRay?: string) {
    const headers = cfRay ? { "cf-ray": cfRay } : undefined;
    return new Request(url, { headers });
  }

  it("JSON 구조에 level/timestamp/message/requestId를 포함한다", () => {
    const request = createRequest("https://example.com/journey", "abc123");
    const logger = createLogger(request, { LOG_LEVEL: "DEBUG" });

    logger.info("loader_start", { userId: "usr_abc" });

    const payload = parseLog(infoSpy);
    expect(payload).toMatchObject({
      level: "INFO",
      message: "loader_start",
      requestId: "abc123",
      route: "/journey",
      userId: "usr_abc",
    });
    expect(typeof payload.timestamp).toBe("string");
  });

  it("LOG_LEVEL=WARN일 때 debug/info 로그를 출력하지 않는다", () => {
    const request = createRequest();
    const logger = createLogger(request, { LOG_LEVEL: "WARN" });

    logger.debug("debug_message");
    logger.info("info_message");
    logger.warn("warn_message");

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("민감정보를 마스킹한다", () => {
    const request = createRequest();
    const logger = createLogger(request, { LOG_LEVEL: "DEBUG" });

    logger.info("auth", {
      cookie: "adakrpos_session=abc123",
      auth: "authorization: Bearer secret-token",
      email: "test@example.com",
    });

    const payload = parseLog(infoSpy);
    expect(payload.cookie).toBe("adakrpos_session=***");
    expect(payload.auth).toBe("authorization=*** secret-token");
    expect(payload.email).toBe("***@***.***");
  });

  it("순환 참조 데이터가 전달되어도 throw하지 않는다", () => {
    const request = createRequest();
    const logger = createLogger(request, { LOG_LEVEL: "DEBUG" });
    const circular: Record<string, unknown> = { name: "root" };
    circular.self = circular;

    expect(() => logger.info("circular", { circular })).not.toThrow();

    const payload = parseLog(infoSpy);
    expect(payload.circular).toMatchObject({ name: "root", self: "[Circular]" });
  });

  it("child logger가 컨텍스트를 상속한다", () => {
    const request = createRequest();
    const logger = createLogger(request, { LOG_LEVEL: "DEBUG" });
    const child = logger.child({ route: "/test", userId: "usr_child" });

    child.info("child_log");

    const payload = parseLog(infoSpy);
    expect(payload.route).toBe("/test");
    expect(payload.userId).toBe("usr_child");
  });

  it("time/timeEnd가 durationMs를 기록한다", async () => {
    const request = createRequest();
    const logger = createLogger(request, { LOG_LEVEL: "DEBUG" });

    logger.time("loader");
    await new Promise((resolve) => setTimeout(resolve, 2));
    logger.timeEnd("loader", { step: "done" });

    const payload = parseLog(infoSpy);
    expect(payload.message).toBe("loader");
    expect(payload.step).toBe("done");
    expect(typeof payload.durationMs).toBe("number");
    expect(Number(payload.durationMs)).toBeGreaterThan(0);
  });

  it("createModuleLogger는 moduleName을 포함하고 requestId는 비운다", () => {
    const logger = createModuleLogger("notification.worker", "INFO");

    logger.info("job_start");

    const payload = parseLog(infoSpy);
    expect(payload.moduleName).toBe("notification.worker");
    expect(payload.requestId).toBeUndefined();
  });

  it("2KB 문자열은 1KB로 잘리고 [truncated]가 붙는다", () => {
    const request = createRequest();
    const logger = createLogger(request, { LOG_LEVEL: "INFO" });
    const long = "x".repeat(2048);

    logger.info("long", { text: long });

    const payload = parseLog(infoSpy);
    expect(typeof payload.text).toBe("string");
    expect(String(payload.text).endsWith("...[truncated]")).toBe(true);
    expect(String(payload.text).length).toBe(1038);
  });

  it("WARN은 console.warn, ERROR는 console.error로만 출력한다", () => {
    const request = createRequest();
    const logger = createLogger(request, { LOG_LEVEL: "DEBUG" });

    logger.warn("warn_only");
    logger.error("error_only");

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);

    const warnPayload = parseLog(warnSpy);
    const errorPayload = parseLog(errorSpy);
    expect(warnPayload.level).toBe("WARN");
    expect(errorPayload.level).toBe("ERROR");
    expect(infoSpy).not.toHaveBeenCalled();
    expect(debugSpy).not.toHaveBeenCalled();
  });

  it("timestamp는 ISO 8601 형식을 따른다", () => {
    const request = createRequest();
    const logger = createLogger(request, { LOG_LEVEL: "INFO" });

    logger.info("iso_check");

    const payload = parseLog(infoSpy);
    expect(payload.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });
});
