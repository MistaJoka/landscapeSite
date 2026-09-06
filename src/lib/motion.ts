const supportsScrollTimeline =
  typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()');

const prefersReducedMotion =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function observeReveals(): void {
  const targets = document.querySelectorAll<HTMLElement>('.reveal:not(.reveal-in)');
  if (targets.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('reveal-in');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
  );

  targets.forEach((target) => observer.observe(target));
}

if (!supportsScrollTimeline && !prefersReducedMotion) {
  document.documentElement.classList.add('js');
  observeReveals();
  document.addEventListener('astro:after-swap', observeReveals);
}
