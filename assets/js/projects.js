/* ==========================================================================
   PROJECTS — one list that powers the home "Selected work" stack
   and the Projects page (list + grid views).

   To add a new case study:
   1. Duplicate one of the "live" objects below and fill it in.
   2. Put its cover image in /Images/<YourProject>/ and point `cover` at it.
   3. Create the page (copy sfd-project.html as a starting point) and set `href`.
   4. Delete one of the "soon" placeholders if you want fewer of them.

   status: "live" = clickable case study, "soon" = placeholder card/row.
   featured: true = shows on the home page stack (keep it to 2–3).
   ========================================================================== */

window.PROJECTS = [
  {
    status: "live",
    featured: true,
    href: "sfd-project.html",
    title: "Systems for Dentists",
    client: "SfD website",
    summary: "An end-to-end redesign that fixed unclear user flows, lifted SEO and made support easier to reach.",
    year: "2025",
    duration: "2 weeks",
    role: "Project lead",
    cover: "Images/SFDProject/Mockup/Landing.png",
    coverFallback: "",
    alt: "The redesigned Systems for Dentists homepage"
  },
  {
    status: "live",
    featured: true,
    href: "ux-diploma.html",
    title: "Airline booking redesign",
    client: "UX Design Institute diploma",
    summary: "A flight booking flow taken from usability research and affinity mapping to a high-fidelity prototype, then redesigned.",
    year: "2023–24",
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
