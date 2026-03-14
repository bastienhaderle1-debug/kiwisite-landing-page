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
    const buttons = document.querySelectorAll(".faq-question");
    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        const isExpanded = button.getAttribute("aria-expanded") === "true";
        const targetId = button.getAttribute("aria-controls");
        if (!targetId) return;
        const panel = document.getElementById(targetId);
        if (!panel) return;

        button.setAttribute("aria-expanded", String(!isExpanded));
        panel.hidden = isExpanded;
        track("faq_toggle", { id: targetId, expanded: !isExpanded });
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

      window.location.href = "mailto:hello@kiwisite.fr?subject=" + subject + "&body=" + body;
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

  function initSceneCardsInteraction() {
    const mediaQuery = window.matchMedia("(min-width: 980px) and (pointer: fine)");
    const cards = document.querySelectorAll(".scene-card");
    if (!cards.length || !mediaQuery.matches) return;

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    cards.forEach(function (card) {
      const baseZ = parseFloat(card.getAttribute("data-base-z") || "0");
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
        frameId: 0
      };

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
        if (state.dragging && event.pointerId === state.pointerId) {
          updateFromPointer(event.clientX, event.clientY, 2);
        } else if (!state.dragging) {
          updateFromPointer(event.clientX, event.clientY, 1);
        }
      });

      card.addEventListener("pointerenter", function (event) {
        if (!state.dragging) {
          updateFromPointer(event.clientX, event.clientY, 1);
        }
      });

      card.addEventListener("pointerleave", function () {
        if (!state.dragging && !state.spinning) {
          settleToRest();
        }
      });

      card.addEventListener("pointerdown", function (event) {
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
        if (card.releasePointerCapture && state.pointerId === event.pointerId) {
          try {
            card.releasePointerCapture(event.pointerId);
          } catch (_err) {}
        }
        startMomentum();
      });

      card.addEventListener("pointercancel", settleToRest);
    });
  }

  initSmoothScroll();
  initNavSectionHighlight();
  initFaqAccordion();
  initCopyButtons();
  initContactForm();
  initReviewsCarousel();
  initStripeLinksTracking();
  initSceneCardsInteraction();
})();
