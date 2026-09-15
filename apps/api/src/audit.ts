const SENSITIVE_KEYS = /password|secret|token|authorization|cookie|credential/i;
const MAX_STRING_LENGTH = 1_000;

export interface AuditEvent {
  action: string;
  entityType: string;
  entityId?: string;
  actorId?: string;
  requestId?: string;
  ipHash?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditRecorder {
  record(event: AuditEvent): Promise<void>;
}

export function sanitizeAuditMetadata(value: unknown, key = ''): unknown {
  if (SENSITIVE_KEYS.test(key)) {
    return '[REDACTED]';
  }

  if (typeof value === 'string') {
    return value.slice(0, MAX_STRING_LENGTH);
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeAuditMetadata(item));
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 30)
        .map(([entryKey, entryValue]) => [entryKey, sanitizeAuditMetadata(entryValue, entryKey)]),
    );
  }

  return value;
}
