(function () {
  "use strict";

  const analytics = window.KiwiSiteAnalytics || {
    enabled: false,
    track: function (_event, _payload) {}
  };

  function track(event, payload) {
    if (analytics && analytics.enabled && typeof analytics.track === "function") {
      analytics.track(event, payload || {});
    }
  }

  const toast = document.getElementById("toast");
  let toastTimer;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("show");
    }, 1800);
  }

  function initSmoothScroll() {
    const anchors = document.querySelectorAll('a[href^="#"]');
    anchors.forEach(function (anchor) {
      anchor.addEventListener("click", function (event) {
        const targetId = anchor.getAttribute("href");
        if (!targetId || targetId === "#") return;
        const target = document.querySelector(targetId);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        track("nav_click", { target: targetId });
      });
    });
  }

  function initNavSectionHighlight() {
    const navLinks = document.querySelectorAll('.site-header .nav-list a[href^="#"]');
    if (!navLinks.length) return;

    const sections = [];
    const linksById = {};
    let activeId = "";

    navLinks.forEach(function (link) {
      const hash = link.getAttribute("href");
      if (!hash || hash.length < 2) return;
      const id = hash.slice(1);
      const section = document.getElementById(id);
      if (!section) return;
      sections.push(section);
      linksById[id] = link;

      link.addEventListener("click", function () {
        setActive(id);
      });
    });

    function setActive(id) {
      if (!id || id === activeId || !linksById[id]) return;
      activeId = id;
      navLinks.forEach(function (link) {
        link.classList.remove("is-active");
        link.removeAttribute("aria-current");
      });
      linksById[id].classList.add("is-active");
      linksById[id].setAttribute("aria-current", "page");
    }

    function updateActiveFromScroll() {
      const header = document.querySelector(".site-header");
      const headerOffset = header ? header.offsetHeight : 0;
      const scrollBottom = window.scrollY + window.innerHeight;
      const pageBottom = document.documentElement.scrollHeight - 2;

      if (sections.length && scrollBottom >= pageBottom) {
        setActive(sections[sections.length - 1].id);
        return;
      }

      const y = window.scrollY + headerOffset + 28;
      let currentId = sections[0] ? sections[0].id : "";

      sections.forEach(function (section) {
        if (section.offsetTop <= y) {
          currentId = section.id;
        }
      });

      setActive(currentId);
    }

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        updateActiveFromScroll();
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    updateActiveFromScroll();
  }

  function initFaqAccordion() {
    function toggleFaq(button) {
      const isExpanded = button.getAttribute("aria-expanded") === "true";
      const targetId = button.getAttribute("aria-controls");
      if (!targetId) return;
      const panel = document.getElementById(targetId);
      if (!panel) return;

      button.setAttribute("aria-expanded", String(!isExpanded));
      panel.hidden = isExpanded;
      track("faq_toggle", { id: targetId, expanded: !isExpanded });
    }

    const items = document.querySelectorAll(".faq-item");
    items.forEach(function (item) {
      const button = item.querySelector(".faq-question");
      if (!button) return;

      button.addEventListener("click", function () {
        toggleFaq(button);
      });

      item.addEventListener("click", function (event) {
        if (event.target.closest(".faq-answer")) return;
        if (event.target.closest(".faq-question")) return;
        toggleFaq(button);
      });
    });
  }

  async function copyText(value) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const tempInput = document.createElement("input");
        tempInput.value = value;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
      }
      showToast("Coordonnée copiée");
      track("copy_contact", { value: value });
    } catch (_err) {
      showToast("Copie indisponible");
    }
  }

  function initCopyButtons() {
    const copyButtons = document.querySelectorAll(".copy-btn");
    copyButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        const value = button.getAttribute("data-copy");
        if (!value) return;
        copyText(value);
      });
    });
  }

  function initMobileContactFab() {
    const contactBar = document.querySelector(".contact-bar");
    if (!contactBar) return;

    const toggle = contactBar.querySelector(".contact-fab-toggle");
    const panel = contactBar.querySelector(".contact-panel");
    if (!toggle || !panel) return;

    const mobileQuery = window.matchMedia("(max-width: 719px)");

    function setOpen(nextOpen) {
      contactBar.classList.toggle("is-open", nextOpen);
      toggle.setAttribute("aria-expanded", String(nextOpen));
      toggle.setAttribute(
        "aria-label",
        nextOpen ? "Fermer les moyens de contact" : "Ouvrir les moyens de contact"
      );
    }

    function closePanel() {
      setOpen(false);
    }

    toggle.addEventListener("click", function () {
      if (!mobileQuery.matches) return;
      const nextOpen = !contactBar.classList.contains("is-open");
      setOpen(nextOpen);
      track("contact_fab_toggle", { expanded: nextOpen });
    });

    document.addEventListener("click", function (event) {
      if (!mobileQuery.matches || !contactBar.classList.contains("is-open")) return;
      if (contactBar.contains(event.target)) return;
      closePanel();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closePanel();
      }
    });

    panel.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        if (mobileQuery.matches) {
          closePanel();
        }
      });
    });

    if (typeof mobileQuery.addEventListener === "function") {
      mobileQuery.addEventListener("change", function (event) {
        if (!event.matches) {
          closePanel();
        }
      });
    } else if (typeof mobileQuery.addListener === "function") {
      mobileQuery.addListener(function (event) {
        if (!event.matches) {
          closePanel();
        }
      });
    }

    setOpen(false);
  }

  function initMobileOfferCards() {
    const cards = document.querySelectorAll("[data-offer-card]");
    if (!cards.length) return;

    const mobileQuery = window.matchMedia("(max-width: 719px)");
    let syncingState = false;

    function setDesktopState() {
      syncingState = true;
      cards.forEach(function (card) {
        card.classList.remove("is-desktop-expanded");
      });
      syncingState = false;
    }

    function setMobileState() {
      syncingState = true;
      cards.forEach(function (card) {
        card.open = false;
        card.classList.remove("is-desktop-expanded");
      });
      syncingState = false;
    }

    cards.forEach(function (card) {
      const summary = card.querySelector(".offer-toggle");

      if (summary) {
        summary.addEventListener("click", function (event) {
          if (mobileQuery.matches) return;
          event.preventDefault();
          const nextExpanded = !card.classList.contains("is-desktop-expanded");
          cards.forEach(function (otherCard) {
            otherCard.classList.toggle("is-desktop-expanded", nextExpanded);
          });
          track("offer_desktop_details_toggle", {
            offer:
              card.getAttribute("data-offer-name") ||
              (card.querySelector(".offer-name") ? card.querySelector(".offer-name").textContent.trim() : ""),
            expanded: nextExpanded
          });
        });
      }

      card.addEventListener("toggle", function () {
        if (!mobileQuery.matches || syncingState) return;

        const offerName =
          card.getAttribute("data-offer-name") ||
          (card.querySelector(".offer-name") ? card.querySelector(".offer-name").textContent.trim() : "");

        if (card.open) {
          cards.forEach(function (otherCard) {
            if (otherCard !== card) {
              otherCard.open = false;
            }
          });
        }

        track("offer_toggle", {
          offer: offerName,
          expanded: card.open
        });
      });
    });

    function syncOfferCards(event) {
      if (event && event.matches === false) {
        setDesktopState();
        return;
      }

      if (mobileQuery.matches) {
        setMobileState();
      } else {
        setDesktopState();
      }
    }

    if (typeof mobileQuery.addEventListener === "function") {
      mobileQuery.addEventListener("change", syncOfferCards);
    } else if (typeof mobileQuery.addListener === "function") {
      mobileQuery.addListener(syncOfferCards);
    }

    syncOfferCards();
  }

  function initMobileDifficultyCards() {
    const cards = document.querySelectorAll("[data-difficulty-card]");
    if (!cards.length) return;

    const mobileQuery = window.matchMedia("(max-width: 719px)");
    let syncingState = false;

    function setDesktopState() {
      syncingState = true;
      syncingState = false;
    }

    function setMobileState() {
      syncingState = true;
      cards.forEach(function (card) {
        card.open = false;
      });
      syncingState = false;
    }

    cards.forEach(function (card) {
      card.addEventListener("toggle", function () {
        if (!mobileQuery.matches || syncingState) return;

        const difficultyName =
          card.getAttribute("data-difficulty-name") ||
          (card.querySelector(".difficulty-name")
            ? card.querySelector(".difficulty-name").textContent.trim()
            : "");

        if (card.open) {
          cards.forEach(function (otherCard) {
            if (otherCard !== card) {
              otherCard.open = false;
            }
          });
        }

        track("difficulty_toggle", {
          level: difficultyName,
          expanded: card.open
        });
      });
    });

    function syncDifficultyCards(event) {
      if (event && event.matches === false) {
        setDesktopState();
        return;
      }

      if (mobileQuery.matches) {
        setMobileState();
      } else {
        setDesktopState();
      }
    }

    if (typeof mobileQuery.addEventListener === "function") {
      mobileQuery.addEventListener("change", syncDifficultyCards);
    } else if (typeof mobileQuery.addListener === "function") {
      mobileQuery.addListener(syncDifficultyCards);
    }

    syncDifficultyCards();
  }

  function clearErrors(form) {
    const errors = form.querySelectorAll(".form-error");
    errors.forEach(function (err) {
      err.remove();
    });
  }

  function addError(field, message) {
    const error = document.createElement("p");
    error.className = "form-error";
    error.textContent = message;
    field.insertAdjacentElement("afterend", error);
  }

  function validateContactForm(form) {
    clearErrors(form);
    const name = form.querySelector("#name");
    const email = form.querySelector("#email");
    const message = form.querySelector("#message");
    let isValid = true;

    if (!name || !name.value.trim()) {
      addError(name, "Veuillez renseigner votre nom.");
      isValid = false;
    }

    const emailValue = email ? email.value.trim() : "";
    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!email || !emailReg.test(emailValue)) {
      addError(email, "Veuillez renseigner un email valide.");
      isValid = false;
    }

    if (!message || message.value.trim().length < 10) {
      addError(message, "Votre message doit contenir au moins 10 caractères.");
      isValid = false;
    }

    return isValid;
  }

  function initContactForm() {
    const form = document.getElementById("contact-form");
    if (!form) return;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!validateContactForm(form)) {
        showToast("Vérifiez les champs du formulaire");
        track("contact_invalid", {});
        return;
      }

      const name = form.querySelector("#name").value.trim();
      const email = form.querySelector("#email").value.trim();
      const message = form.querySelector("#message").value.trim();

      const subject = encodeURIComponent("Demande de projet KiwiSite - " + name);
      const body = encodeURIComponent(
        "Nom: " +
          name +
          "\nEmail: " +
          email +
          "\n\nMessage:\n" +
          message +
          "\n"
      );

      window.location.href = "mailto:kiwisitebuilder@gmail.com?subject=" + subject + "&body=" + body;
      showToast("Ouverture de votre client mail");
      track("contact_submit", { name: name, email: email });
    });
  }

  function initReviewsCarousel() {
    const section = document.getElementById("avis");
    if (!section) return;

    const trackEl = section.querySelector(".reviews-track");
    const slides = section.querySelectorAll(".review-slide");
    const prevBtn = section.querySelector('.reviews-arrow[data-action="prev"]');
    const nextBtn = section.querySelector('.reviews-arrow[data-action="next"]');
    const counter = section.querySelector("#reviews-counter");
    const focusZone = section.querySelector(".reviews-carousel");
    if (!trackEl || !slides.length || !prevBtn || !nextBtn || !counter || !focusZone) return;

    let current = 0;
    const total = slides.length;
    let touchStartX = 0;
    let touchStartY = 0;

    function render(source) {
      trackEl.style.transform = "translateX(-" + current * 100 + "%)";
      slides.forEach(function (slide, index) {
        slide.setAttribute("aria-hidden", String(index !== current));
      });
      counter.textContent = current + 1 + " / " + total;
      if (source) {
        track("review_slide", { index: current, source: source });
      }
    }

    function goTo(index, source) {
      current = (index + total) % total;
      render(source);
    }

    prevBtn.addEventListener("click", function () {
      goTo(current - 1, "arrow_prev");
    });

    nextBtn.addEventListener("click", function () {
      goTo(current + 1, "arrow_next");
    });

    focusZone.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(current - 1, "keyboard_left");
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(current + 1, "keyboard_right");
      }
    });

    focusZone.addEventListener(
      "touchstart",
      function (event) {
        if (!event.touches || !event.touches.length) return;
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
      },
      { passive: true }
    );

    focusZone.addEventListener(
      "touchend",
      function (event) {
        if (!event.changedTouches || !event.changedTouches.length) return;
        const deltaX = event.changedTouches[0].clientX - touchStartX;
        const deltaY = event.changedTouches[0].clientY - touchStartY;
        if (Math.abs(deltaX) < 36 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
        if (deltaX < 0) {
          goTo(current + 1, "swipe_left");
        } else {
          goTo(current - 1, "swipe_right");
        }
      },
      { passive: true }
    );

    render("");
  }

  function initStripeLinksTracking() {
    const stripeLinks = document.querySelectorAll('.stripe-btn[href*="STRIPE_LINK_"], .stripe-btn');
    stripeLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        track("stripe_click", { href: link.getAttribute("href") || "" });
      });
    });
  }

  function initLeadPillsInteraction() {
    const group = document.querySelector(".lead-points");
    if (!group) return;

    const pills = Array.from(group.querySelectorAll("span"));
    if (pills.length < 2) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const intermediateStaticQuery = window.matchMedia("(min-width: 720px) and (max-width: 1099px)");
    const state = {
      dragIndex: -1,
      pointerId: null,
      startX: 0,
      startOffset: 0,
      lastPointerX: 0,
      lastPointerTime: 0,
      pointerVelocityX: 0,
      offsets: pills.map(function () {
        return 0;
      }),
      targetOffsets: pills.map(function () {
        return 0;
      }),
      velocities: pills.map(function () {
        return 0;
      }),
      widths: [],
      baseCenters: [],
      gap: 10,
      trackStart: 0,
      trackEnd: 0,
      activeContacts: new Set(),
      rafId: 0,
      returnTimerId: 0
    };

    function isStaticMode() {
      return reducedMotionQuery.matches || intermediateStaticQuery.matches;
    }

    function clearReturnTimer() {
      if (state.returnTimerId) {
        window.clearTimeout(state.returnTimerId);
        state.returnTimerId = 0;
      }
    }

    function resetInteractionState() {
      clearReturnTimer();
      if (state.rafId) {
        window.cancelAnimationFrame(state.rafId);
        state.rafId = 0;
      }

      state.dragIndex = -1;
      state.pointerId = null;
      state.startX = 0;
      state.startOffset = 0;
      state.lastPointerX = 0;
      state.lastPointerTime = 0;
      state.pointerVelocityX = 0;
      state.offsets = state.offsets.map(function () {
        return 0;
      });
      state.targetOffsets = state.targetOffsets.map(function () {
        return 0;
      });
      state.velocities = state.velocities.map(function () {
        return 0;
      });
      state.activeContacts.clear();

      pills.forEach(function (pill) {
        pill.classList.remove("is-dragging");
        pill.style.setProperty("--lead-pill-x", "0px");
      });
    }

    function measure() {
      const hero = group.closest(".offers-hero");
      const heroVisual = hero ? hero.querySelector(".hero-visual") : null;
      const groupRect = group.getBoundingClientRect();
      const styles = window.getComputedStyle(group);
      const parsedGap = parseFloat(styles.columnGap || styles.gap || "10");
      state.gap = Number.isFinite(parsedGap) ? parsedGap : 10;
      state.widths = pills.map(function (pill) {
        return pill.offsetWidth;
      });
      state.baseCenters = pills.map(function (pill) {
        const rect = pill.getBoundingClientRect();
        return rect.left - groupRect.left + rect.width / 2;
      });

      const firstIndex = 0;
      const lastIndex = pills.length - 1;
      const contentStart = state.baseCenters[firstIndex] - state.widths[firstIndex] / 2;
      const contentEnd = state.baseCenters[lastIndex] + state.widths[lastIndex] / 2;
      const contentWidth = contentEnd - contentStart;
      const freeLeft = Math.max(0, contentStart);
      let rightBoundary = group.clientWidth;

      if (heroVisual) {
        const heroVisualRect = heroVisual.getBoundingClientRect();
        const heroVisualStyles = window.getComputedStyle(heroVisual);
        if (heroVisualStyles.display !== "none") {
          rightBoundary = Math.max(group.clientWidth, heroVisualRect.left - groupRect.left - 18);
        }
      }

      const freeRight = Math.max(0, rightBoundary - contentEnd);
      const rightSlack = freeRight;
      const leftSlack = Math.min(freeLeft, Math.max(16, Math.min(28, contentWidth * 0.08)));

      state.trackStart = Math.max(0, contentStart - leftSlack);
      state.trackEnd = Math.max(contentEnd, contentEnd + rightSlack);
    }

    function requestRender() {
      if (isStaticMode()) return;
      if (state.rafId) return;
      state.rafId = window.requestAnimationFrame(render);
    }

    function render() {
      state.rafId = 0;
      if (isStaticMode()) {
        resetInteractionState();
        return;
      }

      for (let index = 0; index < pills.length; index += 1) {
        const spring = state.dragIndex === index ? 0.28 : 0.16;
        const damping = state.dragIndex === index ? 0.7 : 0.76;
        const delta = state.targetOffsets[index] - state.offsets[index];

        state.velocities[index] += delta * spring;
        state.velocities[index] *= damping;
        state.offsets[index] += state.velocities[index];

        if (Math.abs(delta) < 0.08 && Math.abs(state.velocities[index]) < 0.08) {
          state.offsets[index] = state.targetOffsets[index];
          state.velocities[index] = 0;
        }

        pills[index].style.setProperty("--lead-pill-x", state.offsets[index].toFixed(2) + "px");
      }

      const keepAnimating = state.offsets.some(function (offset, index) {
        return (
          Math.abs(state.targetOffsets[index] - offset) > 0.08 ||
          Math.abs(state.velocities[index]) > 0.08
        );
      });

      if (keepAnimating) {
        state.rafId = window.requestAnimationFrame(render);
      }
    }

    function scheduleReturn() {
      clearReturnTimer();
      state.returnTimerId = window.setTimeout(function () {
        state.returnTimerId = 0;
        if (state.dragIndex !== -1 || isStaticMode()) return;
        state.targetOffsets = state.targetOffsets.map(function () {
          return 0;
        });
        state.velocities = state.velocities.map(function () {
          return 0;
        });
        requestRender();
      }, 1500);
    }

    function resolveTargets(draggedIndex, desiredOffset) {
      const centers = state.baseCenters.map(function (center) {
        return center;
      });
      const nextActiveContacts = new Set();
      const minCenter = state.widths.map(function (width) {
        return state.trackStart + width / 2;
      });
      const maxCenter = state.widths.map(function (width) {
        return Math.max(state.trackStart + width / 2, state.trackEnd - width / 2);
      });

      centers[draggedIndex] = Math.max(
        minCenter[draggedIndex],
        Math.min(maxCenter[draggedIndex], state.baseCenters[draggedIndex] + desiredOffset)
      );

      for (let pass = 0; pass < pills.length * 4; pass += 1) {
        for (let index = 0; index < centers.length - 1; index += 1) {
          const nextIndex = index + 1;
          const contactKey = index + ":" + nextIndex;
          const minDistance = (state.widths[index] + state.widths[nextIndex]) / 2 + state.gap;
          const distance = centers[nextIndex] - centers[index];
          if (distance >= minDistance) continue;

          nextActiveContacts.add(contactKey);
          const overlap = minDistance - distance;
          const isNewContact = !state.activeContacts.has(contactKey);
          if (isNewContact) {
            const impact = Math.min(
              4.8,
              0.8 + overlap * 0.22 + Math.min(2.6, Math.abs(state.pointerVelocityX) * 24)
            );

            if (index === draggedIndex) {
              state.velocities[nextIndex] += impact;
              state.velocities[index] -= impact * 0.28;
            } else if (nextIndex === draggedIndex) {
              state.velocities[index] -= impact;
              state.velocities[nextIndex] += impact * 0.28;
            } else {
              state.velocities[index] -= impact * 0.5;
              state.velocities[nextIndex] += impact * 0.5;
            }
          }

          if (index === draggedIndex) {
            centers[nextIndex] += overlap;
          } else if (nextIndex === draggedIndex) {
            centers[index] -= overlap;
          } else {
            centers[index] -= overlap * 0.5;
            centers[nextIndex] += overlap * 0.5;
          }
        }

        let shift = 0;
        if (centers[0] < minCenter[0]) {
          shift = minCenter[0] - centers[0];
        } else {
          const lastIndex = centers.length - 1;
          if (centers[lastIndex] > maxCenter[lastIndex]) {
            shift = maxCenter[lastIndex] - centers[lastIndex];
          }
        }

        if (shift !== 0) {
          for (let index = 0; index < centers.length; index += 1) {
            centers[index] += shift;
          }
        }
      }

      state.targetOffsets = centers.map(function (center, index) {
        return center - state.baseCenters[index];
      });
      state.activeContacts = nextActiveContacts;
      requestRender();
    }

    function onPointerMove(event) {
      if (event.pointerId !== state.pointerId || state.dragIndex === -1) return;
      const now = performance.now();
      const dt = state.lastPointerTime ? Math.max(16, now - state.lastPointerTime) : 16;
      const dx = event.clientX - state.lastPointerX;
      state.pointerVelocityX = dx / dt;
      state.lastPointerX = event.clientX;
      state.lastPointerTime = now;
      const deltaX = event.clientX - state.startX;
      resolveTargets(state.dragIndex, state.startOffset + deltaX);
    }

    function onPointerEnd(event) {
      if (event.pointerId !== state.pointerId || state.dragIndex === -1) return;
      const dragIndex = state.dragIndex;
      const pill = pills[dragIndex];
      state.dragIndex = -1;
      state.pointerId = null;
      state.pointerVelocityX = 0;
      state.activeContacts.clear();
      pill.classList.remove("is-dragging");
      state.velocities[dragIndex] *= 0.35;
      if (pill.hasPointerCapture(event.pointerId)) {
        pill.releasePointerCapture(event.pointerId);
      }
      scheduleReturn();
    }

    pills.forEach(function (pill, index) {
      pill.addEventListener("pointerdown", function (event) {
        if (event.button !== undefined && event.button !== 0) return;
        if (isStaticMode()) return;

        clearReturnTimer();
        measure();
        state.dragIndex = index;
        state.pointerId = event.pointerId;
        state.startX = event.clientX;
        state.startOffset = state.targetOffsets[index];
        state.lastPointerX = event.clientX;
        state.lastPointerTime = performance.now();
        state.pointerVelocityX = 0;
        state.activeContacts.clear();
        state.velocities[index] = 0;
        pill.classList.add("is-dragging");
        pill.setPointerCapture(event.pointerId);
      });

      pill.addEventListener("pointermove", onPointerMove);
      pill.addEventListener("pointerup", onPointerEnd);
      pill.addEventListener("pointercancel", onPointerEnd);
      pill.addEventListener("lostpointercapture", function () {
        if (state.dragIndex !== index) return;
        state.dragIndex = -1;
        state.pointerId = null;
        state.pointerVelocityX = 0;
        state.activeContacts.clear();
        pill.classList.remove("is-dragging");
        scheduleReturn();
      });
    });

    window.addEventListener("resize", function () {
      if (isStaticMode()) {
        resetInteractionState();
        return;
      }
      measure();
      state.offsets = state.offsets.map(function () {
        return 0;
      });
      state.targetOffsets = state.targetOffsets.map(function () {
        return 0;
      });
      state.velocities = state.velocities.map(function () {
        return 0;
      });
      state.pointerVelocityX = 0;
      state.activeContacts.clear();
      requestRender();
    });

    if (isStaticMode()) {
      resetInteractionState();
      return;
    }

    measure();
  }

  function initSceneCardsInteraction() {
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const heroSceneVisibleQuery = window.matchMedia("(min-width: 750px)");
    const cards = document.querySelectorAll(".scene-card, .offer-mini-visual");
    if (!cards.length || reducedMotionQuery.matches) return;

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    cards.forEach(function (card) {
      const baseZ = parseFloat(card.getAttribute("data-base-z") || "0");
      const isOfferMiniCard = card.classList.contains("offer-mini-visual");
      if (!isOfferMiniCard && !heroSceneVisibleQuery.matches) return;

      const state = {
        dragging: false,
        spinning: false,
        hoverX: 0,
        hoverY: 0,
        dragX: 0,
        dragY: 0,
        dragRotateX: 0,
        dragRotateY: 0,
        dragSpin: 0,
        spinX: 0,
        spinY: 0,
        spinZ: 0,
        wobbleX: 0,
        wobbleY: 0,
        pointerId: null,
        startX: 0,
        startY: 0,
        lastX: 0,
        lastY: 0,
        lastTime: 0,
        velocityX: 0,
        velocityY: 0,
        dragDistance: 0,
        frameId: 0,
        returnTimerId: 0
      };

      function clearReturnTimer() {
        if (state.returnTimerId) {
          window.clearTimeout(state.returnTimerId);
          state.returnTimerId = 0;
        }
      }

      function stopMomentum() {
        if (state.frameId) {
          window.cancelAnimationFrame(state.frameId);
          state.frameId = 0;
        }
        state.spinning = false;
        card.classList.remove("is-spinning");
      }

      function applyTransform() {
        const rotateX = state.hoverX + state.dragX + state.dragRotateX + state.spinX + state.wobbleX;
        const rotateY = state.hoverY + state.dragY + state.dragRotateY + state.spinY + state.wobbleY;
        const scale = state.dragging ? 1.03 : 1;

        card.style.setProperty("--card-z", baseZ + "deg");
        card.style.setProperty("--card-spin", state.dragSpin + state.spinZ + "deg");
        card.style.setProperty("--card-x", rotateX + "deg");
        card.style.setProperty("--card-y", rotateY + "deg");
        card.style.setProperty("--card-scale", String(scale));
      }

      function startMagneticReturn() {
        stopMomentum();
        state.dragging = false;
        state.pointerId = null;
        card.classList.remove("is-dragging");

        function tick() {
          state.hoverX *= 0.88;
          state.hoverY *= 0.88;
          state.dragX *= 0.84;
          state.dragY *= 0.84;
          state.dragRotateX *= 0.84;
          state.dragRotateY *= 0.84;
          state.dragSpin *= 0.84;
          state.spinX *= 0.82;
          state.spinY *= 0.82;
          state.spinZ *= 0.82;
          state.wobbleX *= 0.8;
          state.wobbleY *= 0.8;

          applyTransform();

          if (
            Math.abs(state.hoverX) < 0.08 &&
            Math.abs(state.hoverY) < 0.08 &&
            Math.abs(state.dragX) < 0.08 &&
            Math.abs(state.dragY) < 0.08 &&
            Math.abs(state.dragRotateX) < 0.08 &&
            Math.abs(state.dragRotateY) < 0.08 &&
            Math.abs(state.dragSpin) < 0.08 &&
            Math.abs(state.spinX) < 0.08 &&
            Math.abs(state.spinY) < 0.08 &&
            Math.abs(state.spinZ) < 0.08 &&
            Math.abs(state.wobbleX) < 0.08 &&
            Math.abs(state.wobbleY) < 0.08
          ) {
            settleToRest();
            return;
          }

          state.frameId = window.requestAnimationFrame(tick);
        }

        state.frameId = window.requestAnimationFrame(tick);
      }

      function scheduleMagneticReturn() {
        clearReturnTimer();
        state.returnTimerId = window.setTimeout(function () {
          state.returnTimerId = 0;
          if (!state.dragging) {
            startMagneticReturn();
          }
        }, 2000);
      }

      function updateFromPointer(clientX, clientY, multiplier) {
        const rect = card.getBoundingClientRect();
        const px = (clientX - rect.left) / rect.width;
        const py = (clientY - rect.top) / rect.height;
        const rotateY = (px - 0.5) * 24 * multiplier;
        const rotateX = (0.5 - py) * 24 * multiplier;

        if (state.dragging) {
          const now = performance.now();
          const dt = state.lastTime ? Math.max(16, now - state.lastTime) : 16;
          const dx = clientX - state.lastX;
          const dy = clientY - state.lastY;

          state.velocityX = dx / dt;
          state.velocityY = dy / dt;
          state.dragDistance += Math.hypot(dx, dy);
          state.lastX = clientX;
          state.lastY = clientY;
          state.lastTime = now;
          state.dragX = rotateX;
          state.dragY = rotateY;
          state.dragRotateX = (state.startY - clientY) * 0.48;
          state.dragRotateY = (clientX - state.startX) * 0.48;
          state.dragSpin = clamp(
            (clientX - state.startX) * 0.22 + (state.startY - clientY) * 0.08,
            -220,
            220
          );
        } else {
          state.hoverX = rotateX;
          state.hoverY = rotateY;
        }

        applyTransform();
      }

      function settleToRest() {
        stopMomentum();
        state.hoverX = 0;
        state.hoverY = 0;
        state.dragX = 0;
        state.dragY = 0;
        state.dragRotateX = 0;
        state.dragRotateY = 0;
        state.dragSpin = 0;
        state.spinX = 0;
        state.spinY = 0;
        state.spinZ = 0;
        state.wobbleX = 0;
        state.wobbleY = 0;
        state.dragging = false;
        state.pointerId = null;
        card.classList.remove("is-dragging");
        applyTransform();
      }

      if (isOfferMiniCard) {
        card.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();
        });
      }

      function startMomentum() {
        const speed = Math.hypot(state.velocityX, state.velocityY);
        const distancePower = clamp(state.dragDistance * 0.003, 0, 1.92);
        const speedPower = clamp(speed * 9.6, 0, 6);
        const directionBase = state.velocityX + state.velocityY * 0.28;
        const direction = directionBase === 0 ? (state.dragSpin >= 0 ? 1 : -1) : Math.sign(directionBase);
        let angularVelocity = direction * (speedPower + distancePower);
        const wobblePower = clamp(speed * 6 + state.dragDistance * 0.0024, 0, 6);
        let spinXVelocity = clamp(
          state.velocityY * -43.2 + state.dragRotateX * 0.0168,
          -10.8,
          10.8
        );
        let spinYVelocity = clamp(
          state.velocityX * 43.2 + state.dragRotateY * 0.0168,
          -10.8,
          10.8
        );
        let wobbleXVelocity = clamp(state.dragX * 0.084 + state.velocityY * -4.8, -wobblePower, wobblePower);
        let wobbleYVelocity = clamp(state.dragY * 0.084 + state.velocityX * 4.8, -wobblePower, wobblePower);
        let lastTick = performance.now();

        state.dragging = false;
        state.pointerId = null;
        state.dragX = 0;
        state.dragY = 0;
        state.dragRotateX = 0;
        state.dragRotateY = 0;
        state.dragSpin = 0;
        state.hoverX = 0;
        state.hoverY = 0;
        card.classList.remove("is-dragging");
        card.classList.add("is-spinning");
        state.spinning = true;

        if (Math.abs(angularVelocity) < 0.9 && wobblePower < 1.8) {
          settleToRest();
          return;
        }

        function tick(now) {
          const dt = Math.min(28, now - lastTick || 16);
          const frame = dt / 16.67;
          lastTick = now;

          state.spinX += spinXVelocity * frame;
          state.spinY += spinYVelocity * frame;
          state.spinZ += angularVelocity * frame;
          state.wobbleX += wobbleXVelocity * frame;
          state.wobbleY += wobbleYVelocity * frame;

          spinXVelocity *= Math.pow(0.952, frame);
          spinYVelocity *= Math.pow(0.952, frame);
          angularVelocity *= Math.pow(0.947, frame);
          wobbleXVelocity *= Math.pow(0.9, frame);
          wobbleYVelocity *= Math.pow(0.9, frame);

          state.wobbleX *= Math.pow(0.985, frame);
          state.wobbleY *= Math.pow(0.985, frame);

          applyTransform();

          if (
            Math.abs(spinXVelocity) < 0.1 &&
            Math.abs(spinYVelocity) < 0.1 &&
            Math.abs(angularVelocity) < 0.12 &&
            Math.abs(wobbleXVelocity) < 0.08 &&
            Math.abs(wobbleYVelocity) < 0.08 &&
            Math.abs(state.wobbleX) < 0.28 &&
            Math.abs(state.wobbleY) < 0.28
          ) {
            settleToRest();
            return;
          }

          state.frameId = window.requestAnimationFrame(tick);
        }

        state.frameId = window.requestAnimationFrame(tick);
      }

      card.addEventListener("pointermove", function (event) {
        clearReturnTimer();
        if (state.dragging && event.pointerId === state.pointerId) {
          updateFromPointer(event.clientX, event.clientY, 2);
        } else if (!state.dragging) {
          updateFromPointer(event.clientX, event.clientY, 1);
        }
        scheduleMagneticReturn();
      });

      card.addEventListener("pointerenter", function (event) {
        clearReturnTimer();
        if (!state.dragging) {
          updateFromPointer(event.clientX, event.clientY, 1);
        }
        scheduleMagneticReturn();
      });

      card.addEventListener("pointerleave", function () {
        scheduleMagneticReturn();
      });

      card.addEventListener("pointerdown", function (event) {
        clearReturnTimer();
        if (isOfferMiniCard) {
          event.preventDefault();
          event.stopPropagation();
        }
        stopMomentum();
        state.dragging = true;
        state.pointerId = event.pointerId;
        state.startX = event.clientX;
        state.startY = event.clientY;
        state.lastX = event.clientX;
        state.lastY = event.clientY;
        state.lastTime = performance.now();
        state.velocityX = 0;
        state.velocityY = 0;
        state.dragDistance = 0;
        state.dragSpin = 0;
        state.dragRotateX = 0;
        state.dragRotateY = 0;
        state.spinX = 0;
        state.spinY = 0;
        state.spinZ = 0;
        state.wobbleX = 0;
        state.wobbleY = 0;
        card.classList.add("is-dragging");
        if (card.setPointerCapture) {
          card.setPointerCapture(event.pointerId);
        }
        updateFromPointer(event.clientX, event.clientY, 2);
      });

      card.addEventListener("pointerup", function (event) {
        if (isOfferMiniCard) {
          event.preventDefault();
          event.stopPropagation();
        }
        if (card.releasePointerCapture && state.pointerId === event.pointerId) {
          try {
            card.releasePointerCapture(event.pointerId);
          } catch (_err) {}
        }
        startMomentum();
        scheduleMagneticReturn();
      });

      card.addEventListener("pointercancel", function (event) {
        clearReturnTimer();
        if (isOfferMiniCard) {
          event.preventDefault();
          event.stopPropagation();
        }
        settleToRest();
        scheduleMagneticReturn();
      });
    });
  }

  function initBrandSignature() {
    const brand = document.querySelector("[data-brand-3d]");
    if (!brand) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointerQuery = window.matchMedia("(pointer: fine)");
    if (reducedMotionQuery.matches || !finePointerQuery.matches) return;

    const state = {
      currentX: 0,
      currentY: 0,
      targetX: 0,
      targetY: 0,
      glowX: 50,
      glowY: 50,
      rafId: 0
    };

    function render() {
      state.currentX += (state.targetX - state.currentX) * 0.14;
      state.currentY += (state.targetY - state.currentY) * 0.14;

      brand.style.setProperty("--brand-tilt-x", state.currentX.toFixed(2) + "deg");
      brand.style.setProperty("--brand-tilt-y", state.currentY.toFixed(2) + "deg");
      brand.style.setProperty("--brand-glow-x", state.glowX.toFixed(2) + "%");
      brand.style.setProperty("--brand-glow-y", state.glowY.toFixed(2) + "%");

      const shouldContinue =
        Math.abs(state.currentX - state.targetX) > 0.02 ||
        Math.abs(state.currentY - state.targetY) > 0.02;

      if (shouldContinue) {
        state.rafId = window.requestAnimationFrame(render);
      } else {
        state.rafId = 0;
      }
    }

    function requestRender() {
      if (!state.rafId) {
        state.rafId = window.requestAnimationFrame(render);
      }
    }

    brand.addEventListener("pointermove", function (event) {
      const rect = brand.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;

      state.targetX = (0.5 - py) * 14;
      state.targetY = (px - 0.5) * 18;
      state.glowX = px * 100;
      state.glowY = py * 100;
      requestRender();
    });

    brand.addEventListener("pointerleave", function () {
      state.targetX = 0;
      state.targetY = 0;
      state.glowX = 50;
      state.glowY = 50;
      requestRender();
    });

    brand.addEventListener("focus", function () {
      state.targetX = -3;
      state.targetY = 6;
      requestRender();
    });

    brand.addEventListener("blur", function () {
      state.targetX = 0;
      state.targetY = 0;
      state.glowX = 50;
      state.glowY = 50;
      requestRender();
    });
  }

  function initContactPanelTilt() {
    const panel = document.querySelector("[data-contact-tilt]");
    if (!panel) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopQuery = window.matchMedia("(min-width: 720px)");
    const finePointerQuery = window.matchMedia("(pointer: fine)");
    if (reducedMotionQuery.matches || !desktopQuery.matches || !finePointerQuery.matches) return;

    const state = {
      currentX: 0,
      currentY: 0,
      targetX: 0,
      targetY: 0,
      glowX: 50,
      glowY: 0,
      rafId: 0
    };

    function render() {
      state.currentX += (state.targetX - state.currentX) * 0.12;
      state.currentY += (state.targetY - state.currentY) * 0.12;

      panel.style.setProperty("--contact-tilt-x", state.currentX.toFixed(2) + "deg");
      panel.style.setProperty("--contact-tilt-y", state.currentY.toFixed(2) + "deg");
      panel.style.setProperty("--contact-glow-x", state.glowX.toFixed(2) + "%");
      panel.style.setProperty("--contact-glow-y", state.glowY.toFixed(2) + "%");

      const shouldContinue =
        Math.abs(state.currentX - state.targetX) > 0.02 ||
        Math.abs(state.currentY - state.targetY) > 0.02;

      if (shouldContinue) {
        state.rafId = window.requestAnimationFrame(render);
      } else {
        state.rafId = 0;
      }
    }

    function requestRender() {
      if (!state.rafId) {
        state.rafId = window.requestAnimationFrame(render);
      }
    }

    panel.addEventListener("pointermove", function (event) {
      const rect = panel.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;

      state.targetX = (0.5 - py) * 8;
      state.targetY = (px - 0.5) * 10;
      state.glowX = px * 100;
      state.glowY = py * 100;
      requestRender();
    });

    panel.addEventListener("pointerleave", function () {
      state.targetX = 0;
      state.targetY = 0;
      state.glowX = 50;
      state.glowY = 0;
      requestRender();
    });

    panel.addEventListener("focusin", function () {
      state.targetX = -2;
      state.targetY = 4;
      requestRender();
    });

    panel.addEventListener("focusout", function () {
      state.targetX = 0;
      state.targetY = 0;
      state.glowX = 50;
      state.glowY = 0;
      requestRender();
    });
  }

  function initOfferGuaranteeTilt() {
    const panel = document.querySelector("[data-offer-guarantee-tilt]");
    if (!panel) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopQuery = window.matchMedia("(min-width: 720px)");
    const finePointerQuery = window.matchMedia("(pointer: fine)");
    if (reducedMotionQuery.matches || !desktopQuery.matches || !finePointerQuery.matches) return;

    const state = {
      currentX: 0,
      currentY: 0,
      targetX: 0,
      targetY: 0,
      glowX: 50,
      glowY: 10,
      rafId: 0
    };

    function render() {
      state.currentX += (state.targetX - state.currentX) * 0.12;
      state.currentY += (state.targetY - state.currentY) * 0.12;

      panel.style.setProperty("--guarantee-tilt-x", state.currentX.toFixed(2) + "deg");
      panel.style.setProperty("--guarantee-tilt-y", state.currentY.toFixed(2) + "deg");
      panel.style.setProperty("--guarantee-glow-x", state.glowX.toFixed(2) + "%");
      panel.style.setProperty("--guarantee-glow-y", state.glowY.toFixed(2) + "%");

      const shouldContinue =
        Math.abs(state.currentX - state.targetX) > 0.02 ||
        Math.abs(state.currentY - state.targetY) > 0.02;

      if (shouldContinue) {
        state.rafId = window.requestAnimationFrame(render);
      } else {
        state.rafId = 0;
      }
    }

    function requestRender() {
      if (!state.rafId) {
        state.rafId = window.requestAnimationFrame(render);
      }
    }

    panel.addEventListener("pointermove", function (event) {
      const rect = panel.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;

      state.targetX = (0.5 - py) * 8;
      state.targetY = (px - 0.5) * 10;
      state.glowX = px * 100;
      state.glowY = py * 100;
      requestRender();
    });

    panel.addEventListener("pointerleave", function () {
      state.targetX = 0;
      state.targetY = 0;
      state.glowX = 50;
      state.glowY = 10;
      requestRender();
    });
  }

  initSmoothScroll();
  initNavSectionHighlight();
  initFaqAccordion();
  initCopyButtons();
  initMobileContactFab();
  initMobileOfferCards();
  initMobileDifficultyCards();
  initContactForm();
  initReviewsCarousel();
  initStripeLinksTracking();
  initLeadPillsInteraction();
  initBrandSignature();
  initContactPanelTilt();
  initOfferGuaranteeTilt();
  initSceneCardsInteraction();
})();
