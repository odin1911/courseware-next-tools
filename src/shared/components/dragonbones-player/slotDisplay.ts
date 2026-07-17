import type { DragonBonesHandle } from './DragonBonesPlayer';

/** Pixi 版 DragonBones slot 替换逻辑需要的最小 slot 结构。 */
export type DragonBonesSlotLike = {
  display: unknown;
  displayIndex?: number;
  displayList?: unknown[];
  rawDisplay?: unknown;
};

type DragonBonesArmatureLike = {
  getSlot?: (name: string) => DragonBonesSlotLike | null;
};

/** 替换 slot display 时传给 display 工厂函数的上下文。 */
export type DragonBonesSlotDisplayContext = {
  /** 从当前 armature 中解析出的目标 slot。 */
  slot: DragonBonesSlotLike;
  /** 当前激活的 slot display 索引；动画时间轴可能通过该索引隐藏或切换显示对象。 */
  displayIndex: number;
  /** displayIndex 对应的原显示对象；缺失时回退到 slot.display / rawDisplay。 */
  sourceDisplay: unknown;
};

/** replaceDragonBonesSlotDisplay 返回、restoreDragonBonesSlotDisplay 消费的替换句柄。 */
export type DragonBonesSlotDisplayHandle<TDisplay> = {
  slot: DragonBonesSlotLike;
  previousDisplay: unknown;
  previousDisplayList?: unknown[];
  display: TDisplay;
};

function getSlotReplacementIndex(slot: DragonBonesSlotLike) {
  return typeof slot.displayIndex === 'number' && slot.displayIndex >= 0 ? slot.displayIndex : 0;
}

/**
 * 通过 displayList 替换 DragonBones slot 的显示对象，并立即渲染当前帧。
 *
 * DragonBones 动画可通过 displayIndex 切换 slot 显示对象。当当前动画帧指向
 * displayList 中的某一项时，只写 slot.display 不够可靠，后续时间轴更新可能把旧显示对象
 * 切回来。因此这里替换当前激活的 displayList 项，并保留旧列表用于恢复。
 *
 * createDisplay 会收到 sourceDisplay，调用方可先复制原 texture / 背景，再添加模板自己的
 * Pixi 子节点。
 */
export function replaceDragonBonesSlotDisplay<TDisplay>(
  player: DragonBonesHandle | null,
  slotName: string,
  createDisplay: (context: DragonBonesSlotDisplayContext) => TDisplay,
) {
  const armature = player?.getArmature() as DragonBonesArmatureLike | null;
  const slot = armature?.getSlot?.(slotName) ?? null;
  if (!slot) {
    return null;
  }

  const previousDisplayList = Array.isArray(slot.displayList)
    ? slot.displayList.slice()
    : undefined;
  const displayIndex = getSlotReplacementIndex(slot);
  const sourceDisplay =
    previousDisplayList?.[displayIndex] ?? slot.display ?? slot.rawDisplay ?? null;
  const display = createDisplay({ slot, displayIndex, sourceDisplay });
  const nextDisplayList = previousDisplayList ? previousDisplayList.slice() : [];

  while (nextDisplayList.length <= displayIndex) {
    nextDisplayList.push(null);
  }

  const previousDisplay = slot.display;
  nextDisplayList[displayIndex] = display;
  slot.displayList = nextDisplayList;
  player?.renderCurrentFrame();

  return {
    slot,
    previousDisplay,
    previousDisplayList,
    display,
  } satisfies DragonBonesSlotDisplayHandle<TDisplay>;
}

/**
 * 恢复由 replaceDragonBonesSlotDisplay 替换过的 slot 显示对象。
 *
 * 应在销毁调用方持有的 Pixi 子节点前，或组件卸载时调用。该 helper 只负责恢复
 * DragonBones slot 引用；自定义显示对象的事件解绑、texture 销毁等清理仍由调用方负责。
 */
export function restoreDragonBonesSlotDisplay<TDisplay>(
  handle: DragonBonesSlotDisplayHandle<TDisplay> | null,
) {
  if (!handle) {
    return;
  }

  if (handle.previousDisplayList) {
    handle.slot.displayList = handle.previousDisplayList;
    return;
  }

  if (handle.slot.display === handle.display) {
    handle.slot.display = handle.previousDisplay;
  }
}
