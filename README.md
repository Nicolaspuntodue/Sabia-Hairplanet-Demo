# Sabia Hair Planet, demo concept

A scroll-driven homepage concept for **Sabia Hair Planet**, a hair salon at Via Raffaello Sanzio 13, Pescara.
Built with Vite, Three.js (custom GLSL), GSAP ScrollTrigger and Lenis.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # output in dist/, deployable on Netlify (see netlify.toml)
```

## What we know about the business (public sources)

- Owner: Sabia Casciato. The brief says she actively works the fashion weeks (Milan, London and others).
- Certified **Great Lengths** extensions salon (real-hair extensions), plus cutting, colour and styling.
- Phone 085 76102, WhatsApp 329 8403364, Instagram and Facebook `@sabiahairplanet`.
- Hours: Tue-Fri 8:30-12:30 / 15:30-19:30, Sat 8:30-19:30, closed Sun-Mon. One source lists closing at 20:00, so **check with the client**.
- Google rating 4.7/5 (about 38 reviews). Wheelchair-accessible entrance, restroom and parking.
- The official website (business.site) is offline.

Sources: extensions-capelli.it (Great Lengths salon directory), Fresha listing, Facebook page, local directories.

## Design direction

**Design read:** a fashion-editorial landing page for style-conscious clients in Pescara, in a runway/backstage language.
Dials: variance 8, motion 8, density 3.

**Palette** (deliberately different from the Luca Santilli demo, which is dark with copper and brown tones):

| Token | Light | Dark |
|---|---|---|
| Background, cool pearl | `#eeedea` | `#0e0e12` |
| Ink, blue-black | `#111116` | `#edece8` |
| Accent, couture bordeaux | `#6e1230` | `#8a1a40` / text `#e58aa6` |
| Innovation touch | iridescent pearl (lilac, aqua, blush), used only on the WebGL planet and on hover sheens | same |

**Type:** Bodoni Moda (variable, optical-size axis) for display, the typeface of fashion magazines. Jost for body text.
**Shape rule:** images are sharp-cornered, interactive controls are full pills.
**Spacing scale:** 8 / 16 / 24 / 40 / 64 / 104 / 168 px.

**Inspiration** (Awwwards salon/beauty nominees): Gielly Green London (ivory and bordeaux luxury), Qiqi (oversized editorial type over portraits), Marco Ambrosi Salon (an Italian extensions and colour stylist, GSAP-driven).

## Scroll story

1. **Hero:** a liquid-pearl planet with thin-film iridescence, orbited by Saturn-like rings made of 2,600 individual hair strands.
2. **Manifesto:** pinned. Words light up as you scroll, and the planet grows behind them.
3. **Backstage:** vertical scroll turns into a horizontal pan through Milan, London and Pescara.
4. **Services:** a sticky card stack (cut, colour, styling).
5. **Great Lengths extensions:** the ring strands peel off and fall as a long curtain of hair, and the real photo unrolls over them.
6. **Salon:** a pinned window opens onto the whole room.
7. **Visit:** address, hours, WhatsApp and phone, Google rating.

Supports `prefers-reduced-motion` (no pins, no smooth scroll, static planet) and `prefers-color-scheme` (full dark theme, including shader colours). Works without WebGL too.

## Images

The 6 images in `public/img` are AI-generated (Higgsfield Soul 2), used for illustration only. Replace them with the salon's real photos (backstage, work, interior) before going live.
