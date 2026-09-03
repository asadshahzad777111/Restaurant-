(() => {
  const targets = document.querySelectorAll(".brand-hero, .lede, .cta-row, .strip, .visit");
  targets.forEach((el, i) => {
    el.classList.add("reveal");
    el.style.animationDelay = `${i * 90}ms`;
  });

  const cta = document.querySelector(".cta:not(.secondary)");
  if (!cta) return;
  let on = false;
  setInterval(() => {
    on = !on;
    cta.style.filter = on ? "brightness(1.08)" : "none";
  }, 1600);
})();
