import type { SpineGlobal } from './spineTypes';

const loadedScripts = new Set<string>();
const loadingScripts = new Map<string, Promise<void>>();
let webglSupportCache: boolean | null = null;

function normalizeScriptUrl(url: string) {
  try {
    return new URL(url, document.baseURI).href;
  } catch {
    return url;
  }
}

function findExistingScript(url: string) {
  const normalizedUrl = normalizeScriptUrl(url);
  return Array.from(document.querySelectorAll('script[src]')).find(
    (script): script is HTMLScriptElement =>
      script instanceof HTMLScriptElement && normalizeScriptUrl(script.src) === normalizedUrl,
  );
}

export function loadSpineRuntimeScript(url: string): Promise<void> {
  const normalizedUrl = normalizeScriptUrl(url);

  if (loadedScripts.has(normalizedUrl)) {
    return Promise.resolve();
  }

  const pending = loadingScripts.get(normalizedUrl);
  if (pending) {
    return pending;
  }

  const existingScript = findExistingScript(normalizedUrl);
  if (existingScript) {
    if (getSpineGlobal()?.webgl?.SceneRenderer) {
      loadedScripts.add(normalizedUrl);
      return Promise.resolve();
    }

    const promise = new Promise<void>((resolve, reject) => {
      const handleLoad = () => {
        loadedScripts.add(normalizedUrl);
        loadingScripts.delete(normalizedUrl);
        existingScript.removeEventListener('load', handleLoad);
        existingScript.removeEventListener('error', handleError);
        resolve();
      };
      const handleError = () => {
        loadingScripts.delete(normalizedUrl);
        existingScript.removeEventListener('load', handleLoad);
        existingScript.removeEventListener('error', handleError);
        reject(new Error(`Failed to load script: ${url}`));
      };

      existingScript.addEventListener('load', handleLoad);
      existingScript.addEventListener('error', handleError);
    });

    loadingScripts.set(normalizedUrl, promise);
    return promise;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => {
      loadedScripts.add(normalizedUrl);
      loadingScripts.delete(normalizedUrl);
      resolve();
    };
    script.onerror = () => {
      loadingScripts.delete(normalizedUrl);
      reject(new Error(`Failed to load script: ${url}`));
    };
    document.head.appendChild(script);
  });

  loadingScripts.set(normalizedUrl, promise);
  return promise;
}

export function getSpineGlobal(): SpineGlobal | null {
  return (window as unknown as { spine?: SpineGlobal }).spine ?? null;
}

export function releaseWebGLContext(gl: WebGLRenderingContext | null) {
  if (!gl) {
    return;
  }
  try {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    // ignore
  }
}

export function isWebGLSupported(): boolean {
  if (webglSupportCache != null) {
    return webglSupportCache;
  }

  try {
    const testCanvas = document.createElement('canvas');
    const gl =
      (testCanvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (testCanvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    webglSupportCache = !!gl;
    releaseWebGLContext(gl);
    return webglSupportCache;
  } catch {
    webglSupportCache = false;
    return false;
  }
}
