# Sabia Hair Planet, demo di concept

Homepage "scroll driven" per **Sabia Hair Planet**, salone di parrucchiera in via Raffaello Sanzio 13 a Pescara.
Realizzata con Vite, Three.js (shader GLSL su misura), GSAP ScrollTrigger e Lenis.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # cartella dist/, pubblicabile su Netlify (vedi netlify.toml)
```

## Cosa sappiamo del salone (fonti pubbliche)

- Titolare: Sabia Casciato. Dal brief sappiamo che partecipa attivamente alle fashion week (Milano, Londra e altre).
- Salone certificato per le **extensions Great Lengths** (capelli veri), oltre a taglio, colore, piega e acconciature.
- Telefono 085 76102, WhatsApp 329 8403364, Instagram e Facebook `@sabiahairplanet`.
- Orari: mar-ven 8:30-12:30 / 15:30-19:30, sabato 8:30-19:30, chiuso domenica e lunedì. Una fonte indica chiusura alle 20:00: **da verificare con la cliente**.
- Google: 4,7/5 (circa 38 recensioni). Ingresso, bagno e parcheggio accessibili in sedia a rotelle.

Fonti: elenco saloni Great Lengths (extensions-capelli.it), scheda Fresha, pagina Facebook, directory locali.

## Direzione visiva

**Palette** (volutamente diversa dalla demo di Luca Santilli, scura con rame e marroni):

| Token | Chiaro | Scuro |
|---|---|---|
| Sfondo, perla fredda | `#eeedea` | `#0e0e12` |
| Inchiostro blu-nero | `#111116` | `#edece8` |
| Accento, bordeaux couture | `#6e1230` | `#8a1a40` / testo `#e58aa6` |
| Tocco innovativo | riflesso perlato iridescente sugli hover e sulle piastre in titanio | idem |

**Tipografia:** Bodoni Moda (variabile, asse optical size) per i titoli, Jost per i testi.
**Spaziature:** 8 / 16 / 24 / 40 / 64 / 104 / 168 px.

**Ispirazione:** [clingr.me](https://clingr.me/en/): loader a ciocche, hero a tutta pagina con foto e tipografia leggera, card bianca che sale e si apre a schermo intero sul prodotto 3D davanti a un grande wordmark. Inoltre, dai candidati Awwwards: Gielly Green, Qiqi, Marco Ambrosi Salon.

## Il racconto dello scroll

1. **Loader:** sottili ciocche che convergono.
2. **Hero:** foto a tutta pagina, titolo in Bodoni e una piccola card "Dal backstage".
3. **La piastra:** una card sale sopra la hero e si apre a schermo intero. La piastra 3D si chiude su una ciocca di 1.100 capelli e scorre dalle radici alle punte: i capelli passano da crespi e opachi a lisci e a specchio, con il vapore e le piastre che si scaldano.
4. **Manifesto:** le parole si accendono una alla volta.
5. **Backstage:** scorrimento orizzontale tra Milano, Londra e Pescara.
6. **Servizi:** card impilate (taglio, colore, piega e acconciature).
7. **Extensions Great Lengths:** la foto si srotola come una ciocca lunga.
8. **Salone:** la finestra si apre sulla sala con vista mare.
9. **Contatti:** WhatsApp, telefono, orari e voto Google.

## Prestazioni

- Three.js viene scaricato solo quando la sezione della piastra si avvicina (import dinamico): il bundle iniziale passa da 675 kB a 142 kB.
- Il WebGL vive solo dentro la card e il rendering si ferma quando la sezione non è visibile o la scheda è in background.
- Su mobile: meno capelli (520 invece di 1.100), pixel ratio massimo 1,5, niente grana e niente blur dietro la nav.
- Icone Phosphor come SVG ufficiali inline (6 icone) al posto del font di icone (circa 230 kB in meno).
- Immagini WebP con varianti da 800 px per mobile (`srcset`).
- Rispetta `prefers-reduced-motion` e `prefers-color-scheme`, e funziona anche senza WebGL.

## Immagini

Le immagini in `public/img` sono generate con Higgsfield Soul 2, a scopo illustrativo. Prima della pubblicazione vanno sostituite con le foto reali del salone: backstage, lavori, interni.
