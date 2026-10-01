/* ==========================================================================
   PROJECTS — one list that powers the home "Selected work" stack
   and the Work page (timeline journey + bento grid).

   To add a new case study:
   1. Duplicate one of the "live" objects below and fill it in.
   2. Put its cover image in /Images/<YourProject>/ and point `cover` at it.
   3. Create the page (copy sfd-project.html as a starting point) and set `href`.
   4. Set `category` to one of the ids in CATEGORIES, and `start`/`end`
      as "YYYY-MM" (end can be left out for a short project).
   5. Delete one of the "soon" placeholders if you want fewer of them.

   status: "live" = clickable case study, "soon" = placeholder card.
   featured: true = shows on the home page stack (keep it to 2–3).
   ========================================================================== */

/* Project types. Each colours its timeline and acts as the key on the Work page.
   A category only appears in the filter once it has at least one live project. */
window.CATEGORIES = [
  { id: "website",  label: "Websites",          colour: "#3D4BFF" },
  { id: "app",      label: "Mobile apps",       colour: "#FF6A3D" },
  { id: "personal", label: "Personal projects", colour: "#12B886" },
  { id: "study",    label: "Coursework",        colour: "#A855F7" }
];

window.PROJECTS = [
  {
    status: "live",
    featured: true,
    category: "website",
    href: "sfd-project.html",
    title: "Systems for Dentists",
    client: "SfD website",
    summary: "An end-to-end redesign that fixed unclear user flows, lifted SEO and made support easier to reach.",
    year: "2025",
    start: "2025-06",
    end: "2025-06",
    duration: "2 weeks",
    role: "Project lead",
    cover: "Images/SFDProject/Mockup/Landing.png",
    coverFallback: "",
    alt: "The redesigned Systems for Dentists homepage"
  },
  {
    status: "live",
    featured: true,
    category: "study",
    href: "ux-diploma.html",
    title: "Airline booking redesign",
    client: "UX Design Institute diploma",
    summary: "A flight booking flow taken from usability research and affinity mapping to a high-fidelity prototype, then redesigned.",
    year: "2023–24",
    start: "2023-09",
    end: "2024-06",
    duration: "9 months",
    role: "Solo designer",
    cover: "Images/UXDIProject/P2 Homepage.png",
    coverFallback: "Images/UXDIProject/Interaction Design.jpg",
    alt: "The redesigned airline booking homepage"
  },
  {
    status: "soon",
    featured: true,
    title: "Next case study",
    client: "In progress",
    summary: "I'm writing this one up now. Want an early look? Message me on LinkedIn.",
    year: "2026",
    memoji: "Images/Memoji/laptop.png"
  },
  {
    status: "soon",
    featured: false,
    title: "Your project here",
    client: "Open for work",
    summary: "Have a product that people find confusing? That's the kind of problem I like.",
    year: "Next",
    memoji: "Images/Memoji/idea.png"
  }
];
