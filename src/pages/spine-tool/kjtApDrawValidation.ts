import type {
  SpineSlotAttachmentInfo,
  SpineSlotRegionDescriptor,
} from '@/shared/components/spine-player/spine-slot-preview';

type KjtApDrawSlotContractInfo = SpineSlotAttachmentInfo | SpineSlotRegionDescriptor;

export type KjtApDrawSlotKey = 'draw' | 'draw2' | 'draw3';

export interface KjtApDrawValidationInput {
  animationNames: readonly string[];
  slotDescriptors: Partial<Record<KjtApDrawSlotKey, KjtApDrawSlotContractInfo>>;
  previewableSlots: readonly KjtApDrawSlotKey[];
  maskReadySlots: readonly KjtApDrawSlotKey[];
}

export interface KjtApDrawValidationCheck {
  key:
    | 'animations'
    | 'slots'
    | 'slot-attachments'
    | 'preview-draw2'
    | 'preview-draw3'
    | 'mask-draw';
  label: string;
  pass: boolean;
  reason: string;
}

export interface KjtApDrawValidationReport {
  pass: boolean;
  summary: '符合 KJT_AP_DRAW_v2 模板要求' | '不符合 KJT_AP_DRAW_v2 模板要求';
  checks: KjtApDrawValidationCheck[];
}

const REQUIRED_ANIMATIONS = ['start', 'animation', 'end'] as const;
const REQUIRED_SLOTS = ['draw', 'draw2', 'draw3'] as const;

function collectMissingAnimations(animationNames: readonly string[]) {
  return REQUIRED_ANIMATIONS.filter((name) => !animationNames.includes(name));
}

function collectMissingSlots(slotDescriptors: KjtApDrawValidationInput['slotDescriptors']) {
  return REQUIRED_SLOTS.filter((slotName) => !slotDescriptors[slotName]);
}

function collectNonRegionSlots(slotDescriptors: KjtApDrawValidationInput['slotDescriptors']) {
  return REQUIRED_SLOTS.filter((slotName) => {
    const descriptor = slotDescriptors[slotName];

    return descriptor ? descriptor.attachmentType !== 'region' : false;
  });
}

function buildSlotAttachmentReason(nonRegionSlots: readonly KjtApDrawSlotKey[]) {
  return nonRegionSlots.length === 0
    ? ''
    : `以下 slot 缺少默认 region attachment: ${nonRegionSlots.join(', ')}`;
}

function buildListReason(prefix: string, values: readonly string[]) {
  return values.length === 0 ? '' : `${prefix}${values.join(', ')}`;
}

function buildPreviewCheck(
  slotName: Extract<KjtApDrawSlotKey, 'draw2' | 'draw3'>,
  previewableSlots: readonly KjtApDrawSlotKey[],
): KjtApDrawValidationCheck {
  const pass = previewableSlots.includes(slotName);

  return {
    key: `preview-${slotName}`,
    label: `${slotName} 可生成缩略图预览`,
    pass,
    reason: pass ? '' : `${slotName} 未生成缩略图预览`,
  };
}

export function buildKjtApDrawValidationReport(
  input: KjtApDrawValidationInput,
): KjtApDrawValidationReport {
  const missingAnimations = collectMissingAnimations(input.animationNames);
  const missingSlots = collectMissingSlots(input.slotDescriptors);
  const nonRegionSlots = collectNonRegionSlots(input.slotDescriptors);
  const drawMaskReady = input.maskReadySlots.includes('draw');

  const checks: KjtApDrawValidationCheck[] = [
    {
      key: 'animations',
      label: '包含 start、animation、end 动画',
      pass: missingAnimations.length === 0,
      reason: buildListReason('缺少动画: ', missingAnimations),
    },
    {
      key: 'slots',
      label: '包含 draw、draw2、draw3 三个 slot',
      pass: missingSlots.length === 0,
      reason: buildListReason('缺少 slot: ', missingSlots),
    },
    {
      key: 'slot-attachments',
      label: 'draw、draw2、draw3 默认 attachment 都是 region',
      pass: nonRegionSlots.length === 0,
      reason: buildSlotAttachmentReason(nonRegionSlots),
    },
    buildPreviewCheck('draw2', input.previewableSlots),
    buildPreviewCheck('draw3', input.previewableSlots),
    {
      key: 'mask-draw',
      label: 'draw 可生成 mask 位图与偏移',
      pass: drawMaskReady,
      reason: drawMaskReady ? '' : 'draw 未生成 mask 位图与偏移',
    },
  ];

  const pass = checks.every((check) => check.pass);

  return {
    pass,
    summary: pass ? '符合 KJT_AP_DRAW_v2 模板要求' : '不符合 KJT_AP_DRAW_v2 模板要求',
    checks,
  };
}
