import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/jost/wght.css';
import '@phosphor-icons/web/regular';
import './style.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createPlanet } from './planet.js';

gsap.registerPlugin(ScrollTrigger);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- WebGL planet ---------- */

let planet = null;
try {
  planet = createPlanet($('#planet'), { reduced });
} catch (err) {
  // no WebGL: the page still works, only the planet is missing
  $('#planet').remove();
  console.warn('WebGL non disponibile', err);
}

/* ---------- smooth scroll ---------- */

let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 1.6 });
    else if (target === 0) window.scrollTo(0, 0);
    else target.scrollIntoView();
  });
});

/* ---------- nav ---------- */

const nav = $('#nav');
ScrollTrigger.create({
  start: 0,
  end: 'max',
  onUpdate(self) {
    const y = self.scroll();
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-hidden', !reduced && y > 400 && self.direction === 1);
  },
});

/* ---------- text splitting ---------- */

$$('.split').forEach((el) => {
  const text = el.textContent;
  el.textContent = '';
  el.setAttribute('aria-label', text);
  text.split(' ').forEach((word, wi) => {
    if (wi) el.appendChild(document.createTextNode(' '));
    const w = document.createElement('span');
    w.className = 'word';
    w.setAttribute('aria-hidden', 'true');
    [...word].forEach((ch) => {
      const c = document.createElement('span');
      c.className = 'char';
      c.textContent = ch;
      w.appendChild(c);
    });
    el.appendChild(w);
  });
});

const manifesto = $('[data-words]');
{
  const words = manifesto.textContent.trim().split(/\s+/);
  manifesto.textContent = '';
  words.forEach((w, i) => {
    const s = document.createElement('span');
    s.className = 'w';
    s.textContent = w;
    manifesto.appendChild(s);
    if (i < words.length - 1) manifesto.appendChild(document.createTextNode(' '));
  });
}

/* ---------- motion ---------- */

if (!reduced) {
  // hero entrance
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
  intro
    .from('.hero__title .char', { yPercent: 115, duration: 1.4, stagger: 0.035 }, 0.15)
    .from('.hero__photo', { clipPath: 'inset(100% 0 0 0)', duration: 1.6, ease: 'expo.inOut' }, 0)
    .to('.hero__photo img', { scale: 1, duration: 2.2 }, 0.2)
    .from(['.hero .eyebrow', '.hero__lead', '.hero__cta'], { y: 24, opacity: 0, duration: 1.1, stagger: 0.08 }, 0.7)
    .from('.nav', { y: -20, opacity: 0, duration: 1 }, 0.9);
  if (planet) {
    const s = planet.state;
    s.scale = 0.2;
    s.strandAlpha = 0;
    intro.to(s, { scale: 0.9, strandAlpha: 1, duration: 2.4, ease: 'expo.out' }, 0.2);
  }

  // hero photo drifts slower than the page
  gsap.to('.hero__photo', {
    yPercent: -18,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  // manifesto: pinned, words light up one by one
  gsap.to('.manifesto__text .w', {
    opacity: 1,
    stagger: 0.12,
    ease: 'none',
    scrollTrigger: { trigger: '.manifesto', start: 'top top', end: '+=130%', pin: true, scrub: 0.6 },
  });

  const mm = gsap.matchMedia();

  // backstage: vertical scroll becomes a horizontal pan (desktop and tablet)
  mm.add('(min-width: 768px)', () => {
    const track = $('.backstage__track');
    const distance = () => track.scrollWidth - window.innerWidth;
    const pan = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: '.backstage',
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });
    $$('.panel--photo img').forEach((img) => {
      gsap.to(img, {
        scale: 1,
        xPercent: -6,
        ease: 'none',
        scrollTrigger: { trigger: img.parentElement, containerAnimation: pan, start: 'left right', end: 'right left', scrub: true },
      });
    });
    gsap.from('.city', {
      yPercent: 60,
      opacity: 0,
      stagger: 0.15,
      ease: 'expo.out',
      scrollTrigger: { trigger: '.panel--cities', containerAnimation: pan, start: 'left 80%', end: 'left 30%', scrub: true },
    });

    // salone: the window opens up to the whole room
    const salone = gsap.timeline({
      scrollTrigger: { trigger: '.salone', start: 'top top', end: '+=120%', pin: true, scrub: 0.8 },
    });
    salone
      .fromTo('.salone__frame', { clipPath: 'inset(24% 27% 24% 27%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut', duration: 1 })
      .fromTo('.salone__frame img', { scale: 1.25 }, { scale: 1, ease: 'power2.inOut', duration: 1 }, 0)
      .to('.salone__caption', { opacity: 1, duration: 0.3 }, 0.75);
  });

  // servizi: real sticky stack, the previous card recedes as the next arrives
  const cards = $$('.stack__card');
  cards.forEach((card, i) => {
    if (i === cards.length - 1) return;
    gsap.to(card, {
      scale: 0.92,
      ease: 'none',
      scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 12%', scrub: true },
    });
  });

  // extensions: the real hair unrolls downward, over the falling strands
  gsap.to('.extensions__photo', {
    clipPath: 'inset(0 0 0% 0)',
    ease: 'power2.inOut',
    scrollTrigger: { trigger: '.extensions', start: 'top 35%', end: 'center 40%', scrub: 0.8 },
  });

  // gentle reveal for section headings (hierarchy, once)
  $$('.servizi__title, .visita__title, .extensions__copy > *, .info').forEach((el) => {
    gsap.from(el, {
      y: 40,
      opacity: 0,
      duration: 1.2,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
}

/* ---------- planet story, keyed to sections ---------- */

if (planet && !reduced) {
  const s = planet.state;
  // one keyframe per section; each blends in while its section rises into view
  const keys = [
    ['.hero', { x: 0.9, y: 0.55, scale: 0.9, tilt: 0.38, unravel: 0, planetAlpha: 1, strandAlpha: 1 }],
    ['.manifesto', { x: 0, y: 0, scale: 1.5, tilt: 0.3, unravel: 0, planetAlpha: 0.42, strandAlpha: 0.3 }],
    ['.backstage', { x: -0.3, y: -2.0, scale: 0.5, tilt: 0.55, unravel: 0, planetAlpha: 1, strandAlpha: 1 }],
    ['.servizi', { x: 3.3, y: 1.7, scale: 0.45, tilt: 0.3, unravel: 0, planetAlpha: 1, strandAlpha: 1 }],
    ['.extensions', { x: 2.5, y: 0, scale: 1, tilt: 1.0, unravel: 1, planetAlpha: 0, strandAlpha: 0.85 }],
    ['.salone', { x: 0, y: 0, scale: 0.6, tilt: 1.2, unravel: 0, planetAlpha: 0, strandAlpha: 0 }],
    ['.visita', { x: 2.9, y: 1.75, scale: 0.5, tilt: 0.42, unravel: 0, planetAlpha: 1, strandAlpha: 1 }],
  ];
  const base = keys[0][1];
  const triggers = keys.slice(1).map(([sel]) =>
    ScrollTrigger.create({ trigger: sel, start: 'top bottom', end: 'top 20%' })
  );
  const ease = gsap.parseEase('power2.inOut');

  gsap.ticker.add(() => {
    const out = { ...base };
    triggers.forEach((st, i) => {
      const p = ease(st.progress);
      if (p <= 0) return;
      const k = keys[i + 1][1];
      for (const key in out) out[key] += (k[key] - out[key]) * p;
    });
    // the intro tween owns scale and strandAlpha until it has finished
    if (!gsap.isTweening(s)) Object.assign(s, out);
    else Object.assign(s, { ...out, scale: s.scale, strandAlpha: s.strandAlpha });
  });
}

window.addEventListener('load', () => ScrollTrigger.refresh());
