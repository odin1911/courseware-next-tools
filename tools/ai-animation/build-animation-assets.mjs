import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildManifest } from './build-animation-manifest.mjs';

const FFMPEG_PREFIX = ['-hide_banner', '-loglevel', 'error', '-nostdin'];

export function createActionBuildPlan({
  actionName,
  entry,
  fps,
  framesPattern,
  outputDir,
}) {
  if (entry.still) {
    return [
      {
        kind: 'still',
        source: framesPattern.replace('%04d', '0001'),
        output: path.join(outputDir, entry.still),
      },
    ];
  }

  const inputArgs = [
    '-framerate',
    String(fps),
    '-start_number',
    '1',
    '-i',
    framesPattern,
    '-frames:v',
    String(entry.frameCount),
  ];
  const plan = [
    {
      kind: 'webm',
      args: [
        ...FFMPEG_PREFIX,
        ...inputArgs,
        '-c:v',
        'libvpx-vp9',
        '-pix_fmt',
        'yuva420p',
        '-auto-alt-ref',
        '0',
        '-crf',
        '30',
        '-b:v',
        '0',
        '-an',
        path.join(outputDir, entry.webm),
      ],
    },
    {
      kind: 'mov',
      args: [
        ...FFMPEG_PREFIX,
        ...inputArgs,
        '-vf',
        'crop=trunc(iw/2)*2:trunc(ih/2)*2,premultiply=inplace=1,format=bgra',
        '-c:v',
        'hevc_videotoolbox',
        '-alpha_quality',
        '1',
        '-tag:v',
        'hvc1',
        '-an',
        path.join(outputDir, entry.mov),
      ],
    },
  ];

  for (const atlas of entry.atlases) {
    plan.push({
      kind: 'atlas',
      args: [
        ...FFMPEG_PREFIX,
        '-framerate',
        String(fps),
        '-start_number',
        String(atlas.startFrame + 1),
        '-i',
        framesPattern,
        '-vf',
        `tile=layout=${atlas.columns}x${atlas.rows}:nb_frames=${atlas.frameCount}:color=black@0`,
        '-frames:v',
        '1',
        '-update',
        '1',
        '-pix_fmt',
        'rgba',
        path.join(outputDir, atlas.src),
      ],
    });
  }

  return plan;
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }
}

function resolveActionSource(sourceRoot, asset, action) {
  if (action.source) {
    return path.resolve(sourceRoot, action.source);
  }

  const actionRoot = path.join(sourceRoot, asset, action.name);

  if (fs.existsSync(actionRoot)) {
    return actionRoot;
  }

  for (const extension of ['mov', 'webm', 'mp4']) {
    const candidate = `${actionRoot}.${extension}`;
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`missing source for ${asset}/${action.name}`);
}

function validateFrameSequence(framesDir, expectedFrameCount, width, height) {
  const frameNames = fs
    .readdirSync(framesDir)
    .filter((name) => /^frame-\d{4}\.png$/.test(name))
    .sort();

  if (frameNames.length !== expectedFrameCount) {
    throw new Error(
      `${framesDir} has ${frameNames.length} frames; expected ${expectedFrameCount}`,
    );
  }

  frameNames.forEach((name, index) => {
    const expectedName = `frame-${String(index + 1).padStart(4, '0')}.png`;
    if (name !== expectedName) {
      throw new Error(`${framesDir} is missing ${expectedName}`);
    }
  });

  const firstFrame = path.join(framesDir, frameNames[0]);
  const probe = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'stream=width,height,pix_fmt',
      '-of',
      'json',
      firstFrame,
    ],
    { encoding: 'utf8' },
  );

  if (probe.status !== 0) {
    throw new Error(`ffprobe failed for ${firstFrame}`);
  }

  const stream = JSON.parse(probe.stdout).streams?.[0];
  if (stream?.width !== width || stream?.height !== height) {
    throw new Error(
      `${firstFrame} is ${stream?.width}x${stream?.height}; expected ${width}x${height}`,
    );
  }

  run('ffmpeg', [
    ...FFMPEG_PREFIX,
    '-i',
    firstFrame,
    '-vf',
    'alphaextract',
    '-frames:v',
    '1',
    '-f',
    'null',
    '-',
  ]);
}

function prepareFrames(source, action, fps, canvas, temporaryDirs) {
  if (fs.statSync(source).isDirectory()) {
    validateFrameSequence(source, action.frameCount, canvas.width, canvas.height);
    return path.join(source, 'frame-%04d.png');
  }

  const framesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-animation-frames-'));
  temporaryDirs.push(framesDir);
  const framesPattern = path.join(framesDir, 'frame-%04d.png');

  run('ffmpeg', [
    ...FFMPEG_PREFIX,
    '-i',
    source,
    '-vf',
    `fps=${fps},format=rgba`,
    '-frames:v',
    String(action.frameCount),
    framesPattern,
  ]);
  validateFrameSequence(framesDir, action.frameCount, canvas.width, canvas.height);
  return framesPattern;
}

export function buildAnimationAssets(configPath, sourceRoot, outputDir) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const manifest = buildManifest(config);
  const absoluteOutputDir = path.resolve(outputDir);

  if (fs.existsSync(absoluteOutputDir)) {
    throw new Error(`output already exists: ${absoluteOutputDir}`);
  }

  fs.mkdirSync(path.dirname(absoluteOutputDir), { recursive: true });
  const stagingDir = fs.mkdtempSync(
    path.join(path.dirname(absoluteOutputDir), `.${path.basename(absoluteOutputDir)}-`),
  );
  const temporaryDirs = [];

  try {
    for (const action of config.actions) {
      const source = resolveActionSource(path.resolve(sourceRoot), config.asset, action);
      const framesPattern = prepareFrames(
        source,
        action,
        config.fps,
        config.canvas,
        temporaryDirs,
      );
      const plan = createActionBuildPlan({
        actionName: action.name,
        entry: manifest.actions[action.name],
        fps: config.fps,
        framesPattern,
        outputDir: stagingDir,
      });

      for (const operation of plan) {
        if (operation.kind === 'still') {
          fs.copyFileSync(operation.source, operation.output, fs.constants.COPYFILE_EXCL);
        } else {
          run('ffmpeg', operation.args);
        }
      }
    }

    fs.writeFileSync(
      path.join(stagingDir, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    fs.renameSync(stagingDir, absoluteOutputDir);
  } catch (error) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
    throw error;
  } finally {
    for (const directory of temporaryDirs) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }

  return manifest;
}

export function buildAnimationAssetBatch(
  configDir,
  sourceRoot,
  outputRoot,
  buildOne = buildAnimationAssets,
) {
  const absoluteOutputRoot = path.resolve(outputRoot);
  if (fs.existsSync(absoluteOutputRoot)) {
    throw new Error(`output already exists: ${absoluteOutputRoot}`);
  }

  const configPaths = fs
    .readdirSync(configDir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => path.join(configDir, name));

  fs.mkdirSync(path.dirname(absoluteOutputRoot), { recursive: true });
  const stagingRoot = fs.mkdtempSync(
    path.join(path.dirname(absoluteOutputRoot), `.${path.basename(absoluteOutputRoot)}-`),
  );

  try {
    for (const configPath of configPaths) {
      const { asset } = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      buildOne(configPath, sourceRoot, path.join(stagingRoot, asset));
    }
    fs.renameSync(stagingRoot, absoluteOutputRoot);
  } catch (error) {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [configPath, sourceRoot, outputDir] = process.argv.slice(2);

  if (!configPath || !sourceRoot || !outputDir) {
    console.error(
      'Usage: node build-animation-assets.mjs <config.json|config-dir> <source-root> <output-dir>',
    );
    process.exitCode = 1;
  } else if (fs.statSync(configPath).isDirectory()) {
    buildAnimationAssetBatch(configPath, sourceRoot, outputDir);
  } else {
    buildAnimationAssets(configPath, sourceRoot, outputDir);
  }
}
