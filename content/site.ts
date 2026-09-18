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
   * Portrait for the hero's identity badge. Null until Chrys supplies one:
   * pointing at a file that does not exist would 404 on every load and cost a
   * Lighthouse Best Practices point, so the badge shows a monogram instead.
   * To enable it, drop the file in public/ and set this to its path.
   */
  portrait: null as string | null,
  links: {
    linkedin: '[linkedin-url]', // placeholder — still unknown, docs/07 §6
    github: 'https://github.com/chrysanly',
    // Not rendered anywhere yet: public/resume.pdf does not exist. Wire the
    // About link back up once Chrys supplies the file. docs/CONTENT-TODO.md.
    resume: '/resume.pdf',
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

/** docs/07-SOURCE-CONTENT.md §3. Order is fixed; do not rank by proficiency. */
export const skillGroups = [
  {
    label: 'Languages & frameworks',
    items: [
      'PHP',
      'JavaScript',
      'Dart',
      'SQL',
      'HTML',
      'CSS/SCSS',
      'Laravel 7–12',
      'Node.js',
      'Vue 3',
      'React',
      'Angular 7–10',
      '.NET Web API',
      'Flutter',
      'Ionic 5',
    ],
  },
  {
    label: 'Databases',
    items: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB', 'Firebase Firestore'],
  },
  {
    label: 'Architecture & practices',
    items: [
      'SOLID',
      'Repository pattern',
      'Service Layer pattern',
      'RESTful API design',
      'RBAC',
      'TDD',
      'Clean code',
      'Conventional commits',
      'Agile/Scrum',
    ],
  },
  {
    label: 'Auth & security',
    items: ['Laravel Sanctum', 'Laravel Passport OAuth', 'Twilio OTP', 'JWT'],
  },
  {
    label: 'Tools & platforms',
    items: [
      'Git',
      'GitHub',
      'GitLab',
      'Azure',
      'AWS',
      'Firebase',
      'Docker',
      'Postman',
      'JIRA',
      'Figma',
      'Composer',
      'NPM',
      'Vite',
      'Webpack',
    ],
  },
  { label: 'Testing', items: ['PHPUnit', 'Pest', 'Firebase Emulator'] },
  {
    label: 'AI-assisted development',
    items: ['Code integration', 'Optimisation', 'Workflow automation'],
  },
] as const;

/** docs/07-SOURCE-CONTENT.md §4. */
export const employment = [
  {
    role: 'Senior Full-Stack Developer',
    company: 'Almutakamela Vehicle Testing and Registration',
    location: 'Dubai, UAE',
    period: 'Nov 2025 – present',
  },
  {
    role: 'Senior PHP Developer',
    company: 'OmniQuest PH (Unilab)',
    location: 'Philippines',
    period: 'Mar 2025 – Aug 2025',
  },
  {
    role: 'Web Developer',
    company: 'ThinkBit Solutions Phils. Inc',
    location: 'Philippines',
    period: 'Nov 2022 – Feb 2025',
  },
  {
    role: 'Mid Software Developer',
    company: 'TourismoPH',
    location: 'Philippines',
    period: 'Sep 2020 – Oct 2022',
  },
  {
    role: 'Junior Web Developer',
    company: 'V. Zuniga Logistics',
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
