const requestIdCache = new WeakMap<Request, string>();

const LOG_LEVEL_ORDER = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVEL_ORDER;

type LoggerData = Record<string, unknown>;

interface Logger {
  debug(message: string, data?: LoggerData): void;
  info(message: string, data?: LoggerData): void;
  warn(message: string, data?: LoggerData): void;
  error(message: string, data?: LoggerData): void;
  child(context: LoggerData): Logger;
  time(label: string): void;
  timeEnd(label: string, data?: LoggerData): void;
}

interface LoggerOptions {
  request?: Request;
  baseContext: LoggerData;
  level: LogLevel;
  timers: Map<string, number>;
}

function getRequestId(request: Request): string {
  const cached = requestIdCache.get(request);
  if (cached) return cached;
  const id = request.headers.get("cf-ray") ?? crypto.randomUUID();
  requestIdCache.set(request, id);
  return id;
}

function sanitize(str: string): string {
  return str
    .replace(/adakrpos_session=[^;\s"'&]+/gi, "adakrpos_session=***")
    .replace(
      /(api[_-]?key|apikey|authorization|bearer)\s*[:=]\s*["']?[^\s"',}]+/gi,
      "$1=***",
    )
    .replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      "***@***.***",
    );
}

function safeStringify(obj: unknown): string {
  const MAX_STRING_LENGTH = 1024;
  const seen = new WeakSet<object>();

  try {
    return JSON.stringify(obj, (_key, value: unknown) => {
      if (typeof value === "string") {
        const masked = sanitize(value);
        if (masked.length > MAX_STRING_LENGTH) {
          return `${masked.slice(0, MAX_STRING_LENGTH)}...[truncated]`;
        }
        return masked;
      }

      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return "[Circular]";
        seen.add(value);
      }

      return value;
    });
  } catch {
    return '"[unserializable]"';
  }
}

function normalizeLogLevel(input?: string): LogLevel {
  const upper = input?.toUpperCase();
  if (upper === "DEBUG" || upper === "INFO" || upper === "WARN" || upper === "ERROR") {
    return upper;
  }

  const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env
    ?.NODE_ENV;
  return nodeEnv === "development" ? "DEBUG" : "INFO";
}

function shouldLog(currentLevel: LogLevel, incomingLevel: LogLevel): boolean {
  return LOG_LEVEL_ORDER[incomingLevel] >= LOG_LEVEL_ORDER[currentLevel];
}

function createLoggerInternal(options: LoggerOptions): Logger {
  const { request, baseContext, level, timers } = options;

  const write = (logLevel: LogLevel, message: string, data?: LoggerData) => {
    if (!shouldLog(level, logLevel)) return;

    const entry: LoggerData = {
      level: logLevel,
      timestamp: new Date().toISOString(),
      message,
      ...baseContext,
      ...(data ?? {}),
    };

    const output = safeStringify(entry);

    if (logLevel === "DEBUG") {
      console.debug(output);
      return;
    }

    if (logLevel === "INFO") {
      console.log(output);
      return;
    }

    if (logLevel === "WARN") {
      console.warn(output);
      return;
    }

    console.error(output);
  };

  return {
    debug(message, data) {
      try {
        write("DEBUG", message, data);
      } catch {
        return;
      }
    },
    info(message, data) {
      try {
        write("INFO", message, data);
      } catch {
        return;
      }
    },
    warn(message, data) {
      try {
        write("WARN", message, data);
      } catch {
        return;
      }
    },
    error(message, data) {
      try {
        write("ERROR", message, data);
      } catch {
        return;
      }
    },
    child(context) {
      try {
        return createLoggerInternal({
          request,
          level,
          timers,
          baseContext: {
            ...baseContext,
            ...context,
          },
        });
      } catch {
        return createLoggerInternal({ request, baseContext, level, timers });
      }
    },
    time(label) {
      try {
        timers.set(label, Date.now());
      } catch {
        return;
      }
    },
    timeEnd(label, data) {
      try {
        const startedAt = timers.get(label);
        timers.delete(label);
        const durationMs =
          typeof startedAt === "number"
            ? Math.max(0, Date.now() - startedAt)
            : 0;

        write("INFO", label, {
          ...(data ?? {}),
          durationMs,
        });
      } catch {
        return;
      }
    },
  };
}

export function createLogger(
  request: Request,
  env: { LOG_LEVEL?: string },
): Logger {
  const route = (() => {
    try {
      return new URL(request.url).pathname;
    } catch {
      return undefined;
    }
  })();

  return createLoggerInternal({
    request,
    level: normalizeLogLevel(env.LOG_LEVEL),
    timers: new Map<string, number>(),
    baseContext: {
      requestId: getRequestId(request),
      ...(route ? { route } : {}),
    },
  });
}

export function createModuleLogger(moduleName: string, logLevel?: string): Logger {
  return createLoggerInternal({
    level: normalizeLogLevel(logLevel),
    timers: new Map<string, number>(),
    baseContext: {
      moduleName,
    },
  });
}

export type { Logger };
