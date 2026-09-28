import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Group,
  Mesh,
  BoxGeometry,
  CylinderGeometry,
  CapsuleGeometry,
  TubeGeometry,
  CatmullRomCurve3,
  Vector3,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  MeshBasicMaterial,
  BufferGeometry,
  BufferAttribute,
  LineSegments,
  Points,
  ShaderMaterial,
  PMREMGenerator,
  Color,
  AdditiveBlending,
  SRGBColorSpace,
  ACESFilmicToneMapping,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/*
  La piastra: una piastra per capelli modellata in Three.js che lavora una
  ciocca vera e propria, fatta di singoli capelli (LineSegments).

  La pagina controlla lo stato con valori 0..1 (vedi `state`):
    enter   la piastra entra in scena ruotando
    clamp   0 = aperta, 1 = chiusa sulla ciocca
    glide   0 = alle radici, 1 = alle punte (i capelli già passati diventano lisci)
    leave   la piastra si apre e se ne va, la ciocca resta liscia e lucida

  Prestazioni: il rendering gira solo quando la sezione è visibile, con un
  numero di capelli ridotto su mobile e pixel ratio limitato.
*/

/* ---------------- capelli ---------------- */

const hairVertex = /* glsl */ `
  uniform float uTime;
  uniform float uY;        // quota della piastra (spazio mondo)
  uniform float uClamp;    // quanto è chiusa
  uniform float uDone;     // 1 = tutta la ciocca è liscia
  attribute float aT;      // 0 radice .. 1 punta
  attribute vec4 aSeed;
  varying float vT;
  varying float vSmooth;
  varying float vSeed;
  varying float vPress;

  void main(){
    vT = aT;
    vSeed = aSeed.w;
    float top = 2.35;
    float len = 4.7 + (aSeed.y - 0.5) * 0.35;
    float y = top - aT * len;

    // posizione "liscia": una ciocca piatta e ordinata
    float lane = (aSeed.x - 0.5);
    vec3 S = vec3(lane * 1.6 * (1.0 - aT * 0.12), y, (aSeed.z - 0.5) * 0.16);
    S.x += sin(y * 0.8 + uTime * 0.5) * 0.02;

    // posizione "crespa": onde, volume e capelli ribelli
    float ph = aSeed.y * 6.2831;
    vec3 F = S;
    float frizz = smoothstep(0.0, 0.35, aT);
    F.x += sin(aT * 16.0 + ph) * 0.11 * frizz + (aSeed.w - 0.5) * 0.55 * aT * aT;
    F.y += sin(aT * 21.0 + ph * 2.0) * 0.05 * frizz;
    F.z += cos(aT * 13.0 + ph * 1.3) * 0.22 * frizz + (aSeed.z - 0.5) * 0.5 * aT;
    F.x += sin(uTime * 0.9 + ph) * 0.015 * aT;

    // i capelli sopra la piastra sono già stati lisciati
    float passed = smoothstep(uY - 0.02, uY + 0.28, y);
    float s = max(passed * uClamp, uDone);
    // una volta lisciati restano lisci anche se la piastra si riapre
    vSmooth = s;
    vec3 p = mix(F, S, s);

    // tra le piastre i capelli vengono pressati e raccolti
    float press = exp(-pow((y - uY) / 0.16, 2.0)) * uClamp * (1.0 - uDone);
    vPress = press;
    p.z *= 1.0 - press * 0.92;
    p.x *= 1.0 - press * 0.12;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const hairFragment = /* glsl */ `
  uniform float uTime;
  uniform float uY;
  uniform vec3 uRoot;
  uniform vec3 uTip;
  varying float vT;
  varying float vSmooth;
  varying float vSeed;
  varying float vPress;

  void main(){
    vec3 col = mix(uRoot, uTip, smoothstep(0.0, 1.0, vT));
    col *= 0.8 + vSeed * 0.35;
    // riflesso "a specchio": una banda di luce che scorre sui capelli lisci
    float band = exp(-pow((vT - 0.32 - sin(uTime * 0.35) * 0.08) / 0.07, 2.0));
    float band2 = exp(-pow((vT - 0.7 - sin(uTime * 0.3 + 1.0) * 0.06) / 0.05, 2.0)) * 0.6;
    col += (band + band2) * vSmooth * vec3(0.55, 0.5, 0.52);
    // opachi e disordinati prima del passaggio
    col = mix(col * 0.78, col, vSmooth);
    // leggero bagliore caldo dove passano le piastre
    col += vPress * vec3(0.25, 0.07, 0.1);
    float a = (0.3 + vSeed * 0.5) * (1.0 - smoothstep(0.93, 1.0, vT));
    gl_FragColor = vec4(col, a);
  }
`;

function buildHair(count, segments) {
  const n = count * segments * 2;
  const g = new BufferGeometry();
  const t = new Float32Array(n);
  const seed = new Float32Array(n * 4);
  let v = 0;
  for (let i = 0; i < count; i++) {
    const s = [Math.random(), Math.random(), Math.random(), Math.random()];
    for (let j = 0; j < segments; j++) {
      for (let e = 0; e < 2; e++) {
        t[v] = (j + e) / segments;
        seed.set(s, v * 4);
        v++;
      }
    }
  }
  g.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aT', new BufferAttribute(t, 1));
  g.setAttribute('aSeed', new BufferAttribute(seed, 4));
  return g;
}

/* ---------------- vapore ---------------- */

const steamVertex = /* glsl */ `
  uniform float uTime;
  uniform float uY;
  uniform float uHeat;
  uniform float uPx;
  attribute vec3 aSeed;
  varying float vA;
  void main(){
    float life = fract(aSeed.x + uTime * (0.25 + aSeed.y * 0.2));
    vec3 p = vec3((aSeed.z - 0.5) * 1.3, uY + 0.12 + life * 0.9, 0.05 + sin(life * 6.0 + aSeed.y * 9.0) * 0.08);
    p.x += sin(life * 4.0 + aSeed.x * 20.0) * 0.08;
    vA = sin(life * 3.14159) * uHeat * 0.22;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uPx * (40.0 + aSeed.y * 50.0) * (1.0 + life) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const steamFragment = /* glsl */ `
  varying float vA;
  void main(){
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vA;
    gl_FragColor = vec4(vec3(1.0), a);
  }
`;

/* ---------------- piastra ---------------- */

function buildStraightener() {
  const root = new Group();

  const shell = new MeshPhysicalMaterial({ color: '#f4f2f0', roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const ink = new MeshPhysicalMaterial({ color: '#141418', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 });
  const plateMat = new MeshStandardMaterial({ color: '#c9c3cf', metalness: 0.9, roughness: 0.22, emissive: new Color('#6e1230'), emissiveIntensity: 0 });
  const accent = new MeshStandardMaterial({ color: '#6e1230', metalness: 0.4, roughness: 0.35 });
  const led = new MeshBasicMaterial({ color: '#ff6f93' });

  // un braccio: impugnatura arrotondata + piastra riscaldante sulla faccia interna
  function arm(side) {
    const g = new Group();
    const body = new Mesh(new CapsuleGeometry(0.2, 3.6, 8, 24), shell);
    body.rotation.z = Math.PI / 2;
    body.scale.set(1, 1, 0.55);
    body.position.set(0.9, 0, 0);
    g.add(body);
    const plate = new Mesh(new BoxGeometry(2.1, 0.3, 0.05), plateMat);
    plate.position.set(0.0, 0, -side * 0.1);
    g.add(plate);
    const grip = new Mesh(new CapsuleGeometry(0.205, 1.2, 6, 20), ink);
    grip.rotation.z = Math.PI / 2;
    grip.scale.set(1, 1, 0.58);
    grip.position.set(2.05, 0, 0);
    g.add(grip);
    g.userData.plate = plate;
    return g;
  }

  // i bracci ruotano attorno alla cerniera (asse verticale) in x = 2.85
  const hinge = new Group();
  hinge.position.set(2.85, 0, 0);
  root.add(hinge);

  const front = arm(1);
  const back = arm(-1);
  front.position.set(-2.85, 0, 0.13);
  back.position.set(-2.85, 0, -0.13);
  const frontPivot = new Group();
  const backPivot = new Group();
  frontPivot.add(front);
  backPivot.add(back);
  hinge.add(frontPivot, backPivot);

  const ring = new Mesh(new CylinderGeometry(0.2, 0.2, 0.34, 32), accent);
  ring.rotation.x = Math.PI / 2;
  hinge.add(ring);

  const dot = new Mesh(new CylinderGeometry(0.035, 0.035, 0.02, 16), led);
  dot.rotation.x = Math.PI / 2;
  dot.position.set(-0.55, 0.06, 0.24);
  hinge.add(dot);

  const cord = new Mesh(
    new TubeGeometry(
      new CatmullRomCurve3([new Vector3(0.15, 0, 0), new Vector3(0.7, -0.1, 0), new Vector3(1.3, -0.7, 0.2), new Vector3(1.6, -2.2, 0.1), new Vector3(1.5, -4, 0)]),
      48,
      0.05,
      10
    ),
    ink
  );
  hinge.add(cord);

  return { root, frontPivot, backPivot, plateMat, led };
}

/* ---------------- scena ---------------- */

export function createPiastra(canvas, { state = { enter: 0, clamp: 0, glide: 0, leave: 0 }, mobile = false, reduced = false } = {}) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new PerspectiveCamera(30, 1, 0.1, 50);

  const world = new Group();
  world.scale.setScalar(0.84);
  world.position.y = -0.18;
  scene.add(world);

  const hairMat = new ShaderMaterial({
    vertexShader: hairVertex,
    fragmentShader: hairFragment,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uY: { value: 2.6 },
      uClamp: { value: 0 },
      uDone: { value: 0 },
      uRoot: { value: new Color('#3a2319') },
      uTip: { value: new Color('#9a6a47') },
    },
  });
  const hair = new LineSegments(buildHair(mobile ? 520 : 1100, mobile ? 36 : 56), hairMat);
  hair.frustumCulled = false;
  world.add(hair);

  const steamSeeds = new Float32Array(60 * 3).map(() => Math.random());
  const steamGeo = new BufferGeometry();
  steamGeo.setAttribute('position', new BufferAttribute(new Float32Array(60 * 3), 3));
  steamGeo.setAttribute('aSeed', new BufferAttribute(steamSeeds, 3));
  const steamMat = new ShaderMaterial({
    vertexShader: steamVertex,
    fragmentShader: steamFragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uY: { value: 0 }, uHeat: { value: 0 }, uPx: { value: 1 } },
  });
  const steam = new Points(steamGeo, steamMat);
  steam.frustumCulled = false;
  world.add(steam);

  const iron = buildStraightener();
  world.add(iron.root);

  // lo stato è scritto dalla pagina e smussato a ogni frame
  const smooth = { ...state };

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // su schermi verticali la camera arretra per tenere tutto in quadro
    const fit = camera.aspect < 1 ? 1 / Math.pow(camera.aspect, 0.65) : 1;
    camera.position.set(1.6 * (camera.aspect < 1 ? 0.4 : 1), 0.55, 11 * fit);
    camera.lookAt(camera.aspect < 1 ? 0.3 : 0.9, -0.1, 0);
    camera.updateProjectionMatrix();
    steamMat.uniforms.uPx.value = dpr * h * 0.0025;
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  let visible = false;
  let running = false;
  let last = 0;
  let time = 0;

  function frame(now) {
    if (!visible || document.hidden) {
      running = false;
      return;
    }
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!reduced) time += dt;

    const k = reduced ? 1 : 1 - Math.pow(0.0008, dt);
    for (const key in state) smooth[key] += (state[key] - smooth[key]) * k;
    const { enter, clamp, glide, leave } = smooth;

    // la piastra scende dalle radici alle punte
    const y = 2.05 - glide * 4.2;
    const open = (1 - clamp) * 0.32 + leave * 0.42;

    iron.frontPivot.rotation.y = open;
    iron.backPivot.rotation.y = -open;
    iron.root.position.set(0.02 + (1 - enter) * 3 + leave * 5.5, y + (1 - enter) * 0.8 + leave * 2.4, 0);
    iron.root.rotation.set(0.08 + (1 - enter) * 0.5, (1 - enter) * -0.9 + leave * 0.6, (1 - enter) * 0.35 - leave * 0.25);
    iron.root.scale.setScalar((0.5 + enter * 0.3) * 1.0);

    const heat = clamp * (1 - leave);
    iron.plateMat.emissiveIntensity = heat * 0.35;
    iron.led.color.setRGB(0.5 + heat * 0.5, 0.25 + heat * 0.18, 0.35 + heat * 0.2);

    hairMat.uniforms.uTime.value = time;
    hairMat.uniforms.uY.value = y;
    hairMat.uniforms.uClamp.value = clamp;
    hairMat.uniforms.uDone.value = leave;
    steamMat.uniforms.uTime.value = time;
    steamMat.uniforms.uY.value = y;
    steamMat.uniforms.uHeat.value = reduced ? 0 : heat * Math.min(glide * 8, 1);

    world.rotation.y = -0.12 + Math.sin(time * 0.25) * 0.03;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  // rendering solo quando la sezione è sullo schermo
  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    },
    { rootMargin: '10% 0px' }
  );
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => visible && start());

  return { state };
}
