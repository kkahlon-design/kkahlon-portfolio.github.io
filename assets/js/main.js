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
    if (!menuOpen) nav.classList.toggle("is-hidden", y > 320 && y > lastY + 2);
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
  const roll = (label) => `<span class="roll"><span class="roll__in" data-label="${esc(label)}">${esc(label)}</span></span>`;
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
              <div><a class="btn btn--ghost" href="https://www.linkedin.com/in/karun-kahlon-783655301/" target="_blank" rel="noopener noreferrer">${roll("Ask me about it")}<svg class="btn__icon btn__icon--ne" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg></a></div>
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
              <span class="btn btn--accent work-card__cta">${roll("Read case study")}<svg class="btn__icon btn__icon--e" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
            </div>
          </div>
          <div class="work-card__media">${imgTag(p)}</div>
        </a></li>`;
    }).join("");
  }

  function renderProjectList() {
    const host = $("#plist");
    if (!host || !window.PROJECTS) return;
    const live = window.PROJECTS.filter((p) => p.status === "live").length;
    const count = $("#work-count");
    if (count) count.textContent = String(live).padStart(2, "0");
    host.innerHTML = window.PROJECTS.map((p, i) => {
      const soon = p.status === "soon";
      const tag = soon ? "div" : "a";
      const attrs = soon ? "" : ` href="${esc(p.href)}" data-cursor="Open" `;
      const thumb = soon ? `<img src="${esc(p.memoji)}" alt="" loading="lazy">` : imgTag(p);
      return `<li class="prow${soon ? " prow--soon" : ""}" data-index="${i}">
        <${tag} class="prow__link"${attrs}>
          <span class="prow__thumb">${thumb}</span>
          <span class="prow__year">${esc(p.year)}</span>
          <span class="prow__title">${esc(p.title)}</span>
          <span class="prow__desc">${esc(soon ? p.summary : p.client + ". " + p.summary)}</span>
          <span class="prow__go" aria-hidden="true">${soon ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>' : ICON.e}</span>
        </${tag}></li>`;
    }).join("");
  }

  /* Floating preview on the projects list (follows pointer, tilts with velocity) */
  function initFollowPreview() {
    const list = $("#plist");
    if (!list || !fine || reduce) return;
    const box = d.createElement("div");
    box.className = "preview-float";
    box.setAttribute("aria-hidden", "true");
    const imgs = window.PROJECTS.map((p) => {
      const im = d.createElement("img");
      im.className = "preview-float__img" + (p.status === "soon" ? " preview-float__img--soon" : "");
      im.alt = "";
      im.src = p.status === "soon" ? p.memoji : p.cover;
      if (p.coverFallback) im.dataset.fallback = p.coverFallback;
      box.appendChild(im);
      return im;
    });
    d.body.appendChild(box);
    let x = 0, y = 0, tx = 0, ty = 0, rot = 0, raf = 0, on = false;
    const loop = () => {
      const px = x;
      x = lerp(x, tx, 0.14); y = lerp(y, ty, 0.14);
      rot = lerp(rot, clamp((x - px) * 0.5, -10, 10), 0.2);
      box.style.setProperty("--x", x + "px");
      box.style.setProperty("--y", y + "px");
      box.style.setProperty("--rot", rot + "deg");
      raf = on || Math.abs(tx - x) > 0.5 ? requestAnimationFrame(loop) : 0;
    };
    list.addEventListener("pointermove", (e) => {
      tx = e.clientX + 40; ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(loop);
    });
    $$(".prow", list).forEach((row) => {
      row.addEventListener("pointerenter", (e) => {
        if (list.classList.contains("is-grid")) return;
        if (!on) { x = tx = e.clientX + 40; y = ty = e.clientY; }
        on = true;
        const i = +row.dataset.index;
        imgs.forEach((im, k) => im.classList.toggle("is-current", k === i));
        box.classList.add("is-on");
        if (!raf) raf = requestAnimationFrame(loop);
      });
    });
    list.addEventListener("pointerleave", () => { on = false; box.classList.remove("is-on"); });
    addEventListener("scroll", () => { if (on) { on = false; box.classList.remove("is-on"); } }, { passive: true });
  }

  /* List / grid view toggle */
  function initViewToggle() {
    const seg = $("[data-view-toggle]"), list = $("#plist");
    if (!seg || !list) return;
    const btns = $$("button", seg), thumb = $(".seg__thumb", seg);
    const place = () => {
      const on = btns.find((b) => b.getAttribute("aria-pressed") === "true");
      thumb.style.width = on.offsetWidth + "px";
      thumb.style.transform = `translateX(${on.offsetLeft}px)`;
    };
    const set = (view, animate) => {
      const apply = () => {
        list.classList.toggle("is-grid", view === "grid");
        btns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
        place();
      };
      if (animate && d.startViewTransition && !reduce) d.startViewTransition(apply); else apply();
      store.set("kk-view", view);
    };
    btns.forEach((b) => b.addEventListener("click", () => set(b.dataset.view, true)));
    set(store.get("kk-view") || "list", false);
    addEventListener("resize", place);
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
    const dots = $$(".chapters__dots span", sec);
    sec.style.setProperty("--n", chapters.length);
    if (reduce) return;
    scenes.push(() => {
      const p = sectionProgress(sec);
      const pos = p * (chapters.length - 1);
      const ins = chapters.map((c, i) => (i === 0 ? 1 : ease(clamp((pos - (i - 1) - 0.1) / 0.75))));
      chapters.forEach((c, i) => {
        c.style.setProperty("--in", ins[i].toFixed(4));
        c.style.setProperty("--out", (ins[i + 1] || 0).toFixed(4));
        c.style.zIndex = i + 1;
        c.setAttribute("aria-hidden", String(!(ins[i] > 0.5 && (ins[i + 1] || 0) < 0.5)));
      });
      const active = Math.min(chapters.length - 1, Math.round(pos));
      dots.forEach((dot, i) => dot.classList.toggle("is-active", i === active));
    });
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
    const memo = $(".loop__center img", sec);
    let current = -1;
    const setStep = (idx) => {
      if (idx === current) return;
      current = idx;
      steps.forEach((s, i) => s.classList.toggle("is-active", i === idx));
      const src = steps[idx].dataset.memoji;
      if (memo && src && !memo.src.endsWith(src)) {
        memo.classList.add("is-swapping");
        setTimeout(() => { memo.src = src; memo.classList.remove("is-swapping"); }, 160);
      }
    };
    if (reduce) { nodes.forEach((nd) => nd.classList.add("is-done")); prog.style.strokeDashoffset = 0; return; }
    scenes.push(() => {
      const p = sectionProgress(sec);
      const pos = clamp(p * 1.04) * n;
      const idx = Math.min(n - 1, Math.floor(pos));
      prog.style.strokeDashoffset = (C * (1 - clamp(pos / n))).toFixed(1);
      nodes.forEach((nd, i) => { nd.classList.toggle("is-done", i <= idx); nd.classList.toggle("is-active", i === idx); });
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
  renderProjectList();
  initTheme();
  initMenu();
  initCursor();
  initMagnetic();
  initMemojiCard();
  initHero();
  initAboutHero();
  initFollowPreview();
  initViewToggle();
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
