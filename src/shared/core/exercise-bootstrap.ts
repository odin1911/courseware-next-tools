import type { ExerciseVo, UnitVo } from '@/shared/exercise-parser/src';

export const EXERCISE_BOOTSTRAP_VERSION = 2;
export const EXERCISE_BOOTSTRAP_HANDSHAKE_TIMEOUT_MS = 500;

const REQUEST_TYPE = 'exercise-bootstrap:request';
const RESPONSE_TYPE = 'exercise-bootstrap:response';
const MISS_TYPE = 'exercise-bootstrap:miss';
const ERROR_TYPE = 'exercise-bootstrap:error';
const CONTENT_READY_TYPE = 'exercise-bootstrap:content-ready';
const CAPABILITY_KEY = '__coursewareNextExerciseBootstrap';

export type ExerciseBootstrapData = [ExerciseVo | undefined, UnitVo | undefined];
export type ExerciseBootstrapIdentity =
  | { channel: 'courseware-next'; unitId: string; exerciseId: string }
  | { channel: 'ng-preview'; businessContentUuid: string };

interface ExerciseBootstrapMessageBase {
  version: typeof EXERCISE_BOOTSTRAP_VERSION;
  requestId: string;
}

export type ExerciseBootstrapRequest = ExerciseBootstrapMessageBase &
  ExerciseBootstrapIdentity & { type: typeof REQUEST_TYPE };

type ExerciseBootstrapResponse = ExerciseBootstrapMessageBase &
  ExerciseBootstrapIdentity &
  (
    | { type: typeof RESPONSE_TYPE; state: 'pending' }
    | { type: typeof RESPONSE_TYPE; state: 'ready'; data: ExerciseBootstrapData }
  );

type ExerciseBootstrapMiss = ExerciseBootstrapMessageBase &
  ExerciseBootstrapIdentity & { type: typeof MISS_TYPE };

type ExerciseBootstrapError = ExerciseBootstrapMessageBase &
  ExerciseBootstrapIdentity & { type: typeof ERROR_TYPE; message: string };

type ExerciseBootstrapReply =
  | ExerciseBootstrapResponse
  | ExerciseBootstrapMiss
  | ExerciseBootstrapError;

export type ExerciseContentReadyMessage = ExerciseBootstrapIdentity & {
  type: typeof CONTENT_READY_TYPE;
  version: typeof EXERCISE_BOOTSTRAP_VERSION;
};

export interface ExerciseBootstrapMessageContext {
  origin: string;
  source: Window;
}

type ExerciseBootstrapResolver = (
  request: ExerciseBootstrapRequest,
  context: ExerciseBootstrapMessageContext,
) => ExerciseBootstrapData | null | Promise<ExerciseBootstrapData | null>;

type ExerciseContentReadyListener = (
  message: ExerciseContentReadyMessage,
  context: ExerciseBootstrapMessageContext,
) => void;

let requestSequence = 0;

type BootstrapCapableWindow = Window & {
  [CAPABILITY_KEY]?: { version: typeof EXERCISE_BOOTSTRAP_VERSION };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasValidIdentity(value: Record<string, unknown>): boolean {
  return (
    (value.channel === 'courseware-next' &&
      !('businessContentUuid' in value) &&
      typeof value.unitId === 'string' &&
      value.unitId.length > 0 &&
      typeof value.exerciseId === 'string' &&
      value.exerciseId.length > 0) ||
    (value.channel === 'ng-preview' &&
      !('unitId' in value) &&
      !('exerciseId' in value) &&
      typeof value.businessContentUuid === 'string' &&
      value.businessContentUuid.length > 0)
  );
}

function hasValidBase(value: Record<string, unknown>): boolean {
  return (
    value.version === EXERCISE_BOOTSTRAP_VERSION &&
    typeof value.requestId === 'string' &&
    value.requestId.length > 0 &&
    hasValidIdentity(value)
  );
}

function isExerciseBootstrapRequest(value: unknown): value is ExerciseBootstrapRequest {
  return isRecord(value) && value.type === REQUEST_TYPE && hasValidBase(value);
}

function isExerciseContentReadyMessage(value: unknown): value is ExerciseContentReadyMessage {
  return (
    isRecord(value) &&
    value.type === CONTENT_READY_TYPE &&
    value.version === EXERCISE_BOOTSTRAP_VERSION &&
    hasValidIdentity(value)
  );
}

function isExerciseBootstrapData(value: unknown): value is ExerciseBootstrapData {
  if (!Array.isArray(value) || value.length !== 2) return false;
  return value.every((item) => item === undefined || isRecord(item));
}

function isExerciseBootstrapReply(value: unknown): value is ExerciseBootstrapReply {
  if (!isRecord(value) || !hasValidBase(value)) return false;
  if (value.type === MISS_TYPE) return true;
  if (value.type === ERROR_TYPE) return typeof value.message === 'string';
  if (value.type !== RESPONSE_TYPE) return false;
  if (value.state === 'pending') return true;
  return value.state === 'ready' && isExerciseBootstrapData(value.data);
}

export function matchesExerciseBootstrapIdentity(
  left: ExerciseBootstrapIdentity,
  right: ExerciseBootstrapIdentity,
): boolean {
  if (left.channel !== right.channel) return false;
  if (left.channel === 'courseware-next') {
    return (
      right.channel === 'courseware-next' &&
      left.unitId === right.unitId &&
      left.exerciseId === right.exerciseId
    );
  }
  return right.channel === 'ng-preview' && left.businessContentUuid === right.businessContentUuid;
}

function matchesRequest(reply: ExerciseBootstrapReply, request: ExerciseBootstrapRequest): boolean {
  return reply.requestId === request.requestId && matchesExerciseBootstrapIdentity(reply, request);
}

function getSameOriginTop(currentWindow: Window): Window | null {
  const topWindow = currentWindow.top;
  if (!topWindow || topWindow === currentWindow) return null;
  try {
    return topWindow.location.origin === currentWindow.location.origin ? topWindow : null;
  } catch {
    return null;
  }
}

function hasBootstrapCapability(target: Window): boolean {
  try {
    return (
      (target as BootstrapCapableWindow)[CAPABILITY_KEY]?.version === EXERCISE_BOOTSTRAP_VERSION
    );
  } catch {
    return false;
  }
}

function createRequest(identity: ExerciseBootstrapIdentity): ExerciseBootstrapRequest {
  requestSequence += 1;
  return {
    type: REQUEST_TYPE,
    version: EXERCISE_BOOTSTRAP_VERSION,
    requestId: `${Date.now().toString(36)}-${requestSequence.toString(36)}`,
    ...identity,
  };
}

function createReply<T extends ExerciseBootstrapReply['type']>(
  request: ExerciseBootstrapRequest,
  type: T,
): ExerciseBootstrapMessageBase & ExerciseBootstrapIdentity & { type: T } {
  const base: ExerciseBootstrapMessageBase & { type: T } = {
    type,
    version: EXERCISE_BOOTSTRAP_VERSION,
    requestId: request.requestId,
  };
  return request.channel === 'courseware-next'
    ? {
        ...base,
        channel: request.channel,
        unitId: request.unitId,
        exerciseId: request.exerciseId,
      }
    : {
        ...base,
        channel: request.channel,
        businessContentUuid: request.businessContentUuid,
      };
}

export function requestExerciseBootstrapData(
  identity: ExerciseBootstrapIdentity,
  currentWindow: Window = window,
): Promise<ExerciseBootstrapData | null> {
  const topWindow = getSameOriginTop(currentWindow);
  if (!topWindow || !hasBootstrapCapability(topWindow)) return Promise.resolve(null);

  const request = createRequest(identity);
  return new Promise((resolve) => {
    let settled = false;
    const timeoutId = currentWindow.setTimeout(
      () => settle(null),
      EXERCISE_BOOTSTRAP_HANDSHAKE_TIMEOUT_MS,
    );

    function cleanup() {
      currentWindow.clearTimeout(timeoutId);
      currentWindow.removeEventListener('message', handleMessage);
    }

    function settle(data: ExerciseBootstrapData | null) {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(data);
    }

    function handleMessage(event: MessageEvent) {
      if (event.source !== topWindow || event.origin !== currentWindow.location.origin) return;
      if (!isExerciseBootstrapReply(event.data) || !matchesRequest(event.data, request)) return;

      if (event.data.type === RESPONSE_TYPE && event.data.state === 'pending') {
        currentWindow.clearTimeout(timeoutId);
        return;
      }
      if (event.data.type === RESPONSE_TYPE) {
        settle(event.data.data);
        return;
      }
      if (event.data.type === ERROR_TYPE) {
        console.warn('[exercise-bootstrap] top data unavailable:', event.data.message);
      }
      settle(null);
    }

    currentWindow.addEventListener('message', handleMessage);
    try {
      topWindow.postMessage(request, currentWindow.location.origin);
    } catch {
      settle(null);
    }
  });
}

export function notifyExerciseContentReady(
  identity: ExerciseBootstrapIdentity,
  currentWindow: Window = window,
): boolean {
  const topWindow = getSameOriginTop(currentWindow);
  if (!topWindow || !hasBootstrapCapability(topWindow)) return false;

  try {
    topWindow.postMessage(
      {
        type: CONTENT_READY_TYPE,
        version: EXERCISE_BOOTSTRAP_VERSION,
        ...identity,
      } satisfies ExerciseContentReadyMessage,
      currentWindow.location.origin,
    );
    return true;
  } catch {
    return false;
  }
}

function getWindowSource(event: MessageEvent, currentWindow: Window): Window | null {
  if (!event.source || event.source === currentWindow) return null;
  const source = event.source as Window;
  try {
    return typeof source.postMessage === 'function' && 'closed' in source ? source : null;
  } catch {
    return null;
  }
}

function postReply(target: Window, origin: string, reply: ExerciseBootstrapReply): boolean {
  try {
    if (target.closed) return false;
    target.postMessage(reply, origin);
    return true;
  } catch {
    return false;
  }
}

export function listenForExerciseBootstrapRequests(
  resolveData: ExerciseBootstrapResolver,
  currentWindow: Window = window,
): () => void {
  const capableWindow = currentWindow as BootstrapCapableWindow;
  if (capableWindow[CAPABILITY_KEY]) {
    throw new Error('exercise bootstrap responder is already registered');
  }
  const capability = { version: EXERCISE_BOOTSTRAP_VERSION } as const;
  async function handleMessage(event: MessageEvent) {
    if (event.origin !== currentWindow.location.origin) return;
    if (!isExerciseBootstrapRequest(event.data)) return;
    const source = getWindowSource(event, currentWindow);
    if (!source) return;

    if (
      !postReply(source, event.origin, {
        ...createReply(event.data, RESPONSE_TYPE),
        state: 'pending',
      })
    ) {
      return;
    }

    try {
      const data = await resolveData(event.data, { origin: event.origin, source });
      postReply(
        source,
        event.origin,
        data
          ? { ...createReply(event.data, RESPONSE_TYPE), state: 'ready', data }
          : createReply(event.data, MISS_TYPE),
      );
    } catch (error) {
      postReply(source, event.origin, {
        ...createReply(event.data, ERROR_TYPE),
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  capableWindow[CAPABILITY_KEY] = capability;
  currentWindow.addEventListener('message', handleMessage);
  return () => {
    currentWindow.removeEventListener('message', handleMessage);
    if (capableWindow[CAPABILITY_KEY] === capability) delete capableWindow[CAPABILITY_KEY];
  };
}

export function listenForExerciseContentReady(
  listener: ExerciseContentReadyListener,
  currentWindow: Window = window,
): () => void {
  function handleMessage(event: MessageEvent) {
    if (event.origin !== currentWindow.location.origin) return;
    if (!isExerciseContentReadyMessage(event.data)) return;
    const source = getWindowSource(event, currentWindow);
    if (!source) return;
    listener(event.data, { origin: event.origin, source });
  }

  currentWindow.addEventListener('message', handleMessage);
  return () => currentWindow.removeEventListener('message', handleMessage);
}
