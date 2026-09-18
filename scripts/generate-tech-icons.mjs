/**
 * One-time generator: pulls brand SVG path data out of simple-icons and writes
 * it into the repo as plain inline data, so the package itself is not a
 * dependency of the site. docs/02-TRD.md §1 wants inline SVG only.
 */
import * as si from 'simple-icons';
import { writeFileSync } from 'node:fs';

// label -> candidate simple-icons export names, first match wins.
const WANT = [
  ['PHP', ['siPhp']],
  ['Laravel', ['siLaravel']],
  ['JavaScript', ['siJavascript']],
  ['TypeScript', ['siTypescript']],
  ['Node.js', ['siNodedotjs']],
  ['Vue 3', ['siVuedotjs']],
  ['React', ['siReact']],
  ['Angular', ['siAngular']],
  ['.NET', ['siDotnet']],
  ['Dart', ['siDart']],
  ['Flutter', ['siFlutter']],
  ['Ionic', ['siIonic']],
  ['MySQL', ['siMysql']],
  ['MariaDB', ['siMariadb']],
  ['PostgreSQL', ['siPostgresql']],
  ['MongoDB', ['siMongodb']],
  ['Firebase', ['siFirebase']],
  ['JWT', ['siJsonwebtokens', 'siJwt']],
  ['Twilio', ['siTwilio']],
  ['Docker', ['siDocker']],
  ['AWS', ['siAmazonwebservices', 'siAmazonaws']],
  ['Git', ['siGit']],
  ['GitHub', ['siGithub']],
  ['Postman', ['siPostman']],
  ['Jira', ['siJira']],
  ['Figma', ['siFigma']],
  ['Vite', ['siVite']],
  ['Webpack', ['siWebpack']],
  ['Swagger', ['siSwagger']],
  ['Pusher', ['siPusher']],
  ['Composer', ['siComposer']],
  ['npm', ['siNpm']],
  ['Sass', ['siSass']],
  ['HTML5', ['siHtml5']],
  ['CSS', ['siCss', 'siCss3']],
];

const found = [];
const missing = [];

for (const [label, names] of WANT) {
  const key = names.find((n) => si[n]?.path);
  if (key) found.push({ label, path: si[key].path });
  else missing.push(label);
}

const body = found
  .map((i) => `  { label: ${JSON.stringify(i.label)}, path: ${JSON.stringify(i.path)} },`)
  .join('\n');

writeFileSync(
  'content/tech-icons.ts',
  `/**
 * Brand marks for the stack row, as inline SVG path data.
 *
 * Generated once from simple-icons and committed, so the package is not a
 * dependency of the site — docs/02-TRD.md §1 allows inline SVG only, and this
 * keeps the client bundle free of an icon library.
 *
 * Every mark is drawn in \`currentColor\`, never its brand colour: a row of
 * twenty brand palettes would wreck the two-colour direction in
 * docs/04-UIUX-BRIEF.md §2, and the accent is reserved. All marks are on a
 * 24x24 viewBox. Trademarks belong to their respective owners; they are used
 * here only to identify the technologies Chrys works with.
 */
export interface TechIcon {
  label: string;
  path: string;
}

export const techIcons: readonly TechIcon[] = [
${body}
];
`,
  'utf8',
);

console.log('written:', found.length, 'icons');
console.log('missing:', missing.length ? missing.join(', ') : 'none');
