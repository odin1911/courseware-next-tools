import {
  mergeSpineRects,
  resolveSpineRectDrawRect,
  resolveSpineViewportTransform,
} from './spineLayout';
import type {
  SpineAnimationState,
  SpineChildRectRequest,
  SpineChildRectResult,
  SpineFitMode,
  SpineGlobal,
  SpineRawBone,
  SpineRawData,
  SpineRect,
  SpineSkeleton,
  SpineSkeletonData,
} from './spineTypes';

const SPINE_CHILD_RECT_SAMPLE_FPS = 24;

function getChildShortName(name: string) {
  const segments = name.split('/');
  return segments[segments.length - 1] || name;
}

function buildRawBoneChildrenMap(bones: SpineRawBone[]) {
  const childrenMap = new Map<string, string[]>();

  bones.forEach((bone) => {
    if (!bone.parent) {
      return;
    }

    const siblings = childrenMap.get(bone.parent) ?? [];
    siblings.push(bone.name);
    childrenMap.set(bone.parent, siblings);
  });

  return childrenMap;
}

function collectDescendantBoneNames(rootName: string, childrenMap: Map<string, string[]>) {
  const result = new Set<string>();
  const queue = [rootName];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current || result.has(current)) {
      continue;
    }

    result.add(current);
    (childrenMap.get(current) ?? []).forEach((childName) => {
      if (!result.has(childName)) {
        queue.push(childName);
      }
    });
  }

  return result;
}

export function resolveRequestedChildBoneName(bones: SpineRawBone[], childName: string) {
  const exactMatch = bones.find((bone) => bone.name === childName);

  if (exactMatch) {
    return exactMatch.name;
  }

  const shortMatches = bones.filter((bone) => getChildShortName(bone.name) === childName);

  if (shortMatches.length === 1) {
    return shortMatches[0]?.name ?? '';
  }

  return '';
}

function collectAnimationKeyTimes(value: unknown, result: number[]) {
  if (!value) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (item && typeof item === 'object' && Number.isFinite((item as { time?: number }).time)) {
        result.push(Number((item as { time?: number }).time));
      }

      collectAnimationKeyTimes(item, result);
    });
    return;
  }

  if (typeof value === 'object') {
    Object.values(value).forEach((child) => {
      collectAnimationKeyTimes(child, result);
    });
  }
}

export function createAnimationSampleTimes(animation: unknown) {
  const keyTimes: number[] = [];
  collectAnimationKeyTimes(animation, keyTimes);

  const duration = keyTimes.length > 0 ? Math.max(...keyTimes) : 0;
  const times = new Set<number>([0]);

  keyTimes.forEach((time) => {
    if (Number.isFinite(time) && time >= 0) {
      times.add(Number(time.toFixed(4)));
    }
  });

  if (duration > 0) {
    const step = 1 / SPINE_CHILD_RECT_SAMPLE_FPS;

    for (let time = 0; time <= duration; time += step) {
      times.add(Number(Math.min(time, duration).toFixed(4)));
    }

    times.add(Number(duration.toFixed(4)));
  }

  return Array.from(times).sort((left, right) => left - right);
}

function resolveSlotBoneName(slot: unknown) {
  const typedSlot = slot as {
    bone?: { data?: { name?: string }; name?: string };
    data?: { boneData?: { name?: string } };
  };

  return typedSlot.bone?.data?.name ?? typedSlot.data?.boneData?.name ?? typedSlot.bone?.name ?? '';
}

function resolveSlotName(slot: unknown) {
  const typedSlot = slot as {
    data?: { name?: string };
    name?: string;
  };

  return typedSlot.data?.name ?? typedSlot.name ?? '';
}

function resolveSlotAttachment(slot: unknown) {
  const typedSlot = slot as {
    getAttachment?: () => unknown;
    attachment?: unknown;
  };

  if (typeof typedSlot.getAttachment === 'function') {
    return typedSlot.getAttachment();
  }

  return typedSlot.attachment ?? null;
}

function resolveVerticesRect(vertices: ArrayLike<number>) {
  if (vertices.length < 4) {
    return null;
  }

  const xs: number[] = [];
  const ys: number[] = [];

  for (let index = 0; index + 1 < vertices.length; index += 2) {
    const x = Number(vertices[index]);
    const y = Number(vertices[index + 1]);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue;
    }

    xs.push(x);
    ys.push(y);
  }

  if (xs.length === 0 || ys.length === 0) {
    return null;
  }

  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  } satisfies SpineRect;
}

function resolveAttachmentWorldRect(slot: unknown, attachment: unknown) {
  if (!attachment || typeof attachment !== 'object') {
    return null;
  }

  const typedAttachment = attachment as {
    worldVerticesLength?: number;
    computeWorldVertices?: (...args: unknown[]) => void;
  };

  if (typeof typedAttachment.computeWorldVertices !== 'function') {
    return null;
  }

  const verticesLength =
    typeof typedAttachment.worldVerticesLength === 'number' &&
    typedAttachment.worldVerticesLength > 0
      ? typedAttachment.worldVerticesLength
      : 8;

  const bone = (slot as { bone?: unknown }).bone ?? slot;
  const regionVertices = new Float32Array(8);

  try {
    typedAttachment.computeWorldVertices(bone, regionVertices, 0, 2);
    const regionRect = resolveVerticesRect(regionVertices);

    if (regionRect) {
      return regionRect;
    }
  } catch {
    // Fall through to the mesh-style signature used by VertexAttachment.
  }

  if (
    typeof typedAttachment.worldVerticesLength !== 'number' ||
    typedAttachment.worldVerticesLength <= 0
  ) {
    return null;
  }

  const vertices = new Float32Array(verticesLength);

  try {
    typedAttachment.computeWorldVertices(
      slot,
      0,
      typedAttachment.worldVerticesLength,
      vertices,
      0,
      2,
    );
  } catch {
    return null;
  }

  return resolveVerticesRect(vertices);
}

export function resolveSlotRectFromSkeleton({
  skeleton,
  slotName,
  viewWidth,
  viewHeight,
  contentBounds,
  fitRatio,
  fitMode = 'stage',
  flipY,
  worldRectSpace = 'skeleton',
}: {
  skeleton: unknown;
  slotName: string;
  viewWidth: number;
  viewHeight: number;
  contentBounds: SpineRect | null;
  fitRatio: number;
  fitMode?: SpineFitMode;
  flipY: boolean;
  worldRectSpace?: 'skeleton' | 'viewport';
}) {
  const transform =
    worldRectSpace === 'viewport'
      ? null
      : resolveSpineViewportTransform({
          viewWidth,
          viewHeight,
          contentBounds,
          fitRatio,
          fitMode,
        });

  if ((worldRectSpace !== 'viewport' && !transform) || !slotName) {
    return null;
  }

  const slot = ((skeleton as { slots?: unknown[] }).slots ?? []).find(
    (item) => resolveSlotName(item) === slotName,
  );

  if (!slot) {
    return null;
  }

  const worldRect = resolveAttachmentWorldRect(slot, resolveSlotAttachment(slot));
  const screenRect = worldRect
    ? worldRectSpace === 'viewport'
      ? {
          x: worldRect.x + viewWidth / 2,
          y: flipY ? worldRect.y + viewHeight / 2 : viewHeight / 2 - worldRect.y - worldRect.height,
          width: worldRect.width,
          height: worldRect.height,
        }
      : (() => {
          const drawRect = resolveSpineRectDrawRect(worldRect, transform);

          return drawRect
            ? {
                x: drawRect.x + viewWidth / 2,
                y: flipY
                  ? drawRect.y + viewHeight / 2
                  : viewHeight / 2 - drawRect.y - drawRect.height,
                width: drawRect.width,
                height: drawRect.height,
              }
            : null;
        })()
    : null;

  if (!worldRect || !screenRect) {
    return null;
  }

  return {
    slotName,
    worldRect,
    screenRect,
  };
}

function resolveChildWorldRectFromSkeleton(skeleton: unknown, allowedBoneNames: Set<string>) {
  const slots = (skeleton as { slots?: unknown[] }).slots ?? [];
  const slotRects = slots
    .filter((slot) => allowedBoneNames.has(resolveSlotBoneName(slot)))
    .map((slot) => resolveAttachmentWorldRect(slot, resolveSlotAttachment(slot)))
    .filter((rect): rect is SpineRect => Boolean(rect));

  return mergeSpineRects(slotRects);
}

function resolveScratchChildWorldRectAtTime({
  spineLib,
  skeletonData,
  allowedBoneNames,
  animationName,
  time,
}: {
  spineLib: SpineGlobal;
  skeletonData: SpineSkeletonData;
  allowedBoneNames: Set<string>;
  animationName: string;
  time: number;
}) {
  const scratchSkeleton = new spineLib.Skeleton(skeletonData);
  const scratchState = new spineLib.AnimationState(new spineLib.AnimationStateData(skeletonData));

  scratchSkeleton.setToSetupPose();

  if (animationName) {
    scratchState.setAnimation(0, animationName, false);
    scratchState.update(Math.max(0, time));
    scratchState.apply(scratchSkeleton);
  }

  scratchSkeleton.updateWorldTransform();
  return resolveChildWorldRectFromSkeleton(scratchSkeleton, allowedBoneNames);
}

export function resolveChildRectsFromRequests({
  spineLib,
  skeletonData,
  rawData,
  requests,
  viewWidth,
  viewHeight,
  contentBounds,
  fitRatio,
  fitMode = 'stage',
  flipY,
}: {
  spineLib: SpineGlobal;
  skeletonData: SpineSkeletonData;
  rawData: SpineRawData | null;
  requests: SpineChildRectRequest[];
  viewWidth: number;
  viewHeight: number;
  contentBounds: SpineRect | null;
  fitRatio: number;
  fitMode?: SpineFitMode;
  flipY: boolean;
}) {
  const bones = rawData?.bones ?? [];
  const animations = rawData?.animations ?? {};
  const transform = resolveSpineViewportTransform({
    viewWidth,
    viewHeight,
    contentBounds,
    fitRatio,
    fitMode,
  });

  if (!transform || bones.length === 0) {
    return [];
  }

  const childrenMap = buildRawBoneChildrenMap(bones);

  return requests
    .map((request) => {
      const animationNames = Array.from(
        new Set(
          request.animationNames.filter((name) => typeof name === 'string' && name.length > 0),
        ),
      );
      const childBoneName = resolveRequestedChildBoneName(bones, request.childName);

      if (!childBoneName) {
        return null;
      }

      const allowedBoneNames = collectDescendantBoneNames(childBoneName, childrenMap);
      const sampledRects = animationNames
        .flatMap((animationName) => {
          const sampleTimes = createAnimationSampleTimes(animations[animationName]);

          return sampleTimes
            .map((time) =>
              resolveScratchChildWorldRectAtTime({
                spineLib,
                skeletonData,
                allowedBoneNames,
                animationName,
                time,
              }),
            )
            .filter((rect): rect is SpineRect => Boolean(rect));
        })
        .filter((rect): rect is SpineRect => Boolean(rect));
      const worldRect = mergeSpineRects(sampledRects);
      const drawRect = resolveSpineRectDrawRect(worldRect, transform);
      const screenRect = drawRect
        ? {
            x: drawRect.x + viewWidth / 2,
            y: flipY ? drawRect.y + viewHeight / 2 : viewHeight / 2 - drawRect.y - drawRect.height,
            width: drawRect.width,
            height: drawRect.height,
          }
        : null;

      if (!worldRect || !screenRect) {
        return null;
      }

      return {
        childName: request.childName,
        animationNames,
        worldRect,
        screenRect,
      } satisfies SpineChildRectResult;
    })
    .filter((result): result is SpineChildRectResult => Boolean(result));
}

export interface SpineChildPlayback {
  childName: string;
  animationName: string;
  loop: number;
  stopBackStart: boolean;
  playbackId: number;
}

export interface SpineChildPlaybackRuntime {
  animationName: string;
  childName: string;
  loop: number;
  stopBackStart: boolean;
  scratchSkeleton: SpineSkeleton;
  scratchState: SpineAnimationState;
  allowedBoneNames: Set<string>;
  duration: number;
  elapsed: number;
  completed: boolean;
  frozenTime: number;
}

function resolveAnimationDuration(animation: unknown) {
  const sampleTimes = createAnimationSampleTimes(animation);

  if (sampleTimes.length === 0) {
    return 0;
  }

  return Math.max(...sampleTimes);
}

function resolveSkeletonSlots(skeleton: unknown) {
  return (skeleton as { slots?: unknown[] }).slots ?? [];
}

function clearSlotAttachment(slot: unknown) {
  const typedSlot = slot as {
    setAttachment?: (attachment: unknown) => void;
    attachment?: unknown;
  };

  if (typeof typedSlot.setAttachment === 'function') {
    try {
      typedSlot.setAttachment(null);
      return;
    } catch {
      // ignore runtime-specific slot APIs and fall back to direct assignment below.
    }
  }

  if ('attachment' in typedSlot) {
    typedSlot.attachment = null;
  }
}

function hideSkeletonSlotsOutsideBones(skeleton: unknown, allowedBoneNames: Set<string>) {
  resolveSkeletonSlots(skeleton).forEach((slot) => {
    if (allowedBoneNames.has(resolveSlotBoneName(slot))) {
      return;
    }

    clearSlotAttachment(slot);
  });
}

function syncSkeletonDisplayTransform(source: SpineSkeleton, target: SpineSkeleton) {
  target.x = source.x;
  target.y = source.y;
  target.scaleX = source.scaleX;
  target.scaleY = source.scaleY;
}

export function createChildPlaybackRuntime({
  spineLib,
  skeletonData,
  rawData,
  playback,
}: {
  spineLib: SpineGlobal;
  skeletonData: SpineSkeletonData;
  rawData: SpineRawData | null;
  playback: SpineChildPlayback;
}) {
  const bones = rawData?.bones ?? [];
  const animations = rawData?.animations ?? {};
  const childBoneName = resolveRequestedChildBoneName(bones, playback.childName);

  if (!childBoneName) {
    return null;
  }

  const allowedBoneNames = collectDescendantBoneNames(
    childBoneName,
    buildRawBoneChildrenMap(bones),
  );

  return {
    animationName: playback.animationName,
    childName: playback.childName,
    loop: playback.loop,
    stopBackStart: playback.stopBackStart,
    scratchSkeleton: new spineLib.Skeleton(skeletonData),
    scratchState: new spineLib.AnimationState(new spineLib.AnimationStateData(skeletonData)),
    allowedBoneNames,
    duration: resolveAnimationDuration(animations[playback.animationName]),
    elapsed: 0,
    completed: false,
    frozenTime: 0,
  } satisfies SpineChildPlaybackRuntime;
}

function resolveChildPlaybackRenderTime(playback: SpineChildPlaybackRuntime, delta: number) {
  if (playback.loop === 0) {
    if (playback.duration > 0) {
      playback.elapsed = (playback.elapsed + delta) % playback.duration;
    } else {
      playback.elapsed += delta;
    }

    return playback.elapsed;
  }

  if (!playback.completed) {
    const nextElapsed =
      playback.duration > 0 ? Math.min(playback.elapsed + delta, playback.duration) : 0;

    playback.elapsed = nextElapsed;

    if (playback.duration <= 0 || nextElapsed >= playback.duration) {
      playback.completed = true;
      playback.frozenTime = playback.stopBackStart ? 0 : nextElapsed;
    }
  }

  return playback.completed ? playback.frozenTime : playback.elapsed;
}

export function applyChildPlaybackPose({
  playback,
  sourceSkeleton,
  delta,
}: {
  playback: SpineChildPlaybackRuntime;
  sourceSkeleton: SpineSkeleton;
  delta: number;
}) {
  const renderTime = resolveChildPlaybackRenderTime(playback, delta);

  playback.scratchSkeleton.setToSetupPose();
  playback.scratchState.setAnimation(0, playback.animationName, false);
  playback.scratchState.update(Math.max(0, renderTime));
  playback.scratchState.apply(playback.scratchSkeleton);
  syncSkeletonDisplayTransform(sourceSkeleton, playback.scratchSkeleton);
  playback.scratchSkeleton.updateWorldTransform();
  hideSkeletonSlotsOutsideBones(playback.scratchSkeleton, playback.allowedBoneNames);
}
