/* =============================================
   KAHLON STUDIOS — script.js
   All shared JavaScript for the portfolio site
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Hamburger / Mobile Menu ── */
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const closeMenuBtn = document.getElementById('closeMenuBtn');
  const menuOverlay  = document.getElementById('menuOverlay');
  const mobileMenu   = document.getElementById('mobileMenu');
  const mobileLinks  = document.querySelectorAll('.mobile-link');

  if (hamburgerBtn && menuOverlay && mobileMenu) {
    const openMenu = () => {
      menuOverlay.classList.add('is-open');
      mobileMenu.classList.add('is-open');
      hamburgerBtn.classList.add('is-open');
      menuOverlay.setAttribute('aria-hidden', 'false');
      hamburgerBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    };

    const closeMenu = () => {
      menuOverlay.classList.remove('is-open');
      mobileMenu.classList.remove('is-open');
      hamburgerBtn.classList.remove('is-open');
      menuOverlay.setAttribute('aria-hidden', 'true');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };

    hamburgerBtn.addEventListener('click', openMenu);
    closeMenuBtn?.addEventListener('click', closeMenu);
    menuOverlay.addEventListener('click', (e) => { if (e.target === menuOverlay) closeMenu(); });
    mobileLinks.forEach((link) => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  }

  /* ── Orbit ring — fill circumference precisely ── */
  const orbitTextPath = document.getElementById('orbitTextPath');
  if (orbitTextPath) {
    const phrase = 'UX Designer · Problem Solver · Driven by Purpose · Gamer · ';
    const radius = 155;
    const circumference = 2 * Math.PI * radius;
    orbitTextPath.textContent = phrase;
    const phraseLength = orbitTextPath.getComputedTextLength();
    if (phraseLength > 0) {
      const repeats = Math.ceil(circumference / phraseLength);
      orbitTextPath.textContent = phrase.repeat(repeats);
    }
  }

  /* ── Landing reveal: greeting + h1 word-by-word ── */
  const greeting = document.querySelector('.landing-greeting');
  const h1 = document.querySelector('.landing-h1');

  if (greeting) {
    setTimeout(() => greeting.classList.add('visible'), 150);
  }

  if (h1) {
    h1.innerHTML = h1.innerHTML
      .split('<br>')
      .map(line =>
        line.trim().split(/\s+/).filter(Boolean)
          .map(w => `<span class="word">${w}</span>`).join(' ')
      )
      .join('<br>');
    h1.querySelectorAll('.word').forEach((word, i) => {
      setTimeout(() => word.classList.add('visible'), 250 + i * 90);
    });
  }

  /* ── Scroll Reveal ── */
  const revealEls = document.querySelectorAll(
    '.design-philosophy-title, .about-title, .project-section-title, .project-preview, .dp-band'
  );

  // Set initial state for project-section-title (inline so it overrides CSS)
  document.querySelectorAll('.project-section-title').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(12px)';
    el.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
  });

  if (revealEls.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;

        if (el.classList.contains('dp-band')) {
          const siblings = [...el.parentElement.querySelectorAll('.dp-band')];
          const delay = siblings.indexOf(el) * 150;
          setTimeout(() => el.classList.add('is-visible'), delay);
        } else if (el.classList.contains('project-preview')) {
          const siblings = [...el.parentElement.querySelectorAll('.project-preview')];
          const delay = siblings.indexOf(el) * 120;
          setTimeout(() => el.classList.add('is-visible'), delay);
        } else if (el.classList.contains('project-section-title')) {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        } else {
          el.classList.add('is-visible');
        }

        observer.unobserve(el);
      });
    }, { threshold: 0.2 });

    revealEls.forEach(el => observer.observe(el));
  }

  /* ── Project Side Menu — Active Section Tracking ── */
  const sideLinks = document.querySelectorAll('.project-side-link');

  if (sideLinks.length > 0) {
    const sectionElements = [...sideLinks]
      .map(link => {
        const id = link.getAttribute('href')?.replace('#', '');
        return { element: document.getElementById(id), link };
      })
      .filter(s => s.element && s.link);

    const setActiveLink = (activeLink) => {
      sideLinks.forEach(link => link.classList.remove('is-active'));
      if (activeLink) activeLink.classList.add('is-active');
    };

    // Click sets active immediately
    sideLinks.forEach(link => link.addEventListener('click', () => setActiveLink(link)));

    // Use IntersectionObserver so active state matches scroll position
    // regardless of section height — much more reliable than getBoundingClientRect
    let lastActive = sectionElements[0]?.link;

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const match = sectionElements.find(s => s.element === entry.target);
          if (match) {
            lastActive = match.link;
            setActiveLink(match.link);
          }
        }
      });
    }, {
      // Trigger when section top crosses the upper third of the viewport
      rootMargin: '-10% 0px -60% 0px',
      threshold: 0
    });

    sectionElements.forEach(s => sectionObserver.observe(s.element));

    // Set first section active on load
    if (sectionElements[0]) setActiveLink(sectionElements[0].link);
  }

  /* ── Project Page Carousel (sfd-project etc) ── */
  document.querySelectorAll('.carousel').forEach((carousel) => {
    const track         = carousel.querySelector('.carousel-track');
    const slides        = carousel.querySelectorAll('.carousel-slide');
    const dotsContainer = carousel.querySelector('.carousel-dots');
    const prevBtn       = carousel.querySelector('.carousel-btn--prev');
    const nextBtn       = carousel.querySelector('.carousel-btn--next');
    const total         = slides.length;
    let current         = 0;

    if (!track || !total) return;

    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'carousel-dot' + (i === 0 ? ' is-active' : '');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', 'Slide ' + (i + 1));
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    });

    const goToSlide = (index) => {
      current = index;
      track.style.transform = `translateX(-${current * 100}%)`;
      carousel.querySelectorAll('.carousel-dot').forEach((d, i) => {
        d.classList.toggle('is-active', i === current);
      });
      if (prevBtn) prevBtn.disabled = current === 0;
      if (nextBtn) nextBtn.disabled = current === total - 1;
    };

    if (prevBtn) prevBtn.addEventListener('click', () => { if (current > 0) goToSlide(current - 1); });
    if (nextBtn) nextBtn.addEventListener('click', () => { if (current < total - 1) goToSlide(current + 1); });

    carousel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') goToSlide(Math.max(0, current - 1));
      if (e.key === 'ArrowRight') goToSlide(Math.min(total - 1, current + 1));
    });

    let touchStartX = 0;
    track.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', (e) => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) {
        if (diff > 0 && current < total - 1) goToSlide(current + 1);
        if (diff < 0 && current > 0)         goToSlide(current - 1);
      }
    }, { passive: true });

    goToSlide(0);
  });

  /* ── About Carousel — drag/swipe ── */
  const aboutCarousel = document.getElementById('aboutCarousel');
  const aboutTrack    = document.getElementById('aboutTrack');
  const aboutDotsWrap = document.getElementById('aboutDots');

  if (aboutCarousel && aboutTrack) {
    const cards     = [...aboutTrack.querySelectorAll('.about-card')];
    const total     = cards.length;
    let current     = 0;
    let startX      = 0;
    let currentX    = 0;
    let isDragging  = false;
    let trackOffset = 0;

    const isMobile = () => window.innerWidth <= 900;

    const buildControls = () => {
      aboutDotsWrap.innerHTML = '';
      if (isMobile()) {
        const prev = document.createElement('button');
        prev.className = 'about-dot';
        prev.setAttribute('aria-label', 'Previous card');
        prev.innerHTML = '&#8249;';
        prev.addEventListener('click', () => goTo(current - 1));

        const counter = document.createElement('span');
        counter.className = 'about-dot-counter';
        counter.textContent = `1 / ${total}`;

        const next = document.createElement('button');
        next.className = 'about-dot';
        next.setAttribute('aria-label', 'Next card');
        next.innerHTML = '&#8250;';
        next.addEventListener('click', () => goTo(current + 1));

        aboutDotsWrap.append(prev, counter, next);
      } else {
        cards.forEach((_, i) => {
          const dot = document.createElement('button');
          dot.className = 'about-dot' + (i === 0 ? ' is-active' : '');
          dot.setAttribute('aria-label', `Card ${i + 1}`);
          dot.addEventListener('click', () => goTo(i));
          aboutDotsWrap.appendChild(dot);
        });
      }
    };

    const getDots = () => [...aboutDotsWrap.querySelectorAll('.about-dot')];

    const updateControls = () => {
      if (isMobile()) {
        const counter = aboutDotsWrap.querySelector('.about-dot-counter');
        if (counter) counter.textContent = `${current + 1} / ${total}`;
        const btns = aboutDotsWrap.querySelectorAll('.about-dot');
        if (btns[0]) btns[0].style.opacity = current === 0 ? '0.3' : '1';
        if (btns[1]) btns[1].style.opacity = current === total - 1 ? '0.3' : '1';
      } else {
        getDots().forEach((d, i) => d.classList.toggle('is-active', i === current));
      }
    };

    const getCardWidth = () => {
      const style = window.getComputedStyle(aboutTrack);
      const gap = parseInt(style.gap) || 20;
      return cards[0].getBoundingClientRect().width + gap;
    };

    // Returns true when all cards fit within the carousel viewport
    const allCardsVisible = () => {
      const carouselWidth = aboutCarousel.getBoundingClientRect().width;
      const totalCardsWidth = cards.reduce((sum, card) => {
        return sum + card.getBoundingClientRect().width;
      }, 0) + (cards.length - 1) * (parseInt(window.getComputedStyle(aboutTrack).gap) || 20);
      return totalCardsWidth <= carouselWidth + 4; // 4px tolerance
    };

    const setCarouselActive = (active) => {
      aboutCarousel.style.cursor = active ? 'grab' : 'default';
      aboutDotsWrap.style.display = active ? 'flex' : 'none';
      if (!active) {
        aboutTrack.style.transform = 'translateX(0)';
        trackOffset = 0;
        current = 0;
      }
      buildControls();
      updateControls();
    };

    const goTo = (index) => {
      if (allCardsVisible()) return;
      current = Math.max(0, Math.min(index, total - 1));
      trackOffset = -(current * getCardWidth());
      aboutTrack.style.transform = `translateX(${trackOffset}px)`;
      updateControls();
    };

    // Mouse drag
    aboutCarousel.addEventListener('mousedown', (e) => {
      if (allCardsVisible()) return;
      isDragging = true;
      startX = e.clientX;
      aboutCarousel.classList.add('is-dragging');
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      currentX = e.clientX - startX;
      aboutTrack.style.transform = `translateX(${trackOffset + currentX}px)`;
    });

    window.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      aboutCarousel.classList.remove('is-dragging');
      if (currentX < -60)     goTo(current + 1);
      else if (currentX > 60) goTo(current - 1);
      else                    goTo(current);
      currentX = 0;
    });

    // Touch swipe
    aboutCarousel.addEventListener('touchstart', (e) => {
      if (allCardsVisible()) return;
      startX = e.touches[0].clientX;
    }, { passive: true });

    aboutCarousel.addEventListener('touchend', (e) => {
      if (allCardsVisible()) return;
      const diff = startX - e.changedTouches[0].clientX;
      if (diff > 50)       goTo(current + 1);
      else if (diff < -50) goTo(current - 1);
    }, { passive: true });

    // Re-evaluate on resize
    const handleResize = () => {
      const wasAllVisible = allCardsVisible();
      setCarouselActive(!wasAllVisible);
      if (wasAllVisible) {
        aboutTrack.style.transform = 'translateX(0)';
      }
      buildControls();
      updateControls();
    };

    window.addEventListener('resize', handleResize);

    // Reveal cards on scroll into view
    const carouselObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        cards.forEach((card, i) => {
          setTimeout(() => card.classList.add('is-visible'), 100 + i * 80);
        });
        carouselObserver.disconnect();
      });
    }, { threshold: 0.1 });

    carouselObserver.observe(aboutCarousel);

    // Initialise
    buildControls();
    goTo(0);
    updateControls();
    // Slight delay to let layout settle before measuring
    setTimeout(() => setCarouselActive(!allCardsVisible()), 50);
  }

});
