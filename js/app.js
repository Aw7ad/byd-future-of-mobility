/* ============================================================
   BYD — BUILDING THE FUTURE OF MOBILITY
   Vanilla JS. No dependencies.
   Modules: intro, particles, parallax, reveal, counters,
   navigation, tabs, org chart, DRIVE method, KPI dashboard.
   ============================================================ */
(function () {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const state = {
    started: false,
    activeIndex: 0,
    introDone: false,
    revealedDashboard: false,
  };

  /* ------------------------------------------------------------
     INTRO
     ------------------------------------------------------------ */
  const intro = $("#intro");
  const introBar = $("#introBar");
  const introSkip = $("#introSkip");
  let introTimer = null;
  let introBarTimer = null;

  function introSeen() {
    try { return sessionStorage.getItem("byd:intro") === "1"; } catch (e) { return false; }
  }
  function markIntroSeen() {
    try { sessionStorage.setItem("byd:intro", "1"); } catch (e) { /* private mode */ }
  }

  function finishIntro(instant) {
    if (state.introDone) return;
    state.introDone = true;
    if (introTimer) clearTimeout(introTimer);
    if (introBarTimer) clearInterval(introBarTimer);
    markIntroSeen();

    document.body.classList.remove("is-loading");
    document.body.classList.add("is-ready");
    startExperience();

    if (!intro) return;
    intro.classList.add("is-done");
    intro.setAttribute("aria-hidden", "true");
    const delay = instant || reduceMotion ? 0 : 900;
    setTimeout(() => {
      if (intro) intro.style.display = "none";
      if (introField) introField.stop();
    }, delay);
  }

  function beginIntro() {
    if (!intro) { finishIntro(true); return; }
    if (reduceMotion || introSeen()) { finishIntro(true); return; }

    // progress
    if (introBar) {
      introBar.style.transition = "width 1.9s cubic-bezier(.4,0,.2,1)";
      requestAnimationFrame(() => { introBar.style.width = "100%"; });
    }
    introTimer = setTimeout(() => finishIntro(false), 2350);

    if (introSkip) introSkip.addEventListener("click", () => finishIntro(false));
    document.addEventListener("keydown", (e) => {
      if (!state.introDone && (e.key === "Enter" || e.key === " " || e.key === "Escape")) {
        e.preventDefault();
        finishIntro(false);
      }
    }, { once: true });
  }

  /* ------------------------------------------------------------
     PARTICLE FIELD
     ------------------------------------------------------------ */
  class ParticleField {
    constructor(canvas, opts) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.opts = Object.assign({
        density: 16000,
        max: 90,
        min: 26,
        speed: 0.16,
        links: true,
        linkDistance: 120,
        mouse: false,
        redRatio: 0.28,
        alpha: 1,
      }, opts || {});
      this.particles = [];
      this.raf = null;
      this.running = false;
      this.visible = true;
      this.mouse = { x: -9999, y: -9999 };
      this.resize = this.resize.bind(this);
      this.tick = this.tick.bind(this);
      window.addEventListener("resize", this.resize, { passive: true });
      this.resize();
      if (!reduceMotion) this.start();
      else this.drawStatic();
      if (this.opts.mouse) {
        window.addEventListener("pointermove", (e) => {
          const rect = this.canvas.getBoundingClientRect();
          this.mouse.x = e.clientX - rect.left;
          this.mouse.y = e.clientY - rect.top;
        }, { passive: true });
      }
    }

    resize() {
      if (!this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = Math.max(1, rect.width);
      this.h = Math.max(1, rect.height);
      this.canvas.width = Math.round(this.w * dpr);
      this.canvas.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = clamp(Math.round((this.w * this.h) / this.opts.density), this.opts.min, this.opts.max);
      this.particles = Array.from({ length: count }, () => this.spawn());
      if (reduceMotion) this.drawStatic();
    }

    spawn() {
      const red = Math.random() < this.opts.redRatio;
      return {
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        vx: (Math.random() - 0.5) * this.opts.speed * 2,
        vy: (Math.random() - 0.5) * this.opts.speed * 2,
        r: Math.random() * 1.4 + 0.4,
        a: Math.random() * 0.5 + 0.15,
        red,
        pulse: Math.random() * Math.PI * 2,
      };
    }

    drawStatic() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);
      for (const p of this.particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.red ? `rgba(255,70,80,${p.a})` : `rgba(255,255,255,${p.a * 0.65})`;
        ctx.fill();
      }
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.raf = requestAnimationFrame(this.tick);
    }

    stop() {
      this.running = false;
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
    }

    tick(t) {
      if (!this.running) return;
      this.raf = requestAnimationFrame(this.tick);
      if (!this.visible || document.hidden) return;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);

      for (const p of this.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.01;

        if (p.x < -10) p.x = this.w + 10;
        if (p.x > this.w + 10) p.x = -10;
        if (p.y < -10) p.y = this.h + 10;
        if (p.y > this.h + 10) p.y = -10;

        if (this.opts.mouse) {
          const dx = p.x - this.mouse.x;
          const dy = p.y - this.mouse.y;
          const d = Math.hypot(dx, dy);
          if (d < 120 && d > 0.01) {
            const force = (120 - d) / 120;
            p.x += (dx / d) * force * 1.4;
            p.y += (dy / d) * force * 1.4;
          }
        }

        const alpha = p.a * (0.75 + Math.sin(p.pulse) * 0.25) * this.opts.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.red
          ? `rgba(255,62,74,${alpha})`
          : `rgba(255,255,255,${alpha * 0.7})`;
        ctx.fill();
      }

      if (this.opts.links) {
        const maxD = this.opts.linkDistance;
        for (let i = 0; i < this.particles.length; i++) {
          for (let j = i + 1; j < this.particles.length; j++) {
            const a = this.particles[i];
            const b = this.particles[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const d = Math.hypot(dx, dy);
            if (d < maxD) {
              const alpha = (1 - d / maxD) * 0.1 * this.opts.alpha;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.strokeStyle = a.red || b.red
                ? `rgba(230,0,18,${alpha * 1.5})`
                : `rgba(255,255,255,${alpha})`;
              ctx.lineWidth = 0.7;
              ctx.stroke();
            }
          }
        }
      }
    }
  }

  let introField = null;
  let heroField = null;

  function initParticles() {
    const introCanvas = $("#introCanvas");
    const heroCanvas = $("#heroCanvas");
    if (introCanvas && !introField) {
      introField = new ParticleField(introCanvas, {
        density: 13000, max: 85, min: 30, speed: 0.22,
        links: true, linkDistance: 135, redRatio: 0.34,
      });
    }
    if (heroCanvas && !heroField) {
      heroField = new ParticleField(heroCanvas, {
        density: 20000, max: 70, min: 22, speed: 0.1,
        links: true, linkDistance: 105, mouse: isFinePointer, redRatio: 0.24,
      });
      window.HeroField = heroField;
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver((entries) => {
          heroField.visible = entries[0].isIntersecting;
        }, { threshold: 0 });
        io.observe(heroCanvas);
      }
    }
  }

  /* ------------------------------------------------------------
     REVEALS
     ------------------------------------------------------------ */
  function prepareStagger() {
    $$("[data-stagger]").forEach((group) => {
      $$("[data-reveal]", group).forEach((el, i) => {
        el.style.setProperty("--d", `${Math.min(i * 70, 420)}ms`);
      });
    });
  }

  function startReveals() {
    if (!("IntersectionObserver" in window)) {
      $$("[data-reveal]").forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    $$("[data-reveal]").forEach((el) => {
      if (reduceMotion) { el.classList.add("is-in"); return; }
      io.observe(el);
    });
  }

  /* ------------------------------------------------------------
     COUNTERS
     ------------------------------------------------------------ */
  function animateCounter(el) {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    if (!isFinite(target)) return;
    const format = (v) => v.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    if (reduceMotion) { el.textContent = format(target); return; }
    const duration = 1600;
    const start = performance.now();
    function frame(now) {
      const p = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = format(target * eased);
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = format(target);
    }
    el.textContent = format(0);
    requestAnimationFrame(frame);
  }

  function initCounters() {
    const counters = $$("[data-count]");
    if (!("IntersectionObserver" in window)) {
      counters.forEach(animateCounter);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------
     PARALLAX
     ------------------------------------------------------------ */
  function initParallax() {
    if (reduceMotion) return;
    const items = $$("[data-parallax]");
    if (!items.length) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      if (window.innerWidth < 981) {
        items.forEach((el) => { el.style.transform = ""; });
        return;
      }
      items.forEach((el) => {
        const factor = parseFloat(el.dataset.parallax) || 0.06;
        el.style.transform = `translate3d(0, ${Math.min(y * factor, 110)}px, 0)`;
      });
    };
    window.addEventListener("scroll", () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ------------------------------------------------------------
     NAVIGATION / RAIL / PAGER
     ------------------------------------------------------------ */
  const nav = $("#siteNav");
  const navToggle = $("#navToggle");
  const navMenu = $("#navMenu");
  const railItems = $("#railItems");
  const railFill = $("#railFill");
  const railPct = $("#railPct");
  const scrollBar = $("#scrollBar");
  const pagerPrev = $("#pagerPrev");
  const pagerNext = $("#pagerNext");
  const pagerIndex = $("#pagerIndex");
  const pagerTotal = $("#pagerTotal");
  const pagerLabel = $("#pagerLabel");
  const pagerBar = $("#pagerBar");

  const navLinks = $$(".nav__links a[data-nav]");
  const sections = navLinks.map((a) => ({
    id: a.dataset.nav,
    label: ($(".nav__label", a) || a).textContent.trim(),
    el: document.getElementById(a.dataset.nav),
  })).filter((s) => s.el);

  let sectionTops = [];

  function measureSections() {
    sectionTops = sections.map((s) => s.el.getBoundingClientRect().top + window.scrollY);
  }

  function scrollToSection(index) {
    const s = sections[clamp(index, 0, sections.length - 1)];
    if (!s) return;
    if (s.id === "home") {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    } else {
      s.el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }
    try { history.replaceState(null, "", "#" + s.id); } catch (e) { /* file:// */ }
  }

  function currentIndex() {
    if (!sectionTops.length) return 0;
    const y = window.scrollY + window.innerHeight * 0.34;
    let idx = 0;
    for (let i = 0; i < sectionTops.length; i++) {
      if (sectionTops[i] <= y) idx = i;
    }
    const bottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    if (bottom) idx = sections.length - 1;
    return idx;
  }

  function buildRail() {
    if (!railItems) return;
    railItems.innerHTML = "";
    sections.forEach((s, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "rail__dot";
      b.dataset.label = s.label;
      b.setAttribute("aria-label", `Go to ${s.label}`);
      b.addEventListener("click", () => scrollToSection(i));
      railItems.appendChild(b);
    });
  }

  function updateNavigation() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const progress = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;

    if (scrollBar) scrollBar.style.width = (progress * 100).toFixed(2) + "%";
    if (railFill) railFill.style.height = (progress * 100).toFixed(2) + "%";
    if (railPct) railPct.textContent = String(Math.round(progress * 100)).padStart(2, "0");

    const idx = currentIndex();
    state.activeIndex = idx;

    navLinks.forEach((a, i) => {
      a.classList.toggle("is-active", i === idx);
      if (i === idx) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    $$("#navMenu a").forEach((a, i) => {
      a.classList.toggle("is-active", i === idx);
    });
    if (railItems) {
      $$(".rail__dot", railItems).forEach((d, i) => {
        d.classList.toggle("is-active", i === idx);
        if (i === idx) d.setAttribute("aria-current", "true");
        else d.removeAttribute("aria-current");
      });
    }

    if (pagerIndex) pagerIndex.textContent = String(idx).padStart(2, "0");
    if (pagerTotal) pagerTotal.textContent = String(sections.length - 1).padStart(2, "0");
    if (pagerLabel) pagerLabel.textContent = sections[idx] ? sections[idx].label : "";
    if (pagerPrev) pagerPrev.disabled = idx === 0;
    if (pagerNext) pagerNext.disabled = idx === sections.length - 1;

    if (pagerBar && sections[idx]) {
      const top = sectionTops[idx] || 0;
      const next = sectionTops[idx + 1] || (top + window.innerHeight);
      const denom = Math.max(next - top, 1);
      const p = clamp((window.scrollY - top + window.innerHeight * 0.3) / denom, 0, 1);
      pagerBar.style.width = (idx === sections.length - 1 ? 100 : p * 100).toFixed(1) + "%";
    }

    if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 18);
  }

  function initScrollListeners() {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        updateNavigation();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
      measureSections();
      onScroll();
      if (window.innerWidth > 980) closeMenu();
    }, { passive: true });
    // update after fonts/images settle
    window.addEventListener("load", () => {
      measureSections();
      updateNavigation();
    });
    setTimeout(() => { measureSections(); updateNavigation(); }, 600);
  }

  function openMenu() {
    if (!navMenu || !navToggle) return;
    nav.classList.add("is-open");
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "Close menu");
    navMenu.removeAttribute("inert");
    const available = Math.max(320, window.innerHeight - (nav ? nav.offsetHeight : 68));
    navMenu.style.height = Math.max(available, navMenu.scrollHeight) + "px";
    document.body.classList.add("is-menu-open");
  }
  function closeMenu() {
    if (!navMenu || !navToggle) return;
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
    navMenu.style.height = "0px";
    navMenu.setAttribute("inert", "");
    document.body.classList.remove("is-menu-open");
  }
  function initMenu() {
    if (!navToggle || !navMenu) return;
    if (window.innerWidth <= 980) navMenu.setAttribute("inert", "");
    navToggle.addEventListener("click", () => {
      if (navToggle.getAttribute("aria-expanded") === "true") closeMenu();
      else openMenu();
    });
    $$("a", navMenu).forEach((a) => a.addEventListener("click", () => closeMenu()));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") {
        closeMenu();
        navToggle.focus();
      }
    });
  }

  function initPager() {
    if (pagerPrev) pagerPrev.addEventListener("click", () => scrollToSection(state.activeIndex - 1));
    if (pagerNext) pagerNext.addEventListener("click", () => scrollToSection(state.activeIndex + 1));
    document.addEventListener("keydown", (e) => {
      if (!e.altKey) return;
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === "ArrowRight") { e.preventDefault(); scrollToSection(state.activeIndex + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); scrollToSection(state.activeIndex - 1); }
    });
  }

  function initHashLinks() {
    $$('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        const id = link.getAttribute("href");
        if (!id || id === "#") return;
        const target = document.getElementById(id.slice(1));
        if (!target) return;
        e.preventDefault();
        if (id === "#home") {
          window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
        } else {
          target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        }
        try { history.replaceState(null, "", id); } catch (err) { /* file:// */ }
        closeMenu();
      });
    });
  }

  function initNavigation() {
    buildRail();
    initMenu();
    initPager();
    initScrollListeners();
    initHashLinks();
    measureSections();
    updateNavigation();
  }

  /* ------------------------------------------------------------
     GENERIC TABS (resources)
     ------------------------------------------------------------ */
  function initTabs() {
    $$("[data-tabs]").forEach((root) => {
      const tabs = $$('[role="tab"]', root);
      const panels = $$('[role="tabpanel"]', root);
      if (!tabs.length) return;

      const select = (tab, focus) => {
        tabs.forEach((t) => {
          const active = t === tab;
          t.classList.toggle("is-active", active);
          t.setAttribute("aria-selected", active ? "true" : "false");
          t.tabIndex = active ? 0 : -1;
        });
        panels.forEach((p) => {
          const active = p.id === tab.getAttribute("aria-controls");
          p.hidden = !active;
          p.classList.toggle("is-active", active);
        });
        if (focus) tab.focus();
      };

      tabs.forEach((tab) => tab.addEventListener("click", () => select(tab, false)));
      root.addEventListener("keydown", (e) => {
        const i = tabs.indexOf(document.activeElement);
        if (i === -1) return;
        let next = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % tabs.length;
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + tabs.length) % tabs.length;
        if (e.key === "Home") next = 0;
        if (e.key === "End") next = tabs.length - 1;
        if (next !== null) {
          e.preventDefault();
          select(tabs[next], true);
        }
      });
    });
  }

  /* ------------------------------------------------------------
     ORG CHART
     ------------------------------------------------------------ */
  const ORG = {
    rnd: {
      title: "Technical & R&D",
      icon: "#i-cpu",
      teams: "3 teams",
      mission: "Adapt BYD's electric platforms and battery systems to each target market, and feed local insight back into the global innovation pipeline.",
      duties: [
        "Homologate vehicles against local safety, emissions and charging standards",
        "Engineer thermal and range performance for local climates",
        "Localize software, connectivity and driver-assistance features",
        "Run rapid pilots with local partners and customers",
        "Protect quality with design reviews and validation gates",
      ],
      deliverables: ["Market-ready technical dossier", "Localized model specifications", "Innovation pilot results"],
    },
    production: {
      title: "Production",
      icon: "#i-factory",
      teams: "3 teams",
      mission: "Deliver the right vehicles, at the right cost and quality, through an efficient and resilient international supply chain.",
      duties: [
        "Plan production volumes against market demand",
        "Operate quality control and traceability standards",
        "Coordinate inbound components and finished-vehicle logistics",
        "Evaluate local assembly as volumes grow",
        "Manage supplier risk and continuity plans",
      ],
      deliverables: ["Production and capacity plan", "Quality and audit reports", "Supply chain risk map"],
    },
    marketing: {
      title: "Marketing & Sales",
      icon: "#i-chart",
      teams: "3 teams",
      mission: "Build a trusted premium brand in each market and convert interest into sales and long-term customer relationships.",
      duties: [
        "Position the brand and adapt the message to local culture",
        "Build dealer, online and fleet sales channels",
        "Plan campaigns and measure brand awareness",
        "Operate the customer journey from test drive to delivery",
        "Capture feedback and resolve customer issues",
      ],
      deliverables: ["Market launch plan", "Sales pipeline forecast", "Customer satisfaction report"],
    },
    finance: {
      title: "Finance",
      icon: "#i-wallet",
      teams: "2 teams",
      mission: "Keep the expansion financially disciplined: fund what creates value, control risk and make trade-offs visible.",
      duties: [
        "Build and monitor the project budget",
        "Appraise market business cases and investment gates",
        "Manage currency, tariff and working-capital exposure",
        "Report variance and forecast cash needs",
        "Ensure transfer-pricing and financial compliance",
      ],
      deliverables: ["Approved budget", "Monthly variance report", "Investment gate business cases"],
    },
    hr: {
      title: "Human Resources",
      icon: "#i-users",
      teams: "2 teams",
      mission: "Attract, develop and retain the mix of local talent and BYD expertise the project needs to execute.",
      duties: [
        "Recruit local sales, service and regulatory talent",
        "Deploy experienced engineers and managers on assignment",
        "Design onboarding and cross-cultural training",
        "Maintain fair performance and reward practices",
        "Support mobility, wellbeing and retention",
      ],
      deliverables: ["Staffing plan by market", "Training curriculum", "Retention and engagement metrics"],
    },
  };

  function initOrgChart() {
    const grid = $("#orgGrid");
    if (!grid) return;
    const detail = $("#deptDetail");
    const empty = $(".org__detail-empty", detail);
    const body = $(".org__detail-body", detail);
    const titleEl = $("#deptTitle");
    const levelEl = $("#deptLevel");
    const countEl = $("#deptTeamCount");
    const iconWrap = $(".org__detail-icon", detail);
    const missionEl = $("#deptMission");
    const dutiesEl = $("#deptDuties");
    const delivEl = $("#deptDeliverables");

    const buttons = $$(".dept", grid);
    let active = null;

    const close = () => {
      active = null;
      buttons.forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-expanded", "false");
      });
      body.hidden = true;
      empty.style.display = "";
    };

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.dept;
        const data = ORG[key];
        if (!data) return;

        if (active === key) { close(); return; }
        active = key;

        buttons.forEach((b) => {
          const isActive = b === btn;
          b.classList.toggle("is-active", isActive);
          b.setAttribute("aria-expanded", isActive ? "true" : "false");
        });

        empty.style.display = "none";
        body.hidden = false;
        titleEl.textContent = data.title;
        levelEl.textContent = "Level 1 · Department";
        countEl.textContent = data.teams;
        missionEl.textContent = data.mission;
        iconWrap.innerHTML = '<svg class="ico"><use href="' + data.icon + '"/></svg>';

        dutiesEl.innerHTML = "";
        data.duties.forEach((d) => {
          const li = document.createElement("li");
          li.textContent = d;
          dutiesEl.appendChild(li);
        });
        delivEl.innerHTML = "";
        data.deliverables.forEach((d) => {
          const li = document.createElement("li");
          li.textContent = d;
          delivEl.appendChild(li);
        });

        if (window.innerWidth < 760) {
          setTimeout(() => detail.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" }), 120);
        }
      });
    });
  }

  /* ------------------------------------------------------------
     DRIVE METHOD
     ------------------------------------------------------------ */
  const DRIVE = {
    d: {
      name: "Direction",
      desc: "Define clear objectives and communicate the project's vision until every team can explain what success looks like, why it matters and how their work contributes to it. Direction replaces ambiguity with a shared destination.",
      apply: [
        "A three-year vision translated into market-level objectives and team OKRs",
        "One page of strategic priorities visible in every regional office",
        "Quarterly all-hands to reconnect daily work with the mission",
      ],
    },
    r: {
      name: "Responsibility",
      desc: "Give every department clear responsibilities and accountability. Each market launch has one accountable owner, decision rights are explicit, and hand-offs between departments are designed rather than assumed.",
      apply: [
        "A RACI matrix for every milestone and market launch",
        "Single accountable owner for each market, supported by a cross-functional squad",
        "Decision log recording what was decided, by whom and when it will be reviewed",
      ],
    },
    i: {
      name: "Innovation",
      desc: "Encourage creativity, technological improvement and new ideas. Innovation is treated as a managed process — with time, budget and a route to decision — rather than an occasional inspiration.",
      apply: [
        "A local adaptation funnel for product, service and charging ideas",
        "Pilot budget reserved for the three strongest market proposals each quarter",
        "Innovation reviews with R&D, marketing and production in the same room",
      ],
    },
    v: {
      name: "Vision & Values",
      desc: "Promote sustainability, teamwork and long-term thinking. The values guide trade-offs when short-term sales pressure conflicts with safety, integrity or the company's environmental commitments.",
      apply: [
        "Sustainability and safety criteria embedded in supplier and partner selection",
        "Team incentives balanced between market growth and customer outcomes",
        "Long-term investment cases that show environmental and social impact",
      ],
    },
    e: {
      name: "Evaluation",
      desc: "Provide regular feedback and recognize team performance. Evaluation is developmental first and judgmental second: people learn what good looks like, then are recognized for delivering it.",
      apply: [
        "Weekly check-ins, monthly performance reviews and 360° feedback",
        "Recognition for teams that solve cross-market problems, not only for sales results",
        "A development plan for every project manager, reviewed twice a year",
      ],
    },
  };
  const DRIVE_KEYS = ["d", "r", "i", "v", "e"];

  function initDrive() {
    const tabs = $$(".drive-letter");
    if (!tabs.length) return;
    const panel = $("#drive-panel");
    const letterEl = $("#driveBigLetter");
    const indexEl = $("#driveIndex");
    const headingEl = $("#driveHeading");
    const descEl = $("#driveDesc");
    const applyEl = $("#driveApply");
    const dots = $("#driveDots");
    const connector = $(".drive__connector");

    if (dots) {
      dots.innerHTML = "";
      DRIVE_KEYS.forEach(() => {
        const s = document.createElement("span");
        dots.appendChild(s);
      });
    }

    const select = (key, focus) => {
      const data = DRIVE[key];
      if (!data) return;
      const idx = DRIVE_KEYS.indexOf(key);
      tabs.forEach((t) => {
        const active = t.dataset.drive === key;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
        t.tabIndex = active ? 0 : -1;
      });
      if (panel) panel.setAttribute("aria-labelledby", "drive-tab-" + key);
      letterEl.textContent = key.toUpperCase();
      indexEl.textContent = `Principle ${String(idx + 1).padStart(2, "0")} of 05`;
      headingEl.textContent = data.name;
      descEl.textContent = data.desc;
      applyEl.innerHTML = "";
      data.apply.forEach((a) => {
        const li = document.createElement("li");
        li.textContent = a;
        applyEl.appendChild(li);
      });
      if (dots) {
        $$("span", dots).forEach((d, i) => d.classList.toggle("is-active", i === idx));
      }
      if (connector) connector.style.width = ((idx + 1) / DRIVE_KEYS.length) * 100 + "%";
      if (focus) tabs[idx].focus();
    };

    tabs.forEach((tab) => tab.addEventListener("click", () => select(tab.dataset.drive, false)));
    const tablist = $(".drive__selector");
    tablist.addEventListener("keydown", (e) => {
      const i = tabs.indexOf(document.activeElement);
      if (i === -1) return;
      let next = null;
      if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
      if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
      if (e.key === "Home") next = 0;
      if (e.key === "End") next = tabs.length - 1;
      if (next !== null) {
        e.preventDefault();
        select(DRIVE_KEYS[next], true);
      }
    });

    select("d", false);
  }

  /* ------------------------------------------------------------
     KPI DASHBOARD
     ------------------------------------------------------------ */
  function initKpis() {
    const grid = $("#kpiGrid");
    if (!grid) return;
    const cards = $$(".kpi", grid);
    const resetBtn = $("#resetKpi");
    const healthRing = $("#healthRing");
    const healthValue = $("#healthValue");
    const healthLabel = $("#healthLabel");
    const countGood = $("#countGood");
    const countWatch = $("#countWatch");
    const countRisk = $("#countRisk");
    const ringLength = 2 * Math.PI * 66;

    const defaults = cards.map((card) => ({
      target: parseFloat(card.dataset.target),
    }));

    function readCard(card) {
      return {
        actual: parseFloat(card.dataset.actual),
        target: parseFloat(card.querySelector("input").value),
        unit: card.dataset.unit || "",
        mode: card.dataset.mode || "up",
      };
    }

    function setStatus(card, level) {
      card.classList.remove("is-good", "is-watch", "is-risk");
      card.classList.add("is-" + level);
      const label = card.querySelector(".kpi__status");
      if (label) label.textContent = level === "good" ? "On track" : level === "watch" ? "Watch" : "Action";
    }

    function update(opts) {
      const animate = opts && opts.animate;
      let total = 0;
      const counts = { good: 0, watch: 0, risk: 0 };

      cards.forEach((card) => {
        const data = readCard(card);
        const target = Math.max(1, isFinite(data.target) ? data.target : 1);
        const actual = data.actual;
        let score = 0;
        let level = "risk";
        let pctText = "";
        let targetSuffix = "";

        if (data.mode === "range") {
          const diff = Math.abs(actual - target);
          score = clamp(100 - diff, 0, 100);
          if (diff <= 5) level = "good";
          else if (diff <= 10) level = "watch";
          pctText = diff === 0 ? "Exactly on plan" : `${diff}% ${actual < target ? "under" : "over"} plan`;
          targetSuffix = data.unit === "%" || data.unit === "/100" ? "%" : "";
        } else {
          const ratio = actual / target;
          score = clamp(ratio * 100, 0, 120);
          if (ratio >= 1) level = "good";
          else if (ratio >= 0.9) level = "watch";
          pctText = `${Math.round(ratio * 100)}% of target`;
          targetSuffix = data.unit === "%" ? "%" : "";
        }

        total += Math.min(score, 100);
        counts[level]++;

        const targetStrong = card.querySelector(".kpi__target strong");
        if (targetStrong) targetStrong.textContent = target + targetSuffix;
        const pctEl = card.querySelector(".kpi__pct");
        if (pctEl) pctEl.textContent = pctText;
        setStatus(card, level);

        const fill = card.querySelector(".kpi__fill");
        if (fill) {
          if (state.revealedDashboard || animate) {
            fill.style.width = clamp(score, 0, 100) + "%";
          }
        }
      });

      const health = cards.length ? Math.round(total / cards.length) : 0;
      if (healthValue) healthValue.textContent = String(health);
      if (healthLabel) {
        healthLabel.textContent = health >= 95 ? "On track" : health >= 85 ? "On watch" : "Needs action";
      }
      if (healthRing) {
        if (state.revealedDashboard || animate) {
          healthRing.style.strokeDashoffset = String(ringLength - (health / 100) * ringLength);
        }
        healthRing.setAttribute("aria-label", `Overall sample attainment ${health} out of 100`);
      }
      if (countGood) countGood.textContent = counts.good;
      if (countWatch) countWatch.textContent = counts.watch;
      if (countRisk) countRisk.textContent = counts.risk;
    }

    cards.forEach((card) => {
      const input = card.querySelector("input");
      if (!input) return;
      input.addEventListener("input", () => {
        if (input.value === "") return;
        update({ animate: true });
      });
      input.addEventListener("change", () => {
        const min = parseFloat(input.min) || 1;
        const max = parseFloat(input.max) || 999;
        let v = parseFloat(input.value);
        if (!isFinite(v)) v = parseFloat(card.dataset.target);
        v = clamp(v, min, max);
        input.value = v;
        update({ animate: true });
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        cards.forEach((card, i) => {
          const input = card.querySelector("input");
          if (input) input.value = defaults[i].target;
        });
        update({ animate: true });
        resetBtn.blur();
      });
    }

    // First paint without animating bars; animate when the dashboard enters view.
    update({ animate: false });

    const dashboard = $("#dashboard");
    if (dashboard && "IntersectionObserver" in window && !reduceMotion) {
      const io = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          state.revealedDashboard = true;
          update({ animate: true });
          io.disconnect();
        }
      }, { threshold: 0.15 });
      io.observe(dashboard);
    } else {
      state.revealedDashboard = true;
      update({ animate: true });
    }
  }

  /* ------------------------------------------------------------
     BOOT
     ------------------------------------------------------------ */
  function startExperience() {
    if (state.started) return;
    state.started = true;
    prepareStagger();
    startReveals();
    initCounters();
    initParallax();
    initNavigation();
    initTabs();
    initOrgChart();
    initDrive();
    initKpis();
    // Re-measure once fonts finish loading, to keep the rail accurate.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        measureSections();
        updateNavigation();
      }).catch(() => {});
    }
  }

  function boot() {
    initParticles();
    if (introSeen() || reduceMotion) {
      if (intro) {
        intro.classList.add("is-done");
        intro.setAttribute("aria-hidden", "true");
        intro.style.display = "none";
      }
      finishIntro(true);
    } else {
      beginIntro();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
