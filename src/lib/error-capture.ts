export type CapturedError = {
  message: string;
  stack?: string;
  at: string;
};

const log: CapturedError[] = [];

/** Normalizes anything thrown into a message we can safely show a user. */
export function toMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

export function captureError(error: unknown, context?: string): string {
  const message = toMessage(error);
  const entry: CapturedError = {
    message: context ? `${context}: ${message}` : message,
    stack: error instanceof Error ? error.stack : undefined,
    at: new Date().toISOString(),
  };

  log.push(entry);
  if (import.meta.env.DEV) {
    console.error(entry.message, error);
  }

  return message;
}

export function getCapturedErrors(): readonly CapturedError[] {
  return log;
}

export function clearCapturedErrors() {
  log.length = 0;
}
