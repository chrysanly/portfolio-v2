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
