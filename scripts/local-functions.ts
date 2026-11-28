type Fetcher = typeof fetch;
type Delay = (milliseconds: number) => Promise<void>;

export async function waitForLocalFunctionsHealth(
  fetcher: Fetcher = fetch,
  delay: Delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  attempts = 30,
): Promise<void> {
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new Error("Jumlah percobaan health check harus minimal satu.");
  }

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetcher("http://127.0.0.1:54321/functions/v1/health", {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.ok) return;
    } catch {
      // Edge Functions may still be starting; retry within the bounded window.
    }

    if (attempt + 1 < attempts) await delay(2_000);
  }

  throw new Error("Edge Functions lokal belum siap setelah health check.");
}
