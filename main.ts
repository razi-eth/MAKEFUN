// The entry's program (Node 22, standard library only): it hands the
// frontend in. It copies app/ and screenshots/ from beside this file
// to /output and writes /output/dossier.json, the summary the judge
// reads (the screenshots, the first load's files and bytes, and the
// source), with the vendored make.fun library. Leave
// vendor/makefun-frontend.ts as it is: the scorer requires
// dossier.json to be byte for byte what its own copy writes.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for
// /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail with a clear message instead of a bare ENOENT if the frontend
// files are missing: without app/ there is nothing to hand in.
if (!existsSync(join(here, 'app'))) {
  throw new Error(`app/ not found beside main.ts (${here}): the frontend files are missing`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (see the kit's RULES.txt, "The gate"): only
// text_max_bytes shapes the bytes; the rest refuse an entry the scorer
// would refuse (more than 3 screenshots or one over 256 KiB; more than
// 993 files and directories in app/ or 16 MiB of app files).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 3, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 16777216 }),
);
