import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const pagesRoot = path.join(projectRoot, 'src', 'pages');
const outputFile = path.join(projectRoot, 'build', 'generated-entries.ts');

function isDirectory(p) {
  return fs.existsSync(p) && fs.statSync(p).isDirectory();
}

function collectEntries() {
  if (!fs.existsSync(pagesRoot)) {
    throw new Error(`pages root not found: ${pagesRoot}`);
  }

  const dirs = fs.readdirSync(pagesRoot);
  const entries = [];

  for (const dir of dirs) {
    const absDir = path.join(pagesRoot, dir);
    if (!isDirectory(absDir)) continue;

    const htmlFile = path.join(absDir, 'index.html');
    if (!fs.existsSync(htmlFile)) continue;

    entries.push({
      name: dir,
      dir,
    });
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));
  return entries;
}

function generateTs(entries) {
  const entriesObject = entries
    .map((item) => `  '${item.name}': path.resolve(root, 'src/pages/${item.dir}/index.html')`)
    .join(',\n');

  return `import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

export const pageEntries = {
${entriesObject}
} as const;

export type PageEntryName = keyof typeof pageEntries;
`;
}

function main() {
  const entries = collectEntries();
  const content = generateTs(entries);

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, content, 'utf-8');

  console.log(
    `[generate-entries] generated ${entries.length} page entries -> ${path.relative(projectRoot, outputFile)}`,
  );
}

main();
