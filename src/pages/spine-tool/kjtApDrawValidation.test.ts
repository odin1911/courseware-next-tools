import { describe, expect, it } from 'vitest';

import {
  buildKjtApDrawValidationReport,
  type KjtApDrawValidationInput,
} from './kjtApDrawValidation';

const baseSlotDescriptor = {
  imageName: 'rebuilt_spine.png',
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  origWidth: 10,
  origHeight: 10,
  rotate: false,
} as const;

describe('buildKjtApDrawValidationReport', () => {
  it('当 6 项模板契约全部满足时返回通过报告', () => {
    const report = buildKjtApDrawValidationReport({
      animationNames: ['start', 'animation', 'end'],
      slotDescriptors: {
        draw: {
          name: 'draw',
          slotName: 'draw',
          attachmentName: 'draw',
          attachmentType: 'region',
          attachmentPath: 'draw',
          regionName: 'draw',
          offsetX: 1,
          offsetY: 2,
          ...baseSlotDescriptor,
        },
        draw2: {
          name: 'draw2',
          slotName: 'draw2',
          attachmentName: 'draw2',
          attachmentType: 'region',
          attachmentPath: 'draw2',
          regionName: 'draw2',
          offsetX: 0,
          offsetY: 0,
          ...baseSlotDescriptor,
        },
        draw3: {
          name: 'draw3',
          slotName: 'draw3',
          attachmentName: 'draw3',
          attachmentType: 'region',
          attachmentPath: 'draw3',
          regionName: 'draw3',
          offsetX: 0,
          offsetY: 0,
          ...baseSlotDescriptor,
        },
      },
      previewableSlots: ['draw2', 'draw3'],
      maskReadySlots: ['draw'],
    });

    expect(report.pass).toBe(true);
    expect(report.summary).toBe('符合 KJT_AP_DRAW_v2 模板要求');
    expect(report.checks).toHaveLength(6);
    expect(report.checks.every((item) => item.pass)).toBe(true);
    expect(report.checks.map((item) => item.key)).toEqual([
      'animations',
      'slots',
      'slot-attachments',
      'preview-draw2',
      'preview-draw3',
      'mask-draw',
    ]);
  });

  it('缺少 draw3 预览时返回失败并给出稳定原因', () => {
    const report = buildKjtApDrawValidationReport({
      animationNames: ['start', 'animation', 'end'],
      slotDescriptors: {
        draw: {
          name: 'draw',
          slotName: 'draw',
          attachmentName: 'draw',
          attachmentType: 'region',
          attachmentPath: 'draw',
          regionName: 'draw',
          offsetX: 1,
          offsetY: 2,
          ...baseSlotDescriptor,
        },
        draw2: {
          name: 'draw2',
          slotName: 'draw2',
          attachmentName: 'draw2',
          attachmentType: 'region',
          attachmentPath: 'draw2',
          regionName: 'draw2',
          offsetX: 0,
          offsetY: 0,
          ...baseSlotDescriptor,
        },
        draw3: {
          name: 'draw3',
          slotName: 'draw3',
          attachmentName: 'draw3',
          attachmentType: 'region',
          attachmentPath: 'draw3',
          regionName: 'draw3',
          offsetX: 0,
          offsetY: 0,
          ...baseSlotDescriptor,
        },
      },
      previewableSlots: ['draw2'],
      maskReadySlots: ['draw'],
    });

    expect(report.pass).toBe(false);
    expect(report.summary).toBe('不符合 KJT_AP_DRAW_v2 模板要求');
    expect(report.checks).toHaveLength(6);
    expect(report.checks.find((item) => item.key === 'preview-draw3')).toEqual({
      key: 'preview-draw3',
      label: 'draw3 可生成缩略图预览',
      pass: false,
      reason: 'draw3 未生成缩略图预览',
    });
    expect(report.checks.filter((item) => !item.pass).map((item) => item.key)).toEqual([
      'preview-draw3',
    ]);
  });

  it('缺少 slot 时只报告 slots 失败，不额外报告 slot-attachments 失败', () => {
    const report = buildKjtApDrawValidationReport({
      animationNames: ['start', 'animation', 'end'],
      slotDescriptors: {
        draw: {
          name: 'draw',
          slotName: 'draw',
          attachmentName: 'draw',
          attachmentType: 'region',
          attachmentPath: 'draw',
          regionName: 'draw',
          offsetX: 1,
          offsetY: 2,
          ...baseSlotDescriptor,
        },
        draw2: {
          name: 'draw2',
          slotName: 'draw2',
          attachmentName: 'draw2',
          attachmentType: 'region',
          attachmentPath: 'draw2',
          regionName: 'draw2',
          offsetX: 0,
          offsetY: 0,
          ...baseSlotDescriptor,
        },
      },
      previewableSlots: ['draw2'],
      maskReadySlots: ['draw'],
    });

    expect(report.pass).toBe(false);
    expect(report.checks.find((item) => item.key === 'slots')).toEqual({
      key: 'slots',
      label: '包含 draw、draw2、draw3 三个 slot',
      pass: false,
      reason: '缺少 slot: draw3',
    });
    expect(report.checks.find((item) => item.key === 'slot-attachments')).toEqual({
      key: 'slot-attachments',
      label: 'draw、draw2、draw3 默认 attachment 都是 region',
      pass: true,
      reason: '',
    });
    expect(report.checks.filter((item) => !item.pass).map((item) => item.key)).toEqual([
      'slots',
      'preview-draw3',
    ]);
  });

  it('slot 存在但默认 attachment 不是 region 时单独报告 slot-attachments 失败', () => {
    const report = buildKjtApDrawValidationReport({
      animationNames: ['start', 'animation', 'end'],
      slotDescriptors: {
        draw: {
          name: 'draw',
          slotName: 'draw',
          attachmentName: 'draw',
          attachmentType: 'mesh',
          attachmentPath: 'draw',
          regionName: 'draw',
          offsetX: 1,
          offsetY: 2,
          ...baseSlotDescriptor,
        },
        draw2: {
          name: 'draw2',
          slotName: 'draw2',
          attachmentName: 'draw2',
          attachmentType: 'region',
          attachmentPath: 'draw2',
          regionName: 'draw2',
          offsetX: 0,
          offsetY: 0,
          ...baseSlotDescriptor,
        },
        draw3: {
          name: 'draw3',
          slotName: 'draw3',
          attachmentName: 'draw3',
          attachmentType: 'region',
          attachmentPath: 'draw3',
          regionName: 'draw3',
          offsetX: 0,
          offsetY: 0,
          ...baseSlotDescriptor,
        },
      },
      previewableSlots: ['draw2', 'draw3'],
      maskReadySlots: ['draw'],
    });

    expect(report.pass).toBe(false);
    expect(report.checks.find((item) => item.key === 'slot-attachments')).toEqual({
      key: 'slot-attachments',
      label: 'draw、draw2、draw3 默认 attachment 都是 region',
      pass: false,
      reason: '以下 slot 缺少默认 region attachment: draw',
    });
    expect(report.checks.filter((item) => !item.pass).map((item) => item.key)).toEqual([
      'slot-attachments',
    ]);
  });

  it('只有 attachment 信息时也能把非 region slot 归因到 slot-attachments', () => {
    const slotDescriptors = {
      draw: {
        slotName: 'draw',
        attachmentName: 'draw',
        attachmentType: 'mesh',
        attachmentPath: 'draw',
      },
      draw2: {
        slotName: 'draw2',
        attachmentName: 'draw2',
        attachmentType: 'region',
        attachmentPath: 'draw2',
      },
      draw3: {
        slotName: 'draw3',
        attachmentName: 'draw3',
        attachmentType: 'region',
        attachmentPath: 'draw3',
      },
    } satisfies KjtApDrawValidationInput['slotDescriptors'];

    const report = buildKjtApDrawValidationReport({
      animationNames: ['start', 'animation', 'end'],
      slotDescriptors,
      previewableSlots: ['draw2', 'draw3'],
      maskReadySlots: [],
    });

    expect(report.pass).toBe(false);
    expect(report.checks.find((item) => item.key === 'slots')).toEqual({
      key: 'slots',
      label: '包含 draw、draw2、draw3 三个 slot',
      pass: true,
      reason: '',
    });
    expect(report.checks.find((item) => item.key === 'slot-attachments')).toEqual({
      key: 'slot-attachments',
      label: 'draw、draw2、draw3 默认 attachment 都是 region',
      pass: false,
      reason: '以下 slot 缺少默认 region attachment: draw',
    });
  });
});
