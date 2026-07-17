export function getQueryParam(name: string): string | null {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

export function getAllQueryParams(): Record<string, string> {
  const url = new URL(window.location.href);
  const result: Record<string, string> = {};

  url.searchParams.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}
