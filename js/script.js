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

  initSmoothScroll();
  initFaqAccordion();
  initCopyButtons();
  initContactForm();
  initReviewsCarousel();
  initStripeLinksTracking();
})();
