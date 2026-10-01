/* ==========================================================================
   Karun Kahlon — Portfolio v2 interactions
   Zero dependencies. Techniques adapted from:
   - React Bits "DecryptedText" (ported to vanilla, width-locked so no jitter)
   - GSAP ScrollTrigger-style pinning & scrubbing (sticky + progress maths)
   - Motion "follow pointer", "magnetic" and layout (FLIP) examples
   ========================================================================== */
(() => {
  "use strict";

  const d = document;
  const root = d.documentElement;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const mobile = () => innerWidth <= 820;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  const ICON = {
    ne: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>',
    e: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-9 9"/></svg>',
    zoom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2M11 8.5v5M8.5 11h5"/></svg>'
  };

  /* ------------------------------------------------------------------
     Missing-image placeholders (queue filled by the inline head script)
  ------------------------------------------------------------------ */
  function markMissing(img) {
    const host = img.parentElement;
    if (!host || host.classList.contains("has-missing")) return;
    host.classList.add("has-missing");
    const ph = d.createElement("div");
    ph.className = "img-missing";
    ph.innerHTML = ICON.image + "<span></span>";
    ph.lastChild.textContent = img.alt || "Image coming soon";
    host.appendChild(ph);
    console.info("[portfolio] Missing image:", img.getAttribute("src"));
  }
  window.__kkMissing = markMissing;
  (window.__kkQueue || []).forEach(markMissing);

  /* ------------------------------------------------------------------
     Theme toggle with circular reveal from the button
  ------------------------------------------------------------------ */
  function currentTheme() {
    return root.dataset.theme || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  }
  function applyTheme(t) {
    root.dataset.theme = t;
    store.set("kk-theme", t);
    $$("[data-theme-toggle]").forEach((b) => {
      b.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
    });
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = t === "dark" ? "#000000" : "#FFFFFF";
  }
  function initTheme() {
    applyTheme(currentTheme());
    $$("[data-theme-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = currentTheme() === "dark" ? "light" : "dark";
        if (!d.startViewTransition || reduce) return applyTheme(next);
        const r = btn.getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        root.classList.add("theme-switching");
        const vt = d.startViewTransition(() => applyTheme(next));
        vt.ready.then(() => {
          root.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] },
            { duration: 750, easing: "cubic-bezier(0.76, 0, 0.24, 1)", pseudoElement: "::view-transition-new(root)" }
          );
        }).catch(() => {});
        vt.finished.finally(() => root.classList.remove("theme-switching"));
      });
    });
  }

  /* ------------------------------------------------------------------
     Nav: solid on scroll, hides on scroll down, returns on scroll up
  ------------------------------------------------------------------ */
  let lastY = scrollY;
  const nav = $(".nav");
  function updateNav() {
    if (!nav) return;
    const y = scrollY;
    nav.classList.toggle("is-scrolled", y > 8);
    const menuOpen = $(".menu.is-open");
    if (!menuOpen && !d.body.classList.contains("page-work")) nav.classList.toggle("is-hidden", y > 320 && y > lastY + 2);
    if (y < lastY - 2) nav.classList.remove("is-hidden");
    lastY = y;
  }
  function initMenu() {
    const btn = $(".nav__menu-btn"), menu = $("#menu");
    if (!btn || !menu) return;
    const set = (open) => {
      menu.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.setAttribute("aria-hidden", String(!open));
      menu.inert = !open;
      d.body.style.overflow = open ? "hidden" : "";
      if (open) nav.classList.remove("is-hidden");
    };
    menu.inert = true;
    btn.addEventListener("click", () => set(!menu.classList.contains("is-open")));
    d.addEventListener("keydown", (e) => { if (e.key === "Escape" && menu.classList.contains("is-open")) { set(false); btn.focus(); } });
    $$("a", menu).forEach((a) => a.addEventListener("click", () => set(false)));
  }

  /* ------------------------------------------------------------------
     Decrypted text — React Bits DecryptedText, vanilla port.
     Characters resolve left→right; widths are locked to stop jitter.
  ------------------------------------------------------------------ */
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#%&*+=?";
  function decrypt(el, { speed = 28, delay = 0 } = {}) {
    if (!el) return Promise.resolve();
    const full = el.textContent.replace(/\s+/g, " ").trim();
    el.setAttribute("aria-label", full);
    const chars = [];
    const targets = $$(".line", el).length ? $$(".line", el) : [el];
    targets.forEach((t) => {
      const text = t.textContent;
      t.textContent = "";
      t.setAttribute("aria-hidden", "true");
      // Group letters per word so lines can only break between words
      text.split(" ").forEach((word, wi) => {
        if (wi) t.appendChild(d.createTextNode(" "));
        if (!word) return;
        const w = d.createElement("span");
        w.className = "dc-word";
        for (const ch of word) {
          const s = d.createElement("span");
          s.className = "dc-char";
          s.textContent = ch;
          w.appendChild(s);
          chars.push({ el: s, ch });
        }
        t.appendChild(w);
      });
    });
    if (reduce) return Promise.resolve();
    // lock widths
    chars.forEach((c) => { c.el.style.width = c.el.getBoundingClientRect().width + "px"; c.el.style.textAlign = "center"; });
    return new Promise((res) => {
      let revealed = 0, last = 0, started = 0;
      const tick = (t) => {
        if (!started) started = t;
        if (t - started < delay) return requestAnimationFrame(tick);
        if (t - last > speed) {
          last = t;
          revealed = Math.min(chars.length, revealed + Math.max(1, Math.round(chars.length / 38)));
          chars.forEach((c, i) => {
            if (i < revealed) { c.el.textContent = c.ch; c.el.classList.remove("is-scrambled"); }
            else { c.el.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0]; c.el.classList.add("is-scrambled"); }
          });
        }
        if (revealed < chars.length) requestAnimationFrame(tick);
        else { chars.forEach((c) => (c.el.style.width = "")); res(); }
      };
      chars.forEach((c) => { c.el.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0]; c.el.classList.add("is-scrambled"); });
      requestAnimationFrame(tick);
    });
  }
  const fontsReady = () => Promise.race([d.fonts ? d.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 1200))]);

  /* ------------------------------------------------------------------
     Cursor chip — contextual label that follows the pointer
  ------------------------------------------------------------------ */
  function initCursor() {
    if (!fine) return;
    const chip = d.createElement("div");
    chip.className = "cursor-chip";
    chip.setAttribute("aria-hidden", "true");
    chip.innerHTML = '<div class="cursor-chip__inner"></div>';
    d.body.appendChild(chip);
    const inner = chip.firstChild;
    let x = -200, y = -200, tx = x, ty = y, raf = 0;
    const loop = () => {
      x = lerp(x, tx, 0.22); y = lerp(y, ty, 0.22);
      chip.style.setProperty("--x", x + "px");
      chip.style.setProperty("--y", y + "px");
      chip.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.3 ? requestAnimationFrame(loop) : 0;
    };
    addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
    d.addEventListener("pointerover", (e) => {
      const t = e.target.closest("[data-cursor]");
      if (!t) return;
      inner.innerHTML = (ICON[t.dataset.cursorIcon || "ne"] || "") + "<span></span>";
      inner.lastChild.textContent = t.dataset.cursor;
      chip.classList.add("is-active");
    });
    d.addEventListener("pointerout", (e) => {
      const t = e.target.closest("[data-cursor]");
      if (t && !t.contains(e.relatedTarget)) chip.classList.remove("is-active");
    });
  }

  /* ------------------------------------------------------------------
     Magnetic buttons
  ------------------------------------------------------------------ */
  function initMagnetic() {
    if (!fine || reduce) return;
    $$("[data-magnetic]").forEach((el) => {
      const strength = parseFloat(el.dataset.magnetic) || 0.3;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const mx = (e.clientX - r.left - r.width / 2) * strength;
        const my = (e.clientY - r.top - r.height / 2) * strength;
        el.style.transition = "transform 0.15s linear";
        el.style.transform = `translate(${mx}px, ${my}px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transition = "transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)";
        el.style.transform = "";
      });
    });
  }

  /* ------------------------------------------------------------------
     Button glow: a soft light that sits under the pointer
  ------------------------------------------------------------------ */
  function initGlow() {
    if (!fine) return;
    d.addEventListener("pointermove", (e) => {
      const b = e.target.closest && e.target.closest(".btn");
      if (!b) return;
      const r = b.getBoundingClientRect();
      b.style.setProperty("--gx", (e.clientX - r.left).toFixed(0) + "px");
      b.style.setProperty("--gy", (e.clientY - r.top).toFixed(0) + "px");
    }, { passive: true });
  }

  /* ------------------------------------------------------------------
     Memoji card: tilt + expand-from-the-side into the About page
  ------------------------------------------------------------------ */
  function aboutHeroRect() {
    const cs = getComputedStyle(root);
    const navH = parseFloat(cs.getPropertyValue("--nav-h")) || 72;
    const inset = Math.min(16, Math.max(10, innerWidth * 0.012));
    const h = Math.max(520, innerHeight - navH - inset);
    return { left: inset, top: navH, width: innerWidth - inset * 2, height: h };
  }
  function initMemojiCard() {
    const card = $(".memoji-card");
    if (!card) return;
    const img = $(".memoji-card__img", card);

    if (fine && !reduce) {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transition = "box-shadow 0.6s";
        card.style.setProperty("--ry", px * 12 + "deg");
        card.style.setProperty("--rx", -py * 12 + "deg");
      });
      card.addEventListener("pointerleave", () => {
        card.style.transition = "";
        card.style.setProperty("--ry", "0deg");
        card.style.setProperty("--rx", "0deg");
      });
    }

    card.addEventListener("click", (e) => {
      if (reduce || e.metaKey || e.ctrlKey || e.shiftKey || !card.animate) return;
      e.preventDefault();
      const href = card.href;
      card.style.setProperty("--ry", "0deg");
      card.style.setProperty("--rx", "0deg");
      const r = card.getBoundingClientRect();
      const ir = img.getBoundingClientRect();
      const T = aboutHeroRect();
      const radius = getComputedStyle(card).borderRadius;

      const ov = d.createElement("div");
      ov.className = "expand-overlay";
      Object.assign(ov.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", borderRadius: radius });
      const clone = img.cloneNode();
      clone.removeAttribute("class");
      const i0 = { left: ir.left - r.left, top: ir.top - r.top, width: ir.width, height: ir.height };
      Object.assign(clone.style, { left: i0.left + "px", top: i0.top + "px", width: i0.width + "px", height: i0.height + "px" });
      ov.appendChild(clone);
      d.body.appendChild(ov);
      card.style.visibility = "hidden";

      // Final memoji: centred, bottom-anchored, 66% of hero height (matches .about-hero__memoji)
      const ratio = ir.width / ir.height;
      const fh = Math.min(T.height * 0.66, 600), fw = fh * ratio;
      const fin = { left: (T.width - fw) / 2, top: T.height - fh, width: fw, height: fh };
      const mid = { left: (T.width - i0.width) / 2, top: i0.top, width: i0.width, height: i0.height };
      const inout = "cubic-bezier(0.76, 0, 0.24, 1)";
      const px = (o) => ({ left: o.left + "px", top: o.top + "px", width: o.width + "px", height: o.height + "px" });

      // Phase 1: expand sideways to full width. Phase 2: expand to full height.
      const a1 = ov.animate([
        { ...px(r), easing: inout },
        { offset: 0.5, left: T.left + "px", width: T.width + "px", top: r.top + "px", height: r.height + "px", easing: inout },
        { ...px(T) }
      ], { duration: 1100, fill: "forwards" });
      clone.animate([
        { ...px(i0), easing: inout },
        { offset: 0.5, ...px(mid), easing: inout },
        { ...px(fin) }
      ], { duration: 1100, fill: "forwards" });

      try { sessionStorage.setItem("kk-from-card", "1"); } catch (err) {}
      a1.finished.then(() => { location.href = href; });

      // Restore if user comes Back (bfcache)
      addEventListener("pageshow", function restore(ev) {
        if (!ev.persisted) return;
        ov.remove(); card.style.visibility = "";
        removeEventListener("pageshow", restore);
      });
    });
  }

  /* ------------------------------------------------------------------
     Home hero entrance (the single orchestrated load moment)
  ------------------------------------------------------------------ */
  function initHero() {
    const hero = $(".hero");
    if (!hero) return;
    fontsReady().then(() => {
      hero.classList.add("is-in");
      decrypt($(".hero__title", hero), { speed: 30 });
    });
  }

  function initAboutHero() {
    const hero = $(".about-hero");
    if (!hero) return;
    let fromCard = false;
    try { fromCard = sessionStorage.getItem("kk-from-card") === "1"; sessionStorage.removeItem("kk-from-card"); } catch (e) {}
    const title = $(".about-hero__title", hero);
    if (fromCard) {
      hero.classList.add("from-card");
      fontsReady().then(() => { hero.classList.add("is-in"); decrypt(title, { speed: 32 }); });
      return;
    }
    fontsReady().then(() => {
      if (!reduce && hero.animate) {
        const R = getComputedStyle(hero).borderRadius;
        hero.animate(
          [{ clipPath: `inset(0 62% 0 0 round ${R})` }, { clipPath: `inset(0 0 0 0 round ${R})` }],
          { duration: 1100, easing: "cubic-bezier(0.76, 0, 0.24, 1)" }
        );
        const m = $(".about-hero__memoji", hero);
        m && m.animate(
          [{ transform: "translateX(-50%) translateY(40%)", opacity: 0 }, { transform: "translateX(-50%) translateY(0)", opacity: 1 }],
          { duration: 1000, delay: 450, easing: "cubic-bezier(0.34, 1.4, 0.64, 1)", fill: "backwards" }
        );
      }
      decrypt(title, { speed: 32, delay: 350 });
    });
  }

  /* ------------------------------------------------------------------
     Project rendering from window.PROJECTS
  ------------------------------------------------------------------ */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const label = (text) => `<span class="btn__label">${esc(text)}</span>`;
  const imgTag = (p, cls = "") =>
    `<img ${cls ? `class="${cls}"` : ""} src="${esc(p.cover)}" alt="${esc(p.alt || p.title)}" loading="lazy" decoding="async"${p.coverFallback ? ` data-fallback="${esc(p.coverFallback)}"` : ""}>`;

  function renderStack() {
    const host = $("#stack");
    if (!host || !window.PROJECTS) return;
    const list = window.PROJECTS.filter((p) => p.featured);
    host.innerHTML = list.map((p, i) => {
      if (p.status === "soon") {
        return `<li class="stack__item" style="--i:${i}">
          <div class="work-card work-card--soon">
            <div class="work-card__body">
              <div>
                <span class="status-pill">${esc(p.client)}</span>
                <h3 class="work-card__title">${esc(p.title)}</h3>
                <p class="work-card__summary">${esc(p.summary)}</p>
              </div>
              <div><a class="btn btn--ghost" href="https://www.linkedin.com/in/karun-kahlon-783655301/" target="_blank" rel="noopener noreferrer">${label("Ask me about it")}<svg class="btn__icon btn__icon--ne" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg></a></div>
            </div>
            <div class="work-card__media"><img src="${esc(p.memoji)}" alt="" loading="lazy"></div>
          </div></li>`;
      }
      return `<li class="stack__item" style="--i:${i}">
        <a class="work-card" href="${esc(p.href)}" data-cursor="View case study">
          <div class="work-card__body">
            <div>
              <p class="work-card__kicker">${esc(p.client)}</p>
              <h3 class="work-card__title">${esc(p.title)}</h3>
              <p class="work-card__summary">${esc(p.summary)}</p>
            </div>
            <div>
              <dl class="work-card__meta">
                <div><dt>Year</dt><dd>${esc(p.year)}</dd></div>
                <div><dt>Timeframe</dt><dd>${esc(p.duration)}</dd></div>
                <div><dt>Role</dt><dd>${esc(p.role)}</dd></div>
              </dl>
              <span class="btn btn--accent work-card__cta">${label("Read case study")}<svg class="btn__icon btn__icon--e" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
            </div>
          </div>
          <div class="work-card__media">${imgTag(p)}</div>
        </a></li>`;
    }).join("");
  }

  /* ------------------------------------------------------------------
     Work page: type filter (colour key) + timeline journey + bento grid
  ------------------------------------------------------------------ */
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthIndex = (s) => { const [y, m] = String(s).split("-").map(Number); return y * 12 + (m || 1) - 1; };
  const fmtMonth = (i) => MONTHS[((i % 12) + 12) % 12] + " " + Math.floor(i / 12);
  const whenText = (p) => {
    const a = monthIndex(p.start), b = monthIndex(p.end || p.start);
    return a === b ? fmtMonth(a) : `${fmtMonth(a)} – ${fmtMonth(b)}`;
  };
  const pad2 = (n) => String(n).padStart(2, "0");
  const ARROW_E = '<svg class="btn__icon btn__icon--e" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  function initWork() {
    const journey = $("#journey");
    if (!journey || !window.PROJECTS) return;
    const CATS = window.CATEGORIES || [];
    const catOf = (p) => CATS.find((c) => c.id === p.category) || { label: "Project", colour: "#8C8C8C" };
    const fHost = $("#filters"), panelsHost = $("#journey-panels"), timeHost = $("#journey-time");
    const bento = $("#bento"), bentoWrap = $("#bento-wrap"), head = $(".work-head"), seg = $("[data-view-toggle]");

    // Newest first: the further you scroll, the further back in time you go
    const live = window.PROJECTS
      .filter((p) => p.status === "live" && p.start)
      .sort((a, b) => monthIndex(b.end || b.start) - monthIndex(a.end || a.start));
    const count = $("#work-count");
    if (count) count.textContent = pad2(live.length);
    const cats = CATS.filter((c) => live.some((p) => p.category === c.id));

    let filter = new URLSearchParams(location.search).get("type");
    if (!cats.some((c) => c.id === filter)) filter = "all";
    let view = store.get("kk-work-view") === "grid" ? "grid" : "journey";
    let list = [], panels = [], spans = [], ruler = null, win = null, readout = null;
    let top = 0, PX = 28, ends = [], starts = [], lastLabel = "", isStatic = false;

    /* Filter chips — the key for the timeline colours */
    fHost.style.setProperty("--chip-mix", cats.map((c, i) => `${c.colour} ${(i / cats.length) * 100}% ${((i + 1) / cats.length) * 100}%`).join(", "));
    fHost.innerHTML =
      `<button type="button" class="chip chip--all" data-cat="all"><i></i>All <span class="chip__n">${live.length}</span></button>` +
      cats.map((c) => `<button type="button" class="chip" data-cat="${esc(c.id)}" style="--c:${esc(c.colour)}"><i></i>${esc(c.label)} <span class="chip__n">${live.filter((p) => p.category === c.id).length}</span></button>`).join("");
    const chips = $$(".chip", fHost);

    const pick = () => (filter === "all" ? live : live.filter((p) => p.category === filter));

    /* Reveal-on-scroll for the static (phone / reduced motion) timeline */
    const io = "IntersectionObserver" in window && !reduce
      ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -10% 0px" })
      : null;

    function renderJourney() {
      list = pick();
      const n = list.length;
      journey.style.setProperty("--n", n);
      const cols = list.map((p) => catOf(p).colour);
      journey.style.setProperty("--rail-grad", cols.length > 1 ? `linear-gradient(${cols.join(", ")})` : cols[0] || "var(--line-strong)");
      panelsHost.innerHTML = list.map((p, i) => {
        const c = catOf(p);
        return `<li class="jp" style="--c:${esc(c.colour)}" data-when="${esc(whenText(p))}">
          <a class="jp__media" href="${esc(p.href)}" data-cursor="View case study" tabindex="-1" aria-hidden="true">${imgTag(p)}</a>
          <div class="jp__body">
            <p class="jp__meta"><span class="jp__cat"><i></i>${esc(c.label)}</span><span class="jp__idx">${pad2(i + 1)} / ${pad2(n)}</span></p>
            <p class="jp__when">${esc(whenText(p))}</p>
            <h2 class="jp__title">${esc(p.title)}</h2>
            <p class="jp__summary">${esc(p.summary)}</p>
            <dl class="jp__facts"><div><dt>Client</dt><dd>${esc(p.client)}</dd></div><div><dt>Role</dt><dd>${esc(p.role)}</dd></div><div><dt>Timeframe</dt><dd>${esc(p.duration)}</dd></div></dl>
            <a class="btn btn--accent" href="${esc(p.href)}">${label("Read case study")}${ARROW_E}</a>
          </div>
        </li>`;
      }).join("");
      panels = $$(".jp", panelsHost);
      renderRuler();
      applyStatic();
    }

    function renderRuler() {
      PX = innerWidth < 1080 ? 22 : 28;
      ends = list.map((p) => monthIndex(p.end || p.start) + 1);   // time runs to the end of the last month
      starts = list.map((p) => monthIndex(p.start));
      if (!list.length) { timeHost.innerHTML = ""; return; }
      top = Math.max(...ends) + 3;
      const bottom = Math.min(...starts) - 3;
      const x = (T) => (top - T) * PX;
      let marks = "";
      for (let y = Math.floor(bottom / 12); y <= Math.floor(top / 12); y++) {
        const jan = y * 12;
        if (jan > bottom && jan < top) marks += `<span class="tl__yeartick" style="left:${x(jan)}px"></span>`;
        const mid = jan + 6;
        if (mid > bottom + 1 && mid < top - 1) marks += `<span class="tl__year" style="left:${x(mid)}px">${y}</span>`;
      }
      marks += list.map((p, i) => `<button type="button" class="tl__span" data-i="${i}" style="left:${x(ends[i])}px;width:${(ends[i] - starts[i]) * PX}px;--sc:${esc(catOf(p).colour)}" aria-label="Jump to ${esc(p.title)}, ${esc(whenText(p))}"></button>`).join("");
      const rail = filter === "all" ? "var(--line-strong)" : catOf(list[0]).colour;
      timeHost.style.setProperty("--rail", rail);
      timeHost.innerHTML = `
        <p class="tl__readout" aria-hidden="true"><i></i><span></span></p>
        <div class="tl__window"><div class="tl__ruler" style="width:${(top - bottom) * PX}px;--px:${PX}px">${marks}</div><span class="tl__needle" aria-hidden="true"></span></div>
        <div class="tl__ends"><span>Latest <b>${fmtMonth(Math.max(...ends) - 1)}</b></span><span><b>${fmtMonth(Math.min(...starts))}</b> Earliest</span></div>`;
      ruler = $(".tl__ruler", timeHost); win = $(".tl__window", timeHost); readout = $(".tl__readout span", timeHost);
      spans = $$(".tl__span", timeHost);
      lastLabel = "";
      spans.forEach((s) => s.addEventListener("click", () => goTo(+s.dataset.i)));
    }

    // Scroll so project i sits centre stage
    function goTo(i) {
      const n = list.length;
      const total = journey.offsetHeight - innerHeight;
      const p = n > 1 ? (i + 0.25) / (n - 0.5) : 0.5;
      const y = journey.getBoundingClientRect().top + scrollY + p * total;
      scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
    }

    function applyStatic() {
      isStatic = reduce || mobile();
      journey.classList.toggle("is-static", isStatic);
      if (!isStatic) return;
      panels.forEach((el) => {
        el.inert = false;
        el.removeAttribute("aria-hidden");
        el.classList.remove("is-far");
        if (io) io.observe(el); else el.classList.add("is-in");
      });
    }

    // Scroll position → time. Each project gets a "visit" (time sweeps its own span),
    // then an eased hop back to the next one.
    function timeAt(pos) {
      for (let i = 0; i < list.length; i++) {
        if (pos < i - 0.25) return lerp(starts[i - 1], ends[i], ease(clamp((pos - (i - 1 + 0.25)) / 0.5)));
        if (pos <= i + 0.25) return lerp(ends[i], starts[i], clamp((pos - (i - 0.25)) / 0.5));
      }
      return starts[starts.length - 1];
    }

    function frame() {
      if (view !== "journey" || isStatic || !list.length) return;
      const n = list.length;
      const r = journey.getBoundingClientRect();
      const total = r.height - innerHeight;
      const p = total > 0 ? clamp(-r.top / total) : 0;
      const pos = -0.25 + p * (n - 0.5);
      let cur = 0;
      for (let j = 0; j < n - 1; j++) cur += ease(clamp((pos - j - 0.25) / 0.5));
      panels.forEach((el, i) => {
        const o = i - cur;
        el.style.setProperty("--inc", clamp(o).toFixed(4));
        el.style.setProperty("--out", clamp(-o).toFixed(4));
        el.classList.toggle("is-far", Math.abs(o) >= 0.999);
        const on = Math.abs(o) < 0.5;
        if (el.inert === on) { el.inert = !on; el.setAttribute("aria-hidden", String(!on)); }
      });
      const near = Math.min(n - 1, Math.round(cur));
      const T = timeAt(pos);
      if (ruler) {
        ruler.style.transform = `translateX(${(win.clientWidth / 2 - (top - T) * PX).toFixed(1)}px)`;
        const lbl = fmtMonth(Math.floor(T - 0.001));
        if (lbl !== lastLabel) { readout.textContent = lbl; lastLabel = lbl; }
        timeHost.style.setProperty("--c", catOf(list[near]).colour);
        spans.forEach((s, i) => s.classList.toggle("is-current", i === near));
      }
    }
    scenes.push(frame);

    /* Bento: every card takes the proportions of its preview, rows justify to fill the width */
    function renderBento() {
      const items = filter === "all" ? [...live, ...window.PROJECTS.filter((p) => p.status === "soon")] : pick();
      bento.innerHTML = items.map((p, k) => {
        if (p.status === "soon") {
          return `<li class="bento__item" style="--r:1.25;--i:${k}"><div class="bcard bcard--soon">
            <img src="${esc(p.memoji)}" alt="" loading="lazy">
            <span class="bcard__info"><span class="bcard__cat">${esc(p.client)}</span><span class="bcard__title">${esc(p.title)}</span><span class="bcard__sum">${esc(p.summary)}</span></span>
          </div></li>`;
        }
        const c = catOf(p);
        return `<li class="bento__item" style="--r:1.6;--i:${k}"><a class="bcard" href="${esc(p.href)}" data-cursor="Open" style="--c:${esc(c.colour)}">
          ${imgTag(p)}
          <span class="bcard__info"><span class="bcard__cat"><i></i>${esc(c.label)} · ${esc(p.year)}</span><span class="bcard__title">${esc(p.title)}</span></span>
          <span class="bcard__go" aria-hidden="true">${ICON.e}</span>
        </a></li>`;
      }).join("");
      $$(".bcard:not(.bcard--soon) img", bento).forEach((img) => {
        const fit = () => {
          if (!img.naturalWidth) return;
          const r = clamp(img.naturalWidth / img.naturalHeight, 0.75, 2.2);
          img.closest(".bento__item").style.setProperty("--r", r.toFixed(3));
        };
        if (img.complete) fit(); else img.addEventListener("load", fit);
      });
    }

    /* Keep the reader at the start of the new set if they were deep in the old one */
    const backToStart = () => {
      // the bar is sticky, so measure from what it sits above: the pinned timeline, or the header for the grid
      const y = view === "journey" && !isStatic
        ? journey.getBoundingClientRect().top + scrollY
        : head.getBoundingClientRect().bottom + scrollY - (parseFloat(getComputedStyle(root).getPropertyValue("--nav-h")) || 72);
      if (scrollY > y + 4) scrollTo({ top: y, behavior: "auto" });
    };

    function setFilter(id) {
      filter = id;
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.cat === id)));
      const url = new URL(location.href);
      if (id === "all") url.searchParams.delete("type"); else url.searchParams.set("type", id);
      history.replaceState(null, "", url);
      const swap = () => { renderJourney(); renderBento(); backToStart(); requestScenes(); };
      if (d.startViewTransition && !reduce) d.startViewTransition(swap); else swap();
    }
    chips.forEach((c) => c.addEventListener("click", () => { if (c.dataset.cat !== filter) setFilter(c.dataset.cat); }));
    chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.cat === filter)));

    /* Timeline / grid toggle */
    const btns = $$("button", seg), thumb = $(".seg__thumb", seg);
    const place = () => {
      const on = btns.find((b) => b.getAttribute("aria-pressed") === "true");
      thumb.style.width = on.offsetWidth + "px";
      thumb.style.transform = `translateX(${on.offsetLeft}px)`;
    };
    const setView = (v, animate) => {
      view = v;
      journey.hidden = v !== "journey";
      bentoWrap.hidden = v !== "grid";
      btns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === v)));
      place();
      store.set("kk-work-view", v);
      if (animate) {
        backToStart();
        if (v === "grid" && !reduce) {
          bento.classList.add("is-entering");
          setTimeout(() => bento.classList.remove("is-entering"), 1200);
        }
      }
      requestScenes();
    };
    btns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));

    renderJourney();
    renderBento();
    setView(view, false);
    let wasStatic = isStatic, wasNarrow = innerWidth < 1080;
    addEventListener("resize", () => {
      place();
      const narrow = innerWidth < 1080;
      if ((reduce || mobile()) !== wasStatic || narrow !== wasNarrow) {
        wasStatic = reduce || mobile(); wasNarrow = narrow;
        renderJourney();
      }
    });
    fontsReady().then(place);
  }

  /* ------------------------------------------------------------------
     Scroll-driven scenes (one rAF loop for everything)
  ------------------------------------------------------------------ */
  const scenes = [];
  const sectionProgress = (el) => {
    const r = el.getBoundingClientRect();
    const total = r.height - innerHeight;
    return total > 0 ? clamp(-r.top / total) : 0;
  };

  function sceneStack() {
    const items = $$(".stack__item");
    if (!items.length || reduce) return;
    scenes.push(() => {
      items.forEach((item, i) => {
        const card = item.firstElementChild;
        const r = card.getBoundingClientRect();
        // media parallax
        card.style.setProperty("--m", ((clamp((innerHeight - r.top) / (innerHeight + r.height)) - 0.5) * 10).toFixed(2));
        const next = items[i + 1];
        if (!next) return;
        const top = parseFloat(getComputedStyle(item).top) || 0;
        const nTop = next.getBoundingClientRect().top;
        // 0 when the next card is a full card-height below, 1 when it has covered this one
        const p = clamp((top + item.offsetHeight - nTop) / item.offsetHeight);
        card.style.setProperty("--p", p.toFixed(3));
      });
    });
  }

  function scenePhilosophy() {
    const sec = $(".philo");
    if (!sec) return;
    const statements = $$(".philo__statement", sec);
    const labels = $$(".philo__label", sec);
    sec.style.setProperty("--n", statements.length);
    const words = statements.map((s) => {
      s.dataset.label = labels[statements.indexOf(s)]?.textContent || "";
      const text = s.textContent.trim();
      s.setAttribute("aria-label", text);
      s.innerHTML = text.split(/\s+/).map((w) => `<span class="w" aria-hidden="true">${esc(w)}</span>`).join(" ");
      return $$(".w", s);
    });
    if (reduce) return;
    scenes.push(() => {
      if (mobile()) return;
      const p = sectionProgress(sec);
      const n = statements.length;
      const seg = p * n;
      const idx = Math.min(n - 1, Math.floor(seg));
      const local = clamp((seg - idx) * 1.3);
      statements.forEach((s, i) => s.classList.toggle("is-active", i === idx));
      labels.forEach((l, i) => {
        l.classList.toggle("is-active", i === idx);
        l.style.setProperty("--lp", i < idx ? 1 : i === idx ? local : 0);
      });
      const ws = words[idx];
      const on = Math.round(local * ws.length);
      ws.forEach((w, k) => w.classList.toggle("is-on", k < on));
    });
  }

  function sceneChapters() {
    const sec = $(".chapters");
    if (!sec) return;
    const chapters = $$(".chapter", sec);
    const n = chapters.length;
    const rail = $(".chapters__rail", sec);
    const num = rail && $(".chapters__count b", rail);
    const ticks = rail ? $$(".chapters__tick", rail) : [];
    sec.style.setProperty("--n", n);
    if (rail) {
      $(".chapters__count i", rail).textContent = "/" + n;
      ticks.forEach((t, i) => (t.style.top = (n > 1 ? (i / (n - 1)) * 100 : 0) + "%"));
    }
    if (reduce) return;
    let shown = -1;
    scenes.push(() => {
      const p = sectionProgress(sec);
      const pos = p * (n - 1);
      const ins = chapters.map((c, i) => (i === 0 ? 1 : ease(clamp((pos - (i - 1) - 0.1) / 0.75))));
      chapters.forEach((c, i) => {
        c.style.setProperty("--in", ins[i].toFixed(4));
        c.style.setProperty("--out", (ins[i + 1] || 0).toFixed(4));
        c.style.zIndex = i + 1;
        c.setAttribute("aria-hidden", String(!(ins[i] > 0.5 && (ins[i + 1] || 0) < 0.5)));
      });
      if (!rail) return;
      const active = Math.min(n - 1, Math.round(pos));
      // the fill follows the cards themselves, so it moves exactly as they do
      const fill = n > 1 ? ins.slice(1).reduce((a, b) => a + b, 0) / (n - 1) : 1;
      rail.style.setProperty("--p", fill.toFixed(4));
      ticks.forEach((t, i) => { t.classList.toggle("is-done", ins[i] > 0.5); t.classList.toggle("is-active", i === active); });
      if (active !== shown) { shown = active; num.textContent = active + 1; }
      rail.classList.toggle("is-end", ins[n - 1] > 0.6);
    });
  }

  /* ------------------------------------------------------------------
     Process loop: each step is a little scene the reader "performs"
     by scrolling — the scroll moves the lens, triggers the friction,
     runs the comparison, piles up ideas, fans out directions, critiques.
  ------------------------------------------------------------------ */
  const SC = (() => {
    const frame = `<rect class="sc-paper" x="30" y="56" width="240" height="188" rx="12"/>
      <path d="M30 78h240" style="stroke:var(--line-strong)"/>
      <circle class="sc-mute" cx="44" cy="67" r="3.2"/><circle class="sc-mute" cx="54" cy="67" r="3.2"/><circle class="sc-mute" cx="64" cy="67" r="3.2"/>
      <rect class="sc-block" x="84" y="62" width="132" height="10" rx="5"/>`;
    const r = (cls, x, y, w, h, rx = 2) => `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/>`;
    const tick = (x, y, ok, dd) => `<g class="pop" style="--d:${dd}"><g transform="translate(${x} ${y})">
      <circle r="9" fill="${ok ? "#12B886" : "#FF4D4F"}"/>
      <path d="${ok ? "M-4 0l3 3 5-6" : "M-3.5-3.5l7 7M3.5-3.5l-7 7"}" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></g>`;
    const pin = (x, y, col, glyph, text, lx, ly, anchor, dd) => `<g class="pop sc-pin" style="--d:${dd}">
      <circle cx="${x}" cy="${y}" r="11" fill="${col}" opacity=".5"/><circle cx="${x}" cy="${y}" r="11" fill="${col}"/>
      <text class="sc-glyph" x="${x}" y="${y}">${glyph}</text>
      <text class="sc-label" x="${lx}" y="${ly}" text-anchor="${anchor}">${text}</text></g>`;
    const star = (x, y, dd, t) => `<g class="pop" style="--d:${dd}"><g transform="translate(${x} ${y})"><path class="sc-spark" style="--t:${t}s" d="M0-8C1-2 2-1 8 0C2 1 1 2 0 8C-1 2-2 1-8 0C-2-1-1-2 0-8z"/></g></g>`;
    const VARIANTS = [["#3D4BFF", -32], ["#FF6A3D", -16], ["#12B886", 16], ["#A855F7", 32]];
    const variant = (col) => `${r("sc-paper", 104, 110, 92, 130, 10)}
      <rect x="112" y="118" width="76" height="34" rx="6" fill="${col}"/>
      ${r("sc-ink", 112, 160, 50, 6)}${r("sc-mute", 112, 172, 70, 4)}${r("sc-mute", 112, 180, 58, 4)}
      <rect x="112" y="214" width="40" height="12" rx="6" fill="${col}"/>`;

    return {
      observe: () => `<defs><clipPath id="sc-lens-clip"><circle r="28.5"/></clipPath></defs>
        ${frame}
        <g id="sc-ui">
          ${r("sc-ink", 44, 88, 36, 7)}${r("sc-mute", 190, 89, 16, 4)}${r("sc-mute", 212, 89, 16, 4)}${r("sc-mute", 234, 89, 16, 4)}
          ${r("sc-block", 44, 104, 118, 72, 6)}
          <path class="sc-stroke" d="M54 166l24-28 16 16 14-11 24 23"/><circle class="sc-acc" cx="142" cy="120" r="7"/>
          ${r("sc-ink", 174, 108, 80, 9)}${r("sc-ink", 174, 122, 58, 9)}
          ${r("sc-mute", 174, 140, 80, 4)}${r("sc-mute", 174, 149, 72, 4)}${r("sc-mute", 174, 158, 76, 4)}
          ${r("sc-acc", 174, 166, 46, 11, 5.5)}
          ${[44, 117, 190].map((x) => r("sc-block", x, 190, 66, 42, 6) + r("sc-ink", x + 8, 198, 24, 6) + r("sc-mute", x + 8, 214, 46, 4) + r("sc-mute", x + 8, 222, 32, 4)).join("")}
        </g>
        <g class="sc-lens" data-path="80,122 222,122 222,122 80,210 222,210">
          <g clip-path="url(#sc-lens-clip)"><circle r="30" style="fill:var(--surface)"/><g class="sc-zoom"><use href="#sc-ui"/></g></g>
          <circle class="sc-lens-ring" r="30"/><path class="sc-lens-handle" d="M22 22l16 16"/>
        </g>
        <text class="sc-sub" x="150" y="276" text-anchor="middle">Using it like a real person would</text>`,

      pain: () => `${frame}
        <path class="sc-stroke" d="M254 63l8 8M262 63l-8 8" style="stroke-width:1.6"/>
        ${r("sc-ink", 48, 92, 70, 8)}
        ${r("sc-mute", 48, 110, 40, 4)}${r("sc-block", 48, 118, 204, 18, 5)}
        ${r("sc-mute", 48, 146, 52, 4)}${r("sc-block", 48, 154, 204, 18, 5)}<path class="sc-stroke" d="M236 161l5 5 5-5" style="stroke-width:1.6"/>
        ${r("sc-mute", 48, 182, 30, 4)}${r("sc-block", 48, 190, 98, 18, 5)}${r("sc-block", 154, 190, 98, 18, 5)}
        ${r("sc-acc", 172, 216, 80, 18, 9)}
        ${pin(226, 146, "#F59F00", "?", "Hesitates", 210, 132, "end", 0.28)}
        ${pin(92, 127, "#FF7A45", "↺", "Backtracks", 108, 131, "start", 0.55)}
        ${pin(258, 67, "#FF4D4F", "✕", "Gives up", 258, 44, "middle", 0.84)}
        <g class="sc-cursor" data-path="60,262 128,127 128,127 212,163 212,163 212,163 112,127 112,127 205,225 205,225 256,69 256,69"><path d="M0 0v17l4.5-4 3 7 2.6-1.1-3-6.6h6z"/></g>
        <text class="sc-sub" x="150" y="276" text-anchor="middle">Every stumble becomes the brief</text>`,

      compare: () => `
        ${[30, 113, 196].map((x, i) => `${r("sc-paper", x, 58, 74, 118, 8)}<text class="sc-sub" x="${x + 37}" y="50" text-anchor="middle">${"ABC"[i]}</text>`).join("")}
        ${r("sc-ink", 38, 66, 30, 6)}${r("sc-block", 38, 78, 58, 34, 4)}${r("sc-mute", 38, 120, 50, 4)}${r("sc-mute", 38, 128, 40, 4)}${r("sc-acc", 38, 150, 30, 10, 5)}
        ${r("sc-block", 121, 66, 58, 22, 4)}${r("sc-block", 121, 94, 17, 17, 3)}${r("sc-block", 141.5, 94, 17, 17, 3)}${r("sc-block", 162, 94, 17, 17, 3)}${r("sc-mute", 121, 120, 58, 4)}${r("sc-acc", 121, 150, 58, 10, 5)}
        ${[66, 74, 82, 90, 98, 106, 114, 122, 130].map((y, k) => r("sc-mute", 204, y, 58 - (k % 3) * 12, 4)).join("")}${r("sc-acc", 240, 150, 22, 8, 4)}
        <g data-path="67,117 67,117 150,117 150,117 233,117 233,117"><rect class="sc-scan" x="-43" y="-65" width="86" height="130" rx="11"/></g>
        ${tick(55, 200, true, 0.06)}${tick(79, 200, false, 0.13)}
        ${tick(138, 200, true, 0.44)}${tick(162, 200, true, 0.5)}
        ${tick(221, 200, false, 0.78)}${tick(245, 200, true, 0.84)}
        <circle cx="96" cy="240" r="5" fill="#12B886"/><text class="sc-sub" x="105" y="244">Learn from</text>
        <circle cx="178" cy="240" r="5" fill="#FF4D4F"/><text class="sc-sub" x="187" y="244">Avoid</text>`,

      ideate: () => {
        const doodles = [
          `<circle class="sc-stroke" cx="14" cy="16" r="6" style="stroke-width:1.5"/><path class="sc-stroke" d="M26 12h18M26 20h12M8 32h36" style="stroke-width:1.5"/>`,
          `<path class="sc-stroke" d="M8 9h36v12H8zM8 30h14M28 30h16" style="stroke-width:1.5"/>`,
          `<path class="sc-stroke" d="M8 32l10-12 8 8 6-5 12 12" style="stroke-width:1.5"/><circle class="sc-acc" cx="40" cy="11" r="3"/>`,
          `<path class="sc-stroke" d="M10 11h32M10 19h24M10 27h28" style="stroke-width:1.5"/><rect class="sc-acc" x="10" y="32" width="14" height="4" rx="2"/>`
        ];
        const rot = [-6, 4, -3, 7, 3, -8, 5, -2, -5, 6, -4, 2];
        let out = "";
        for (let k = 0; k < 12; k++) {
          const x = 34 + (k % 4) * 60, y = 62 + Math.floor(k / 4) * 54;
          out += `<g class="pop sc-sketch" style="--d:${(0.04 + k * 0.065).toFixed(3)};--r:${rot[k]}deg"><g transform="translate(${x} ${y})">${r("sc-paper", 0, 0, 52, 42, 4)}${doodles[k % 4]}</g></g>`;
        }
        return out + `<text class="sc-label" x="150" y="250" text-anchor="middle"><tspan data-count="12">0</tspan> ideas. Judgement later.</text>`;
      },

      explore: () => `
        ${VARIANTS.map(([col, a], i) => `<g class="sc-fan" style="--a:${a}deg;--d:${0.05 + i * 0.1}">${variant(col)}</g>`).join("")}
        <g>${r("sc-paper", 104, 110, 92, 130, 10).replace("/>", ' style="stroke-dasharray:4 3"/>')}
          ${r("sc-block", 112, 118, 76, 34, 6)}${r("sc-mute", 112, 160, 50, 6)}${r("sc-mute", 112, 172, 70, 4)}${r("sc-mute", 112, 180, 58, 4)}${r("sc-block", 112, 214, 40, 12, 6)}</g>
        ${star(62, 92, 0.1, 0)}${star(240, 84, 0.3, 0.4)}${star(254, 184, 0.5, 0.8)}${star(44, 196, 0.7, 1.2)}
        <g class="pop" style="--d:0.02"><rect class="sc-acc" x="94" y="60" width="112" height="24" rx="12"/>
        <text class="sc-glyph" x="150" y="72" style="font-size:11px">✦ AI · <tspan data-count="4">0</tspan> directions</text></g>`,

      critique: () => `
        ${VARIANTS.map(([col, a], i) => `<g class="sc-crit" style="--a:${a}deg;--d:${0.04 + i * 0.12}">${variant(col)}<path class="sc-strike" pathLength="1" d="M110 120L190 232"/></g>`).join("")}
        <g class="sc-keep">${r("sc-paper", 104, 110, 92, 130, 10)}<rect class="sc-keep-ring" x="104" y="110" width="92" height="130" rx="10"/>
          ${r("sc-block", 112, 118, 76, 60, 6)}
          <circle class="sc-acc" cx="150" cy="140" r="10"/><path d="M132 172c4-13 32-13 36 0" style="fill:none;stroke:var(--acc-500);stroke-width:3;stroke-linecap:round"/>
          ${r("sc-ink", 112, 188, 56, 6)}${r("sc-mute", 112, 200, 70, 4)}${r("sc-acc", 112, 214, 48, 12, 6)}
          <g class="pop" style="--d:0.62"><path d="M184 112c-3-6-12-4-11 3 0 5 11 11 11 11s11-6 11-11c1-7-8-9-11-3z" fill="#FF4D6D"/></g>
        </g>
        <path class="sc-again draw" style="--d:0.74" pathLength="1" d="M71 229A112 112 0 1 1 229 229"/>
        <path class="sc-again pop" style="--d:0.8" d="M229 229l9-2.3M229 229l2.3-9"/>
        <text class="sc-label pop" style="--d:0.82" x="138" y="268" text-anchor="middle">Made for people. Then again.</text>`
    };
  })();

  // Move [data-path] elements along their polyline for progress s
  function follow(el, s) {
    const pts = el._pts || (el._pts = el.dataset.path.trim().split(/\s+/).map((p) => p.split(",").map(Number)));
    const segs = pts.length - 1;
    const f = clamp(s) * segs, i = Math.min(segs - 1, Math.floor(f)), t = f - i;
    el.style.setProperty("--px", lerp(pts[i][0], pts[i + 1][0], t).toFixed(2));
    el.style.setProperty("--py", lerp(pts[i][1], pts[i + 1][1], t).toFixed(2));
  }

  function sceneLoop() {
    const sec = $(".loop");
    if (!sec) return;
    const steps = $$(".loop__step", sec);
    const n = steps.length;
    sec.style.setProperty("--n", n);
    const svg = $(".loop__ring svg", sec);
    const R = 220, C = 2 * Math.PI * R;
    const prog = $(".loop__progress", sec);
    prog.style.strokeDasharray = C;
    prog.style.strokeDashoffset = C;
    // place nodes around the ring
    const g = $(".loop__nodes", svg);
    steps.forEach((s, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const cx = 280 + Math.cos(a) * R, cy = 280 + Math.sin(a) * R;
      const lx = 280 + Math.cos(a) * (R + 38), ly = 280 + Math.sin(a) * (R + 38);
      const anchor = Math.abs(Math.cos(a)) < 0.2 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
      g.insertAdjacentHTML("beforeend",
        `<g class="loop__node"><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="8"/><text x="${lx.toFixed(1)}" y="${(ly + 5).toFixed(1)}" text-anchor="${anchor}">${esc(s.dataset.short)}</text></g>`);
    });
    const nodes = $$(".loop__node", svg);
    const head = $(".loop__head", svg);

    // build one scene per step
    const host = $(".loop__scenes", sec);
    const sceneEls = steps.map((s) => {
      const build = SC[s.dataset.scene];
      if (!host || !build) return null;
      host.insertAdjacentHTML("beforeend", `<svg class="scene" viewBox="0 0 300 300">${build()}</svg>`);
      const el = host.lastElementChild;
      el._followers = $$("[data-path]", el);
      el._counters = $$("[data-count]", el);
      return el;
    });
    const setScene = (el, s) => {
      if (!el || el._s === s) return;
      el._s = s;
      el.style.setProperty("--s", s.toFixed(4));
      el._followers.forEach((f) => follow(f, s));
      el._counters.forEach((c) => (c.textContent = Math.round(clamp(s / 0.8) * +c.dataset.count)));
    };

    const memo = $(".loop__memoji", sec);
    let current = -1;
    const setStep = (idx) => {
      if (idx === current) return;
      current = idx;
      steps.forEach((s, i) => s.classList.toggle("is-active", i === idx));
      sceneEls.forEach((el, i) => el && el.classList.toggle("is-active", i === idx));
      const src = steps[idx].dataset.memoji;
      if (memo && src && !memo.src.endsWith(src)) {
        memo.classList.add("is-swapping");
        setTimeout(() => { memo.src = src; memo.classList.remove("is-swapping"); }, 160);
      }
    };
    if (reduce) {
      nodes.forEach((nd) => nd.classList.add("is-done"));
      prog.style.strokeDashoffset = 0;
      sceneEls.forEach((el) => setScene(el, 1));
      setStep(n - 1);
      return;
    }
    scenes.push(() => {
      const p = sectionProgress(sec);
      const pos = clamp(p * 1.04) * n;
      const idx = Math.min(n - 1, Math.floor(pos));
      prog.style.strokeDashoffset = (C * (1 - clamp(pos / n))).toFixed(1);
      nodes.forEach((nd, i) => { nd.classList.toggle("is-done", i <= idx); nd.classList.toggle("is-active", i === idx); });
      if (head) {
        const a = clamp(pos / n) * Math.PI * 2 - Math.PI / 2;
        head.setAttribute("transform", `translate(${(280 + Math.cos(a) * R).toFixed(1)} ${(280 + Math.sin(a) * R).toFixed(1)})`);
      }
      // each scene completes at ~80% of its step, then holds so it can be read
      sceneEls.forEach((el, i) => setScene(el, i < idx ? 1 : i > idx ? 0 : clamp((pos - idx) * 1.25)));
      setStep(idx);
    });
    setStep(0);
  }

  function sceneCover() {
    const stage = $(".case-stage");
    if (!stage || reduce) return;
    // settle flat over the first ~45% of the viewport of scrolling
    scenes.push(() => {
      stage.style.setProperty("--t", ease(clamp(scrollY / (innerHeight * 0.45))).toFixed(4));
    });
  }

  function sceneProgress() {
    const bar = $(".progress span");
    if (!bar) return;
    scenes.push(() => {
      const max = d.documentElement.scrollHeight - innerHeight;
      bar.style.setProperty("--p", max > 0 ? (scrollY / max).toFixed(4) : 0);
    });
  }

  function sceneSideNav() {
    const links = $$(".side__link");
    if (!links.length) return;
    const secs = links.map((a) => $(a.getAttribute("href"))).filter(Boolean);
    scenes.push(() => {
      let idx = 0;
      secs.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * 0.4) idx = i; });
      links.forEach((a, i) => {
        a.classList.toggle("is-active", i === idx);
        if (i === idx) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current");
      });
    });
  }

  let ticking = false;
  const runScenes = () => { ticking = false; updateNav(); scenes.forEach((fn) => fn()); };
  const requestScenes = () => { if (!ticking) { ticking = true; requestAnimationFrame(runScenes); } };

  /* ------------------------------------------------------------------
     One-shot reveals (case-study media + timeline only)
  ------------------------------------------------------------------ */
  function initReveals() {
    const els = $$("[data-reveal], .timeline");
    if (!els.length) return;
    if (reduce || !("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -12% 0px" });
    els.forEach((e) => io.observe(e));
  }

  /* ------------------------------------------------------------------
     Gallery: drag, snap, focus scaling, counter, progress
  ------------------------------------------------------------------ */
  function initGalleries() {
    $$(".gallery").forEach((g) => {
      const track = $(".gallery__track", g);
      const slides = $$(".gallery__slide", track);
      const prev = $("[data-prev]", g), next = $("[data-next]", g);
      const cap = $(".gallery__caption-text", g), count = $(".gallery__count", g);
      const bar = $(".gallery__bar span", g);
      if (!slides.length) return;
      bar && bar.style.setProperty("--bw", (100 / slides.length) + "%");

      const update = () => {
        const tr = track.getBoundingClientRect();
        const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
        const focus = tr.left + pad + slides[0].offsetWidth / 2;
        let best = 0, bestD = Infinity;
        slides.forEach((s, i) => {
          const r = s.getBoundingClientRect();
          const dist = Math.abs(r.left + r.width / 2 - focus);
          if (dist < bestD) { bestD = dist; best = i; }
          const t = clamp(dist / r.width);
          if (!reduce) { s.style.setProperty("--gs", (1 - t * 0.06).toFixed(3)); s.style.setProperty("--go", (1 - t * 0.45).toFixed(3)); }
        });
        const img = $("img", slides[best]);
        if (cap) cap.textContent = img ? img.alt : "";
        if (count) count.textContent = `${String(best + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
        const max = track.scrollWidth - track.clientWidth;
        const p = max > 0 ? track.scrollLeft / max : 0;
        bar && bar.style.setProperty("--bx", (p * (slides.length - 1) * 100).toFixed(1) + "%");
        if (prev) prev.disabled = track.scrollLeft < 4;
        if (next) next.disabled = track.scrollLeft > max - 4;
      };
      let rq = false;
      track.addEventListener("scroll", () => { if (!rq) { rq = true; requestAnimationFrame(() => { rq = false; update(); }); } }, { passive: true });
      addEventListener("resize", update);
      const step = () => slides[0].offsetWidth + parseFloat(getComputedStyle(track).columnGap || 16);
      prev && prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: reduce ? "auto" : "smooth" }));
      next && next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: reduce ? "auto" : "smooth" }));
      track.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); next && next.click(); }
        if (e.key === "ArrowLeft") { e.preventDefault(); prev && prev.click(); }
      });

      // mouse drag
      let down = false, sx = 0, sl = 0, moved = 0;
      track.addEventListener("pointerdown", (e) => {
        if (e.pointerType !== "mouse" || e.button !== 0) return;
        down = true; moved = 0; sx = e.clientX; sl = track.scrollLeft;
      });
      addEventListener("pointermove", (e) => {
        if (!down) return;
        const dx = e.clientX - sx;
        moved = Math.max(moved, Math.abs(dx));
        if (moved > 5) { track.classList.add("is-dragging"); track.scrollLeft = sl - dx; }
      });
      addEventListener("pointerup", () => {
        if (!down) return;
        down = false;
        if (track.classList.contains("is-dragging")) {
          track.classList.remove("is-dragging");
          // snap to nearest after drag
          const s = step();
          track.scrollTo({ left: Math.round(track.scrollLeft / s) * s, behavior: "smooth" });
        }
      });
      track.addEventListener("click", (e) => { if (moved > 5) { e.preventDefault(); e.stopPropagation(); } }, true);
      update();
    });
  }

  /* ------------------------------------------------------------------
     Lightbox with click-to-zoom and drag-to-pan
  ------------------------------------------------------------------ */
  function initLightbox() {
    const triggers = $$("[data-lightbox]");
    if (!triggers.length) return;
    const lb = d.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Image viewer");
    lb.innerHTML = `
      <div class="lightbox__bar">
        <p class="lightbox__caption" aria-live="polite"></p>
        <div class="lightbox__tools">
          <button class="icon-btn" data-lb-zoom aria-label="Zoom in">${ICON.zoom}</button>
          <button class="icon-btn" data-lb-close aria-label="Close viewer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        </div>
      </div>
      <div class="lightbox__stage"><img class="lightbox__img" alt=""></div>
      <div class="lightbox__nav">
        <button class="icon-btn" data-lb-prev aria-label="Previous image"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></button>
        <button class="icon-btn" data-lb-next aria-label="Next image"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg></button>
      </div>`;
    d.body.appendChild(lb);
    lb.inert = true;
    const img = $(".lightbox__img", lb), cap = $(".lightbox__caption", lb), stage = $(".lightbox__stage", lb);
    const btnPrev = $("[data-lb-prev]", lb), btnNext = $("[data-lb-next]", lb), btnZoom = $("[data-lb-zoom]", lb);
    let items = [], idx = 0, z = 1, tx = 0, ty = 0, opener = null;

    const setT = () => {
      img.style.setProperty("--z", z); img.style.setProperty("--tx", tx + "px"); img.style.setProperty("--ty", ty + "px");
      img.classList.toggle("is-zoomed", z > 1);
      btnZoom.setAttribute("aria-label", z > 1 ? "Zoom out" : "Zoom in");
    };
    const show = (i) => {
      idx = (i + items.length) % items.length;
      z = 1; tx = ty = 0; setT();
      img.src = items[idx].src; img.alt = items[idx].alt;
      cap.innerHTML = "";
      cap.textContent = items[idx].alt;
      const s = d.createElement("span");
      s.textContent = `${idx + 1} / ${items.length}`;
      cap.appendChild(s);
      btnPrev.hidden = btnNext.hidden = items.length < 2;
    };
    const open = (group, trigger) => {
      const all = $$(`[data-lightbox="${group}"]`).filter((t) => !t.classList.contains("has-missing"));
      items = all.map((t) => { const im = $("img", t); return { src: im.currentSrc || im.src, alt: im.alt }; });
      if (!items.length) return;
      opener = trigger;
      show(Math.max(0, all.indexOf(trigger)));
      lb.inert = false;
      lb.classList.add("is-open");
      d.body.style.overflow = "hidden";
      $("[data-lb-close]", lb).focus();
    };
    const close = () => {
      lb.classList.remove("is-open");
      lb.inert = true;
      d.body.style.overflow = "";
      opener && opener.focus();
    };
    const zoomAt = (cx, cy) => {
      if (z > 1) { z = 1; tx = ty = 0; }
      else {
        z = 2.4;
        const r = img.getBoundingClientRect();
        tx = (r.left + r.width / 2 - cx) * (z - 1);
        ty = (r.top + r.height / 2 - cy) * (z - 1);
      }
      setT();
    };

    triggers.forEach((t) => t.addEventListener("click", () => open(t.dataset.lightbox, t)));
    $("[data-lb-close]", lb).addEventListener("click", close);
    btnPrev.addEventListener("click", () => show(idx - 1));
    btnNext.addEventListener("click", () => show(idx + 1));
    btnZoom.addEventListener("click", () => { const r = img.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2); });
    stage.addEventListener("click", (e) => { if (e.target === stage) close(); });

    let pan = null, dragged = false;
    img.addEventListener("pointerdown", (e) => {
      dragged = false;
      if (z === 1) return;
      pan = { x: e.clientX, y: e.clientY, tx, ty };
      img.setPointerCapture(e.pointerId);
      img.classList.add("is-panning");
    });
    img.addEventListener("pointermove", (e) => {
      if (!pan) return;
      const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) dragged = true;
      tx = pan.tx + dx; ty = pan.ty + dy; setT();
    });
    const endPan = () => { pan = null; img.classList.remove("is-panning"); };
    img.addEventListener("pointerup", endPan);
    img.addEventListener("pointercancel", endPan);
    img.addEventListener("click", (e) => { if (!dragged) zoomAt(e.clientX, e.clientY); });

    d.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight" && items.length > 1) show(idx + 1);
      if (e.key === "ArrowLeft" && items.length > 1) show(idx - 1);
      if (e.key === "Tab") { // simple focus trap
        const f = $$("button:not([hidden])", lb);
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ------------------------------------------------------------------
     Swatches: click to copy hex
  ------------------------------------------------------------------ */
  let toastEl, toastT;
  function toast(msg, colour) {
    if (!toastEl) {
      toastEl = d.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      d.body.appendChild(toastEl);
    }
    toastEl.innerHTML = (colour ? `<i style="background:${esc(colour)}"></i>` : "") + "<span></span>";
    toastEl.lastChild.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove("is-on"), 1800);
  }
  function initSwatches() {
    $$(".swatch[data-hex]").forEach((s) => {
      s.addEventListener("click", async () => {
        const hex = s.dataset.hex;
        try { await navigator.clipboard.writeText(hex); toast(`Copied ${hex}`, hex); }
        catch (e) { toast(hex, hex); }
      });
    });
  }

  /* ------------------------------------------------------------------
     Small things: UK clock, year
  ------------------------------------------------------------------ */
  function initClock() {
    const els = $$("[data-clock]");
    if (!els.length) return;
    const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
    const tick = () => els.forEach((e) => (e.textContent = fmt.format(new Date())));
    tick(); setInterval(tick, 30000);
    $$("[data-year]").forEach((e) => (e.textContent = new Date().getFullYear()));
  }

  /* ------------------------------------------------------------------
     Boot
  ------------------------------------------------------------------ */
  renderStack();
  initTheme();
  initMenu();
  initCursor();
  initMagnetic();
  initGlow();
  initMemojiCard();
  initHero();
  initAboutHero();
  initWork();
  initGalleries();
  initLightbox();
  initSwatches();
  initReveals();
  initClock();

  sceneStack();
  scenePhilosophy();
  sceneChapters();
  sceneLoop();
  sceneCover();
  sceneProgress();
  sceneSideNav();

  addEventListener("scroll", requestScenes, { passive: true });
  addEventListener("resize", requestScenes);
  runScenes();
})();
