import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const sampleZipPath = resolve('src/pages/dragonbones-tool/assets/skeleton.zip');

async function expectGeneratedFrames(page: import('@playwright/test').Page) {
  await expect
    .poll(async () => page.getByTestId('dragonbones-export-frame').count(), {
      timeout: 20000,
    })
    .toBeGreaterThan(0);

  await expect(page.getByText(/已生成 \d+ 张逐帧图片/)).toBeVisible();
}

test('dragonbones-tool frame export renders animation and generated PNG frames', async ({
  page,
}) => {
  await page.goto('/src/pages/dragonbones-tool/?feature=frame-export');

  await expect(page.getByTestId('dragonbones-frame-export-root')).toBeVisible();
  await expect(page.getByText('输出尺寸: 动画内容原始尺寸')).toBeVisible();
  await expect(page.getByText(/输出 \d+×\d+；内容/)).toBeVisible();

  await expectGeneratedFrames(page);
});

test('dragonbones-tool frame export accepts file picker and drag drop zip files', async ({
  page,
}) => {
  await page.goto('/src/pages/dragonbones-tool/?feature=frame-export');
  await expect(page.getByTestId('dragonbones-frame-export-root')).toBeVisible();

  await page.getByTestId('dragonbones-file-input').setInputFiles(sampleZipPath);
  await expect(page.getByTestId('dragonbones-source-label')).toHaveText('source: skeleton.zip');
  await expectGeneratedFrames(page);

  const fileBytes = Array.from(readFileSync(sampleZipPath));
  const dataTransfer = await page.evaluateHandle((bytes) => {
    const dataTransfer = new DataTransfer();
    const file = new File([new Uint8Array(bytes)], 'drag-skeleton.zip', {
      type: 'application/zip',
    });

    dataTransfer.items.add(file);
    return dataTransfer;
  }, fileBytes);

  const dropZone = page.getByTestId('dragonbones-drop-zone');
  await dropZone.dispatchEvent('dragenter', { dataTransfer });
  await dropZone.dispatchEvent('drop', { dataTransfer });

  await expect(page.getByTestId('dragonbones-source-label')).toHaveText(
    'source: drag-skeleton.zip',
  );
  await expectGeneratedFrames(page);
});
