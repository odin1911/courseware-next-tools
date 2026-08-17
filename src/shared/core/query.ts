import type { AppProps } from './types/exercise';

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

export function getCoursewareAppPropsFromQuery(): AppProps {
  const params = new URLSearchParams(window.location.search);

  return {
    unitId: params.get('unitId') || '',
    exerciseId: params.get('exerciseId') || '',
    businessContentUuid: params.get('businessContentUuid') || '',
    channel: params.get('channel') || 'courseware-next',
    fetchDataUrl: params.get('fetchDataUrl') || '',
  };
}
