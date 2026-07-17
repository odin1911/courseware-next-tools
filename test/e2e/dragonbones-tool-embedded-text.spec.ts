import { expect, test, type Page } from '@playwright/test';

type RgbPredicate = {
  redMin?: number;
  redMax?: number;
  greenMin?: number;
  greenMax?: number;
  blueMin?: number;
  blueMax?: number;
  alphaMin?: number;
};

async function countPixels(page: Page, cardTestId: string, predicate: RgbPredicate) {
  return page.locator(`[data-testid="${cardTestId}"] canvas`).evaluate((canvas, nextPredicate) => {
    const source = canvas as HTMLCanvasElement;
    const context = source.getContext('2d', { willReadFrequently: true });

    if (!context) {
      return 0;
    }

    const { data } = context.getImageData(0, 0, source.width, source.height);
    let count = 0;

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const alpha = data[index + 3];

      if (
        red >= (nextPredicate.redMin ?? 0) &&
        red <= (nextPredicate.redMax ?? 255) &&
        green >= (nextPredicate.greenMin ?? 0) &&
        green <= (nextPredicate.greenMax ?? 255) &&
        blue >= (nextPredicate.blueMin ?? 0) &&
        blue <= (nextPredicate.blueMax ?? 255) &&
        alpha >= (nextPredicate.alphaMin ?? 0)
      ) {
        count += 1;
      }
    }

    return count;
  }, predicate);
}

async function countMagentaPixels(page: Page) {
  return countPixels(page, 'dragonbones-card-count2-farm', {
    redMin: 190,
    greenMax: 80,
    blueMin: 190,
    alphaMin: 120,
  });
}

async function countBluePixels(page: Page) {
  return countPixels(page, 'dragonbones-card-kj-qa-pp-bubble', {
    redMax: 80,
    greenMax: 120,
    blueMin: 180,
    alphaMin: 120,
  });
}

async function countBubbleMagentaPixels(page: Page) {
  return countPixels(page, 'dragonbones-card-kj-qa-pp-bubble', {
    redMin: 190,
    greenMax: 80,
    blueMin: 190,
    alphaMin: 120,
  });
}

test('dragonbones-tool injects editable text into the Pixi canvas', async ({ page }) => {
  await page.goto('/src/pages/dragonbones-tool/?mode=count2-farm');

  const card = page.getByTestId('dragonbones-card-count2-farm');
  await expect(card).toHaveAttribute('data-status', 'ready', { timeout: 20_000 });
  await expect(page.getByTestId('dragonbones-embedded-text-panel')).toBeVisible();
  await expect(page.getByTestId('dragonbones-embedded-text-target')).toContainText('骨架根层');

  const before = await countMagentaPixels(page);

  await page.getByTestId('dragonbones-embedded-text-input').fill('TEST');
  await page.getByTestId('dragonbones-embedded-text-color').fill('#ff00ff');
  await page.getByTestId('dragonbones-embedded-text-toggle').check();

  await expect
    .poll(() => countMagentaPixels(page), { timeout: 5_000 })
    .toBeGreaterThan(before + 40);
});

test('dragonbones-tool injects text into KJ_QA_PP_v2 bubble animation canvas', async ({ page }) => {
  await page.goto('/src/pages/dragonbones-tool/?mode=kj-qa-pp-bubble');

  const card = page.getByTestId('dragonbones-card-kj-qa-pp-bubble');
  await expect(card).toHaveAttribute('data-status', 'ready', { timeout: 20_000 });
  await expect(page.getByTestId('dragonbones-embedded-text-panel')).toHaveAttribute(
    'data-embedded-text-enabled',
    'true',
  );
  await expect(page.getByTestId('dragonbones-embedded-text-target')).toHaveValue('slot:text_area');
  await expect.poll(() => countBubbleMagentaPixels(page), { timeout: 5_000 }).toBeLessThan(20);

  const before = await countBluePixels(page);

  await page.getByTestId('dragonbones-embedded-text-input').fill('seeking');
  await page.getByTestId('dragonbones-embedded-text-color').fill('#0033ff');

  await expect.poll(() => countBluePixels(page), { timeout: 5_000 }).toBeGreaterThan(before + 30);
});
