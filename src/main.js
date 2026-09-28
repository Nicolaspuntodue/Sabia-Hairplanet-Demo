import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/jost/wght.css';
import './style.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = window.matchMedia('(max-width: 767px)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- icone Phosphor (SVG ufficiali, solo quelle usate) ---------- */

const icons = import.meta.glob(
  '/node_modules/@phosphor-icons/core/assets/regular/{map-pin,clock,calendar-check,whatsapp-logo,phone,arrow-down-right}.svg',
  { query: '?raw', import: 'default', eager: true }
);
$$('i.ph').forEach((el) => {
  const name = [...el.classList].find((c) => c.startsWith('ph-')).slice(3);
  const svg = Object.entries(icons).find(([path]) => path.endsWith(`/${name}.svg`));
  if (svg) el.innerHTML = svg[1];
});

/* ---------- piastra 3D, caricata solo quando serve ---------- */

// lo stato vive qui, così la timeline di scroll funziona anche prima che
// Three.js sia stato scaricato
const piastra = { enter: 0, clamp: 0, glide: 0, leave: 0 };
const canvas = $('.stage__canvas');

function loadPiastra() {
  import('./piastra.js')
    .then(({ createPiastra }) => createPiastra(canvas, { state: piastra, mobile, reduced }))
    .catch((err) => {
      // senza WebGL la pagina funziona lo stesso, manca solo la scena 3D
      canvas.remove();
      console.warn('WebGL non disponibile', err);
    });
}

new IntersectionObserver(
  (entries, obs) => {
    if (entries.some((e) => e.isIntersecting)) {
      obs.disconnect();
      loadPiastra();
    }
  },
  { rootMargin: '100% 0px' }
).observe(canvas);

/* ---------- scroll morbido ---------- */

let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
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

/* ---------- navigazione ---------- */

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

/* ---------- suddivisione del testo ---------- */

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

/* ---------- loader e ingresso ---------- */

function reveal() {
  if (!document.body.classList.contains('is-loading')) return;
  document.body.classList.remove('is-loading');
  if (reduced) return;
  gsap
    .timeline({ defaults: { ease: 'expo.out' } })
    .from('.hero__bg img', { scale: 1.12, duration: 2.4 }, 0)
    .from('.hero__title .char', { yPercent: 115, duration: 1.4, stagger: 0.035 }, 0.2)
    .from(['.hero__lead', '.hero__cta'], { y: 24, opacity: 0, duration: 1.1, stagger: 0.08 }, 0.7)
    .from('.hero__card', { y: 40, opacity: 0, duration: 1.2 }, 0.8)
    .from('.nav', { y: -20, opacity: 0, duration: 1 }, 0.9);
}

// il loader resta il tempo dell'animazione delle ciocche, mai più di 2,2 secondi
const heroImg = $('.hero__bg img');
Promise.race([
  Promise.all([
    document.fonts.ready,
    heroImg.decode ? heroImg.decode().catch(() => {}) : Promise.resolve(),
    new Promise((r) => setTimeout(r, reduced ? 0 : 1300)),
  ]),
  new Promise((r) => setTimeout(r, 2200)),
]).then(reveal);

/* ---------- movimento ---------- */

if (reduced) {
  // stato finale statico: la piastra chiusa a metà ciocca
  Object.assign(piastra, { enter: 1, clamp: 1, glide: 0.45, leave: 0 });
} else {
  // la piastra: la card sale sopra la hero, si apre a tutto schermo,
  // la piastra si chiude sulla ciocca e la liscia dalle radici alle punte
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '.stage', start: 'top top', end: mobile ? '+=260%' : '+=320%', pin: true, scrub: 0.8 },
  });
  tl.to('.stage__card', { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1, ease: 'power2.inOut' }, 0)
    .to('.hero', { scale: 0.92, duration: 1, ease: 'power2.inOut' }, 0)
    .fromTo('.stage__word', { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 1, ease: 'power2.out' }, 0)
    .to(piastra, { enter: 1, duration: 1, ease: 'power2.out' }, 0.1)
    .to(piastra, { clamp: 1, duration: 0.45, ease: 'power2.inOut' }, 1.05)
    .to('.stage__copy--a', { opacity: 1, y: 0, duration: 0.5 }, 1.2)
    .to(piastra, { glide: 1, duration: 2.6, ease: 'power1.inOut' }, 1.5)
    .to('.stage__word', { yPercent: -6, duration: 2.6 }, 1.5)
    .to(piastra, { leave: 1, duration: 0.7, ease: 'power2.inOut' }, 4.15)
    .to('.stage__copy--b', { opacity: 1, duration: 0.5 }, 4.3)
    .to({}, { duration: 0.3 }, 4.85);
  gsap.set('.stage__copy--a', { y: 30 });

  // manifesto: fermo, le parole si accendono una alla volta
  gsap.to('.manifesto__text .w', {
    opacity: 1,
    stagger: 0.12,
    ease: 'none',
    scrollTrigger: { trigger: '.manifesto', start: 'top top', end: '+=130%', pin: true, scrub: 0.6 },
  });

  const mm = gsap.matchMedia();

  // backstage: lo scroll verticale diventa uno scorrimento orizzontale (desktop e tablet)
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
  });

  // salone: la finestra si apre su tutta la sala, su desktop e su mobile
  mm.add({ small: '(max-width: 767px)', large: '(min-width: 768px)' }, (ctx) => {
    const start = ctx.conditions.small ? 'inset(30% 10% 30% 10%)' : 'inset(24% 27% 24% 27%)';
    gsap
      .timeline({ scrollTrigger: { trigger: '.salone', start: 'top top', end: ctx.conditions.small ? '+=90%' : '+=120%', pin: true, scrub: 0.8 } })
      .fromTo('.salone__frame', { clipPath: start }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut', duration: 1 })
      .fromTo('.salone__frame img', { scale: 1.25 }, { scale: 1, ease: 'power2.inOut', duration: 1 }, 0)
      .to('.salone__caption', { opacity: 1, duration: 0.3 }, 0.75);
  });

  // servizi: card impilate, la precedente arretra quando arriva la successiva
  const cards = $$('.stack__card');
  cards.forEach((card, i) => {
    if (i === cards.length - 1) return;
    gsap.to(card, {
      scale: 0.92,
      ease: 'none',
      scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 12%', scrub: true },
    });
  });

  // extensions: la foto si srotola verso il basso, come una ciocca lunga
  gsap.to('.extensions__photo', {
    clipPath: 'inset(0 0 0% 0)',
    ease: 'power2.inOut',
    scrollTrigger: { trigger: '.extensions', start: 'top 70%', end: 'center 45%', scrub: 0.8 },
  });

  // comparsa leggera dei titoli (gerarchia, una volta sola)
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

window.addEventListener('load', () => ScrollTrigger.refresh());
