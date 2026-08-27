async function httpJson<T>(
  baseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${path}: ${text || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export { httpJson };
