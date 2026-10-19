/**
 * Single source for values that appear in more than one place.
 * Transcribed from docs/07-SOURCE-CONTENT.md §1 and §3.
 *
 * Deliberately absent: dateOfBirth, civilStatus. They are on the source CV by
 * Gulf convention and must never reach the site, its metadata or its JSON-LD.
 * See docs/07-SOURCE-CONTENT.md §1 "Do not publish".
 */
export const site = {
  name: 'Chrys',
  fullName: 'Chrysanly John Corpuz Roma',
  role: 'Senior Full-Stack Developer',
  location: 'Dubai, UAE',
  yearsExperience: '5+',
  availability: '[X] days weekly', // placeholder — still unknown, docs/07 §6
  email: 'chrys.romao21@gmail.com',
  phone: '+971 52 925 8013', // render on /contact only, never in footer or JSON-LD
  /**
   * The same number on WhatsApp, supplied 2026-09-20. It *is* the phone
   * number, so it carries the phone number's rule with it: `/contact` only,
   * never the footer, never structured data — docs/07-SOURCE-CONTENT.md §1
   * "Do not publish". Digits only, which is the form wa.me requires.
   */
  whatsapp: '971529258013',
  /**
   * Portrait for the hero's identity badge. `public/portrait.jpg`, supplied
   * 2026-09-20 — docs/cj-portrait.jpeg, copied in per the instruction below.
   */
  portrait: '/portrait.jpg' as string | null,
  links: {
    // Supplied 2026-09-20, closing launch blocker 3. Unlike the phone number
    // this one is public by design — it may appear anywhere, footer included.
    linkedin: 'https://www.linkedin.com/in/chrysanly-john-roma-7517012a8/',
    github: 'https://github.com/chrysanly',
  },
  /** The hero's three reveal lines. Editing these changes the sequence. */
  intro: [
    'Senior full-stack developer',
    'building ERP and automation systems',
    'for companies in Dubai.',
  ],
  /** Stage C metadata row. Principal stack per docs/07-SOURCE-CONTENT.md §3. */
  meta: {
    discipline: 'ERP platforms, automation, integrations',
    principalStack: 'Laravel, Node.js, Vue, React, MySQL, TypeScript',
    /* All from docs/07-SOURCE-CONTENT.md §3 and §4. Naming the current employer
       is sanctioned by §5.8: employment is already public on the CV and
       LinkedIn — it is project detail and screenshots that are restricted. */
    architecture: 'SOLID, Repository and Service Layer patterns, RESTful API design, RBAC',
    security: 'Laravel Sanctum, Laravel Passport OAuth, Twilio OTP, JWT',
    databases: 'MySQL, MariaDB, PostgreSQL, MongoDB, Firebase Firestore',
    currentRole: 'Senior Full-Stack Developer, Almutakamela Vehicle Testing and Registration',
  },
  /**
   * The two supporting sentences under the hero's three reveal lines, both
   * verbatim from docs/07-SOURCE-CONTENT.md §2. The reveal lines themselves are
   * fixed by 04-UIUX-BRIEF.md §5 and §2 of the source document, so the detail a
   * visitor needs about what the work actually involves lives here instead.
   */
  notes: [
    'Strongest in role-based access control, service-repository architecture, database optimisation and real-time system integration.',
    'Leads development teams, mentors engineers, and uses AI-assisted workflows to accelerate delivery without loosening code quality.',
  ],
  positioning:
    'Senior full-stack developer with 5+ years building scalable web applications, REST APIs and enterprise ERP systems. Laravel, Node.js and modern JavaScript frameworks. Strongest in role-based access control, service-repository architecture, database optimisation and real-time system integration. Leads development teams, mentors engineers, and uses AI-assisted workflows to accelerate delivery without loosening code quality.',
} as const;

/**
 * One item in a stack group. `logo` is a Simple Icons slug with a file in
 * public/logos/ (simple-icons 16.35.0, CC0). A tool without a published logo
 * has none and is drawn as a lettered tile; an engineering practice is
 * `concept` and is shown as words, never given a made-up mark.
 */
export type StackItem = { name: string; logo?: string; concept?: true };

/** A filter on the stack section: `key` is stable, `short` is the chip label. */
export type StackGroup = { key: string; label: string; short: string; items: readonly StackItem[] };

/**
 * docs/07-SOURCE-CONTENT.md §3, from Chrys's resume (Technical Skills,
 * 2026-10-19). Shown in full on the home page's stack section and on About.
 * Order is fixed; do not rank by proficiency.
 */
export const skillGroups: readonly StackGroup[] = [
  {
    key: 'lang',
    label: 'Languages & frameworks',
    short: 'Languages',
    items: [
      { name: 'PHP', logo: 'php' },
      { name: 'JavaScript', logo: 'javascript' },
      { name: 'Python', logo: 'python' },
      { name: 'Dart', logo: 'dart' },
      { name: 'SQL', logo: 'sql' },
      { name: 'HTML5', logo: 'html5' },
      { name: 'CSS3/SCSS', logo: 'css' },
      { name: 'Laravel', logo: 'laravel' },
      { name: 'Node.js', logo: 'nodedotjs' },
      { name: 'Vue', logo: 'vuedotjs' },
      { name: 'React', logo: 'react' },
      { name: 'Next.js', logo: 'nextdotjs' },
      { name: 'Angular', logo: 'angular' },
      { name: '.NET Web API', logo: 'dotnet' },
      { name: 'Flutter', logo: 'flutter' },
      { name: 'Ionic', logo: 'ionic' },
      { name: 'Tauri', logo: 'tauri' },
    ],
  },
  {
    key: 'db',
    label: 'Databases',
    short: 'Databases',
    items: [
      { name: 'MySQL', logo: 'mysql' },
      { name: 'MariaDB', logo: 'mariadb' },
      { name: 'PostgreSQL', logo: 'postgresql' },
      { name: 'MongoDB', logo: 'mongodb' },
      { name: 'Firebase Firestore', logo: 'firebase' },
      { name: 'SQLite', logo: 'sqlite' },
      { name: 'Neon Postgres', logo: 'neon' },
    ],
  },
  {
    key: 'ai',
    label: 'AI & agentic engineering',
    short: 'AI & agentic',
    items: [
      { name: 'Claude Code', logo: 'claude' },
      { name: 'Model Context Protocol (MCP)', logo: 'modelcontextprotocol' },
      { name: 'Groq', logo: 'groq' },
      { name: 'AI-assisted software development', concept: true },
      { name: 'Agentic AI workflows', concept: true },
      { name: 'Reusable AI skills', concept: true },
      { name: 'AI API integration', concept: true },
      { name: 'AI-powered application features', concept: true },
      { name: 'AI-assisted code analysis and refactoring', concept: true },
    ],
  },
  {
    key: 'arch',
    label: 'Architecture & practices',
    short: 'Architecture',
    items: [
      { name: 'SOLID principles', concept: true },
      { name: 'Clean code', concept: true },
      { name: 'Service Layer pattern', concept: true },
      { name: 'Repository pattern', concept: true },
      { name: 'RESTful API design', concept: true },
      { name: 'RBAC', concept: true },
      { name: 'Database query optimisation', concept: true },
      { name: 'N+1 query prevention', concept: true },
      { name: 'TDD', concept: true },
      { name: 'Agile/Scrum', concept: true },
      { name: 'Conventional Commits', concept: true },
    ],
  },
  {
    key: 'auth',
    label: 'Auth & security',
    short: 'Auth & security',
    items: [
      { name: 'Laravel Sanctum', logo: 'laravel' },
      { name: 'Laravel Passport', logo: 'laravel' },
      { name: 'OAuth 2.0', logo: 'oauth' },
      { name: 'JSON Web Tokens (JWT)', logo: 'jsonwebtokens' },
      { name: 'Twilio OTP', logo: 'twilio' },
      { name: 'Role-based authorization', concept: true },
    ],
  },
  {
    key: 'pay',
    label: 'Payments & integrations',
    short: 'Payments',
    items: [
      { name: 'Tabby', logo: 'tabby' },
      { name: 'Tamara', logo: 'tamara' },
      { name: 'Etisalat', logo: 'etisalat' },
      { name: 'Stripe', logo: 'stripe' },
      { name: 'REST API integrations', concept: true },
      { name: 'Mobile API integration', concept: true },
    ],
  },
  {
    key: 'tools',
    label: 'Tools & platforms',
    short: 'Tools',
    items: [
      { name: 'Visual Studio Code', logo: 'vscode' },
      { name: 'PhpStorm', logo: 'phpstorm' },
      { name: 'Git', logo: 'git' },
      { name: 'GitHub', logo: 'github' },
      { name: 'GitLab', logo: 'gitlab' },
      { name: 'Azure', logo: 'azure' },
      { name: 'AWS', logo: 'aws' },
      { name: 'Firebase', logo: 'firebase' },
      { name: 'Docker', logo: 'docker' },
      { name: 'Render', logo: 'render' },
      { name: 'Cloudinary', logo: 'cloudinary' },
      { name: 'Composer', logo: 'composer' },
      { name: 'NPM', logo: 'npm' },
      { name: 'Vite', logo: 'vite' },
      { name: 'Webpack', logo: 'webpack' },
      { name: 'Postman', logo: 'postman' },
      { name: 'Apidog', logo: 'apidog' },
      { name: 'DBngin', logo: 'dbngin' },
      { name: 'TablePlus', logo: 'tableplus' },
      { name: 'JIRA', logo: 'jira' },
      { name: 'Figma', logo: 'figma' },
    ],
  },
  {
    key: 'test',
    label: 'Testing & QA',
    short: 'Testing',
    items: [
      { name: 'PHPUnit', logo: 'phpunit' },
      { name: 'Pest', logo: 'pest' },
      { name: 'Firebase Emulator', logo: 'firebase' },
      { name: 'TDD', concept: true },
      { name: 'API testing', concept: true },
    ],
  },
  {
    key: 'desk',
    label: 'Desktop apps',
    short: 'Desktop',
    items: [
      { name: 'Tauri', logo: 'tauri' },
      { name: 'Rust/Cargo', logo: 'rust' },
      { name: 'Orca', logo: 'orca' },
    ],
  },
];

/**
 * Logos with no Simple Icons file, drawn by hand in public/logos/ in their
 * own colours (asked for on 2026-10-19: "add the tamara, tabby, etisalat,
 * make sure it has its logo"). Shown as images, not ink masks, and never
 * fetched by scripts/generate-tech-icons.mjs.
 */
export const drawnLogos: ReadonlySet<string> = new Set([
  'sql',
  'groq',
  'oauth',
  'twilio',
  'tabby',
  'tamara',
  'etisalat',
  'vscode',
  'azure',
  'aws',
  'apidog',
  'dbngin',
  'tableplus',
  'phpunit',
  'pest',
  'orca',
]);

/**
 * Each logo's brand colour, used on hover only where it keeps 3:1 against
 * that theme's ground (#f7f6f2 light, #14130f dark); `null` keeps the ink.
 * Computed from simple-icons 16.35.0 when the logos were added.
 */
export const logoBrand: Readonly<Record<string, readonly [light: string | null, dark: string | null]>> = {
  php: ['#777BB4', '#777BB4'],
  javascript: [null, '#F7DF1E'],
  python: ['#3776AB', '#3776AB'],
  dart: ['#0175C2', '#0175C2'],
  html5: ['#E34F26', '#E34F26'],
  css: ['#663399', null],
  sass: ['#CC6699', '#CC6699'],
  laravel: ['#FF2D20', '#FF2D20'],
  nodedotjs: [null, '#5FA04E'],
  vuedotjs: [null, '#4FC08D'],
  react: [null, '#61DAFB'],
  angular: ['#0F0F11', null],
  dotnet: ['#512BD4', null],
  flutter: ['#02569B', null],
  ionic: ['#3880FF', '#3880FF'],
  tauri: [null, '#24C8D8'],
  mysql: ['#4479A1', '#4479A1'],
  mariadb: ['#003545', null],
  postgresql: ['#4169E1', '#4169E1'],
  mongodb: [null, '#47A248'],
  firebase: ['#DD2C00', '#DD2C00'],
  sqlite: ['#003B57', null],
  claude: [null, '#D97757'],
  modelcontextprotocol: ['#000000', null],
  phpstorm: ['#000000', null],
  git: ['#F03C2E', '#F03C2E'],
  github: ['#181717', null],
  gitlab: [null, '#FC6D26'],
  docker: [null, '#2496ED'],
  composer: ['#885630', '#885630'],
  npm: ['#CB3837', '#CB3837'],
  vite: ['#9135FF', '#9135FF'],
  webpack: [null, '#8DD6F9'],
  postman: [null, '#FF6C37'],
  jira: ['#0052CC', null],
  figma: ['#F24E1E', '#F24E1E'],
  jsonwebtokens: ['#000000', null],
  stripe: ['#635BFF', '#635BFF'],
  rust: ['#000000', null],
  nextdotjs: ['#000000', null],
  render: ['#000000', null],
  cloudinary: ['#3448C5', null],
  neon: [null, '#00E599'],
};

/**
 * docs/07-SOURCE-CONTENT.md §4, newest first.
 *
 * `phase` is the arc Chrys asked the journey to tell — web developer through
 * to senior full-stack. It sits *beside* the real title rather than replacing
 * it: the titles in §4 are verifiable employment facts that a recruiter will
 * cross-check, and rewriting them would be a claim about his history rather
 * than a framing of it. Edit these freely; they are editorial, not sourced.
 *
 * `learned` is a placeholder in the same spirit as [METRIC]: the source
 * document records what Chrys built at each place but says nothing about what
 * he took from it, and inventing that would be putting words in his mouth.
 * One sentence each, from him, before launch. See docs/CONTENT-TODO.md.
 */
export const employment = [
  {
    role: 'Senior Full-Stack Developer',
    company: 'Almutakamela Vehicle Testing and Registration',
    phase: 'Senior full-stack engineer',
    learned: '[what I learned here]',
    location: 'Dubai, UAE',
    period: 'Nov 2025 – present',
  },
  {
    role: 'Senior Software Engineer',
    company: 'OmniQuest PH (Unilab)',
    phase: 'Senior software engineer',
    learned: '[what I learned here]',
    location: 'Philippines',
    period: 'Mar 2025 – Aug 2025',
  },
  {
    role: 'Web Developer',
    company: 'ThinkBit Solutions Phils. Inc',
    phase: 'Full-stack developer',
    learned: '[what I learned here]',
    location: 'Philippines',
    period: 'Nov 2022 – Feb 2025',
  },
  {
    role: 'Mid Software Developer',
    company: 'TourismoPH',
    phase: 'Software engineer',
    learned: '[what I learned here]',
    location: 'Philippines',
    period: 'Sep 2020 – Oct 2022',
  },
  {
    role: 'Junior Web Developer',
    company: 'V. Zuniga Logistics',
    phase: 'Web developer',
    learned: '[what I learned here]',
    location: 'Philippines',
    period: 'Nov 2018 – Dec 2020',
  },
] as const;

/** docs/07-SOURCE-CONTENT.md §1. */
export const education = {
  degree: 'BS Information Technology',
  school: 'Our Lady of Lourdes College',
  location: 'Valenzuela City',
  year: 2020,
} as const;

export const languages = ['English', 'Filipino'] as const;
