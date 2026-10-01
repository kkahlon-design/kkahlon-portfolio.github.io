# Karun Kahlon — Portfolio v2

Plain HTML/CSS/JS. No build step, no dependencies. Works on GitHub Pages as-is.

## Deploy
Replace the contents of your `kkahlon-design.github.io` repo with this folder and push.
Keep `Projects.html` capitalised — GitHub Pages is case-sensitive and old links point to it.

## Files
- `index.html` home · `about.html` about · `Projects.html` all work
- `sfd-project.html`, `ux-diploma.html` case studies
- `assets/css/main.css` all styles. Colours/type are tokens at the top.
- `assets/js/main.js` all interactions and scroll animations
- `assets/js/projects.js` **the project list and project types** — edit this to add work.
  `CATEGORIES` sets each type's label and colour (the Work page filter, key and timeline colour).
- `Images/Memoji/` memoji PNGs, trimmed and with the see-through holes repaired

## Add a project
1. Copy `sfd-project.html` → `my-project.html`, swap the copy and images.
2. Add an entry to `assets/js/projects.js` (instructions are at the top of that file).
   Give it a `category` and `start`/`end` dates ("YYYY-MM") so it lands on the Work timeline.
It appears automatically on the home works wheel (if `featured`) and the Work page (timeline and grid).
A type only shows in the Work filter once it has a live project.

## Images still to add (show a placeholder until you do)
- Images/LandingPage/Snowdon.jpg, Spider-Man.JPG, "Antalya arch.png" (About chapters)
- Images/SFDProject/Affinity.jpg
- Images/SFDProject/Mockup/BookDemo.png, Features.png
- Images/SFDProject/Revision/ (Landing1, DentistsTrustOurSoftware, Testimonials, BookDemo, SoftwareFeatures, PatientFeatures, ContactUs .png)
- Images/UXDIProject/P1 *.png and P2 *.png screens (P2 Homepage.png is also the diploma cover)
Open the browser console to see a list of any missing images on a page.

## Preview locally
`python3 -m http.server` in this folder, then open http://localhost:8000
