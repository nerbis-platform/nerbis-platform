// ─── Error extraction ────────────────────────────────────────

export function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const axiosErr = err as { response?: { data?: unknown } };
    const data = axiosErr.response?.data;
    if (data && typeof data === 'object') {
      // DRF returns field errors as { field: ["error1", ...] }
      const messages: string[] = [];
      for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
        if (Array.isArray(val)) {
          messages.push(`${key}: ${val.join(', ')}`);
        } else if (typeof val === 'string') {
          messages.push(`${key}: ${val}`);
        }
      }
      if (messages.length > 0) return messages.join('. ');
    }
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

// ─── Card form state ─────────────────────────────────────────

export interface CardFormState {
  name: string;
  gradient: string;
  row: '1' | '2';
  is_visible: boolean;
}

export const EMPTY_CARD_FORM: CardFormState = {
  name: '',
  gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  row: '1',
  is_visible: true,
};
