function resolveSlotName(slot: unknown) {
  return ((slot as { data?: { name?: string } })?.data?.name ?? '') as string;
}

function clearSlotAttachment(slot: unknown) {
  const candidate = slot as {
    setAttachment?: (attachment: unknown) => void;
    attachment?: unknown;
  };

  if (typeof candidate.setAttachment === 'function') {
    candidate.setAttachment(null);
    return;
  }

  if ('attachment' in candidate) {
    candidate.attachment = null;
  }
}

export function hideSkeletonSlots(skeleton: unknown, hiddenSlotNames: readonly string[]) {
  if (!hiddenSlotNames.length) {
    return;
  }

  const hiddenNameSet = new Set(hiddenSlotNames.filter(Boolean));
  const slots = ((skeleton as { slots?: unknown[] })?.slots ?? []) as unknown[];

  slots.forEach((slot) => {
    if (!hiddenNameSet.has(resolveSlotName(slot))) {
      return;
    }

    clearSlotAttachment(slot);
  });
}
