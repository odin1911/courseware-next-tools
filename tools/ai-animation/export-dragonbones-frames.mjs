import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function createExportConfig(meta, profile) {
  if (!profile?.origin || !Number.isFinite(profile.origin.x) || !Number.isFinite(profile.origin.y)) {
    throw new Error(`${meta.asset} export profile is missing origin`);
  }

  const loopActions = new Set(profile.loopActions ?? []);

  return {
    asset: meta.asset,
    fps: meta.fps,
    canvas: meta.canvas,
    anchor: meta.anchor,
    actions: meta.actions.map(({ name, frameCount }) => ({
      name,
      frameCount,
      loop: loopActions.has(name),
    })),
  };
}

export function writeCapturedFrame(root, asset, action, zeroBasedFrame, dataUrl) {
  const prefix = 'data:image/png;base64,';
  if (!dataUrl.startsWith(prefix)) {
    throw new Error(`${asset}/${action} frame ${zeroBasedFrame} is not a PNG data URL`);
  }

  const directory = path.join(root, asset, action);
  const output = path.join(
    directory,
    `frame-${String(zeroBasedFrame + 1).padStart(4, '0')}.png`,
  );
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(output, Buffer.from(dataUrl.slice(prefix.length), 'base64'), {
    flag: 'wx',
  });
  return output;
}

export async function exportCapturedAssets({
  assets,
  profiles,
  framesRoot,
  configDir,
  loadAsset,
}) {
  if (fs.existsSync(framesRoot)) {
    throw new Error(`output already exists: ${framesRoot}`);
  }

  for (const asset of assets) {
    if (!profiles[asset]?.origin) {
      throw new Error(`${asset} export profile is missing origin`);
    }
  }

  const framesParent = path.dirname(framesRoot);
  fs.mkdirSync(framesParent, { recursive: true });
  const stagedFrames = fs.mkdtempSync(
    path.join(framesParent, `.${path.basename(framesRoot)}-`),
  );
  const stagedConfigs = fs.mkdtempSync(path.join(framesParent, '.animation-configs-'));

  try {
    for (const asset of [...assets].sort()) {
      const captured = await loadAsset(asset, profiles[asset]);
      const config = createExportConfig(captured.meta, profiles[asset]);

      for (const action of captured.meta.actions) {
        for (let frame = 0; frame < action.frameCount; frame += 1) {
          writeCapturedFrame(
            stagedFrames,
            captured.meta.asset,
            action.name,
            frame,
            await captured.capture(action.name, frame),
          );
        }
      }

      fs.writeFileSync(
        path.join(stagedConfigs, `${captured.meta.asset}.json`),
        `${JSON.stringify(config, null, 2)}\n`,
      );
    }

    fs.renameSync(stagedFrames, framesRoot);
    fs.mkdirSync(configDir, { recursive: true });
    for (const configName of fs.readdirSync(stagedConfigs).sort()) {
      fs.copyFileSync(
        path.join(stagedConfigs, configName),
        path.join(configDir, configName),
      );
    }
  } catch (error) {
    fs.rmSync(stagedFrames, { recursive: true, force: true });
    throw error;
  } finally {
    fs.rmSync(stagedConfigs, { recursive: true, force: true });
  }
}

async function runCli(framesRoot, configDir) {
  const [{ chromium }, { createServer }] = await Promise.all([
    import('@playwright/test'),
    import('vite'),
  ]);
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const repoRoot = path.resolve(scriptDir, '../..');
  const assetsDir = path.join(repoRoot, 'src/pages/animations/assets');
  const profiles = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'src/pages/animations/exportProfiles.json'), 'utf8'),
  );
  const assets = fs
    .readdirSync(assetsDir)
    .filter((name) => name.endsWith('.zip'))
    .sort();
  const server = await createServer({
    root: repoRoot,
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0 },
  });
  let browser;

  try {
    await server.listen();
    const address = server.httpServer?.address();
    if (!address || typeof address === 'string') {
      throw new Error('Vite did not expose a local TCP port');
    }
    const baseUrl = `http://127.0.0.1:${address.port}`;
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await exportCapturedAssets({
      assets,
      profiles,
      framesRoot: path.resolve(framesRoot),
      configDir: path.resolve(configDir),
      loadAsset: async (asset) => {
        const url = `${baseUrl}/src/pages/animations/index.html?export=${encodeURIComponent(asset)}`;
        await page.goto(url);
        await page.waitForFunction(
          () => window.__dragonBonesFrameExporter?.status !== 'loading',
          undefined,
          { timeout: 120_000 },
        );
        const state = await page.evaluate(() => window.__dragonBonesFrameExporter);

        if (state?.status !== 'ready' || !state.meta) {
          throw new Error(`${asset} export failed: ${state?.error ?? 'missing exporter metadata'}`);
        }

        return {
          meta: state.meta,
          capture: (action, frame) =>
            page.evaluate(
              ({ actionName, frameIndex }) => {
                const capture = window.__dragonBonesFrameExporter?.capture;
                if (!capture) throw new Error('frame capture is unavailable');
                return capture(actionName, frameIndex);
              },
              { actionName: action, frameIndex: frame },
            ),
        };
      },
    });
  } finally {
    await browser?.close();
    await server.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [framesRoot, configDir] = process.argv.slice(2);
  if (!framesRoot || !configDir) {
    console.error(
      'Usage: node export-dragonbones-frames.mjs <frames-output-dir> <config-output-dir>',
    );
    process.exitCode = 1;
  } else {
    runCli(framesRoot, configDir).catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  }
}
