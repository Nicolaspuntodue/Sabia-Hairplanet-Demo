import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  IcosahedronGeometry,
  ShaderMaterial,
  Mesh,
  Group,
  BufferGeometry,
  BufferAttribute,
  LineSegments,
  Vector2,
  Color,
} from 'three';

/*
  The "Hair Planet": a liquid pearl sphere with a thin-film iridescent skin,
  orbited by rings made of individual hair strands.

  The page drives a handful of scalar states (see `state` below):
    x, y, scale    where the planet sits and how big it is
    tilt           tilt of the orbit rings (radians)
    unravel        0 = strands orbit in rings, 1 = they fall as a long curtain
                   of hair (the Great Lengths moment)
    planetAlpha    planet opacity (fades while the strands take over)
    strandAlpha    strands opacity
*/

const noise = /* glsl */ `
  // Ashima 3D simplex noise
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0);
    const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy));
    vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);
    vec3 l=1.0-g;
    vec3 i1=min(g.xyz,l.zxy);
    vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;
    vec3 x2=x0-i2+C.yyy;
    vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=0.142857142857;
    vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.0*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z);
    vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy;
    vec4 y=y_*ns.x+ns.yyyy;
    vec4 h=1.0-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy);
    vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0;
    vec4 s1=floor(b1)*2.0+1.0;
    vec4 sh=-step(h,vec4(0.0));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
    vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);
    vec3 p1=vec3(a0.zw,h.y);
    vec3 p2=vec3(a1.xy,h.z);
    vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
    m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
`;

/* ---------------- planet ---------------- */

const planetVertex = /* glsl */ `
  uniform float uTime;
  uniform float uFlow;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vN;
  ${noise}

  float field(vec3 p){
    return snoise(p * 1.1 + vec3(0.0, uTime * 0.12, uTime * 0.05)) * 0.6
         + snoise(p * 2.6 - vec3(uTime * 0.08)) * 0.25;
  }

  void main(){
    vec3 p = position;
    float n = field(normal);
    vN = n;
    vec3 displaced = p + normal * n * 0.09 * uFlow;

    // approximate the displaced normal with two neighbour samples
    vec3 t = normalize(cross(normal, vec3(0.0, 1.0, 0.001)));
    vec3 b = normalize(cross(normal, t));
    float e = 0.04;
    vec3 nA = normalize(normal + t * e);
    vec3 nB = normalize(normal + b * e);
    vec3 pA = nA * length(p) + nA * field(nA) * 0.09 * uFlow;
    vec3 pB = nB * length(p) + nB * field(nB) * 0.09 * uFlow;
    vec3 dn = normalize(cross(pA - displaced, pB - displaced));
    if (dot(dn, normal) < 0.0) dn = -dn;

    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    vNormal = normalize(normalMatrix * dn);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const planetFragment = /* glsl */ `
  uniform float uTime;
  uniform float uAlpha;
  uniform float uDark;
  uniform vec3 uInk;
  uniform vec3 uBordeaux;
  uniform vec3 uPearl;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vN;

  // soft thin-film palette: lilac, aqua, blush. Kept low in saturation so it
  // reads as pearl, not rainbow.
  vec3 film(float t){
    vec3 a = vec3(0.86, 0.85, 0.88);
    vec3 b = vec3(0.12, 0.11, 0.12);
    vec3 c = vec3(1.0);
    vec3 d = vec3(0.00, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
  }

  void main(){
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vView);
    float ndv = clamp(dot(n, v), 0.0, 1.0);
    float fres = pow(1.0 - ndv, 2.2);

    vec3 L = normalize(vec3(-0.55, 0.7, 0.6));
    float diff = clamp(dot(n, L), 0.0, 1.0);
    vec3 H = normalize(L + v);
    float spec = pow(clamp(dot(n, H), 0.0, 1.0), 90.0);
    float sheen = pow(clamp(dot(n, H), 0.0, 1.0), 12.0);

    vec3 iri = film(fres * 1.4 + vN * 0.35 + uTime * 0.02);

    // body: pearl on the lit side, sinking to a bordeaux-ink core in shadow
    vec3 shadowCol = mix(uBordeaux, uInk, 0.35);
    vec3 body = mix(shadowCol, uPearl, smoothstep(-0.15, 0.9, diff));
    body = mix(body, iri, 0.45 + fres * 0.45);
    body += sheen * 0.18 + spec * 0.9;

    // dark mode: keep the pearl luminous against the ink background
    body = mix(body, body * 0.9 + fres * iri * 0.35, uDark);

    float alpha = uAlpha * (0.96 + fres * 0.04);
    gl_FragColor = vec4(body, alpha);
  }
`;

/* ---------------- strands ---------------- */

const strandVertex = /* glsl */ `
  uniform float uTime;
  uniform float uUnravel;
  uniform float uTilt;
  uniform float uSpin;
  uniform float uAspect;
  uniform vec2 uMouse;

  attribute float aT;     // 0..1 along the strand
  attribute vec4 aSeed;   // x: lane, y: phase, z: ring, w: random

  varying float vT;
  varying float vSeed;
  varying float vDepth;

  mat3 rotX(float a){ float c=cos(a), s=sin(a); return mat3(1.0,0.0,0.0, 0.0,c,-s, 0.0,s,c); }
  mat3 rotY(float a){ float c=cos(a), s=sin(a); return mat3(c,0.0,s, 0.0,1.0,0.0, -s,0.0,c); }
  mat3 rotZ(float a){ float c=cos(a), s=sin(a); return mat3(c,-s,0.0, s,c,0.0, 0.0,0.0,1.0); }

  void main(){
    vT = aT;
    vSeed = aSeed.w;

    // A: strand lying on an orbit ring
    float ring = aSeed.z;                         // 0, 1, 2
    float radius = 1.7 + ring * 0.5 + (aSeed.x - 0.5) * 0.46;
    float arc = 0.55 + aSeed.w * 0.5;             // strand angular length
    float speed = 0.05 + ring * 0.018;
    float ang = aSeed.y * 6.28318 + aT * arc + uTime * speed;
    vec3 A = vec3(cos(ang) * radius, (aSeed.x - 0.5) * 0.06 + sin(aT * 7.0 + aSeed.y * 40.0 + uTime) * 0.025, sin(ang) * radius);
    A = rotZ(-0.32 + ring * 0.22) * rotX(uTilt + ring * 0.12) * rotY(uSpin) * A;

    // B: long hair curtain falling from above the viewport
    float lane = (aSeed.y - 0.5) * 2.0;
    float width = 1.3 * max(uAspect, 0.8);
    float len = 7.5 + aSeed.w * 1.6;
    vec3 B;
    B.x = lane * width + sin(aT * 3.0 + uTime * 0.5 + aSeed.y * 12.0) * 0.12 * aT;
    B.y = 4.2 - aT * len;
    B.z = (aSeed.x - 0.5) * 1.2 + cos(aT * 2.4 + uTime * 0.4 + lane * 3.0) * 0.35 * aT;
    // gentle S-wave through the lengths, like blow-dried extensions
    B.x += sin(B.y * 0.9 + uTime * 0.6 + lane) * 0.18 * aT;
    B.x += uMouse.x * 0.35 * aT * aT;

    // strands peel off one after another instead of all at once
    float k = smoothstep(aSeed.w * 0.45, aSeed.w * 0.45 + 0.55, uUnravel);
    vec3 p = mix(A, B, k);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = clamp((-mv.z - 3.0) / 6.0, 0.0, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const strandFragment = /* glsl */ `
  uniform float uAlpha;
  uniform float uUnravel;
  uniform float uDark;
  uniform vec3 uInk;
  uniform vec3 uBordeaux;
  uniform vec3 uPearl;
  varying float vT;
  varying float vSeed;
  varying float vDepth;

  void main(){
    // root in ink, lengths in bordeaux, tips catching the pearl light
    vec3 light = mix(uInk, uBordeaux, smoothstep(0.1, 0.7, vT));
    light = mix(light, vec3(0.78, 0.74, 0.86), smoothstep(0.75, 1.0, vT) * 0.5);
    vec3 dark = mix(uPearl, vec3(0.93, 0.62, 0.72), smoothstep(0.2, 1.0, vT) * 0.6);
    vec3 col = mix(light, dark, uDark);
    float fade = smoothstep(0.0, 0.08, vT) * (1.0 - smoothstep(0.9, 1.0, vT));
    float a = uAlpha * fade * mix(0.18, 0.5, vSeed * vSeed) * (1.0 - vDepth * 0.5) * mix(1.0, 1.5, uUnravel);
    gl_FragColor = vec4(col, a);
  }
`;

function buildStrands(count, segments) {
  const verts = count * segments * 2;
  const pos = new Float32Array(verts * 3);
  const t = new Float32Array(verts);
  const seed = new Float32Array(verts * 4);
  let v = 0;
  for (let i = 0; i < count; i++) {
    const s = [Math.random(), Math.random(), Math.floor(Math.random() * 3), Math.random()];
    for (let j = 0; j < segments; j++) {
      for (let e = 0; e < 2; e++) {
        t[v] = (j + e) / segments;
        seed.set(s, v * 4);
        v++;
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aT', new BufferAttribute(t, 1));
  g.setAttribute('aSeed', new BufferAttribute(seed, 4));
  return g;
}

export function createPlanet(canvas, { reduced = false } = {}) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const dark = window.matchMedia('(prefers-color-scheme: dark)');
  const palette = {
    uInk: { value: new Color('#111116') },
    uBordeaux: { value: new Color('#6e1230') },
    uPearl: { value: new Color('#f3f1f4') },
    uDark: { value: dark.matches ? 1 : 0 },
  };
  dark.addEventListener?.('change', (e) => (palette.uDark.value = e.matches ? 1 : 0));

  const group = new Group();
  scene.add(group);

  const planetMat = new ShaderMaterial({
    vertexShader: planetVertex,
    fragmentShader: planetFragment,
    transparent: true,
    uniforms: { uTime: { value: 0 }, uFlow: { value: 1 }, uAlpha: { value: 1 }, ...palette },
  });
  const planet = new Mesh(new IcosahedronGeometry(1.25, 48), planetMat);
  group.add(planet);

  const mobile = window.matchMedia('(max-width: 767px)').matches;
  const strandMat = new ShaderMaterial({
    vertexShader: strandVertex,
    fragmentShader: strandFragment,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uUnravel: { value: 0 },
      uTilt: { value: 1.2 },
      uSpin: { value: 0 },
      uAlpha: { value: 1 },
      uAspect: { value: 1 },
      uMouse: { value: new Vector2() },
      ...palette,
    },
  });
  const strands = new LineSegments(buildStrands(mobile ? 1200 : 2600, 22), strandMat);
  strands.frustumCulled = false;
  group.add(strands);

  // targets written by the page, smoothed every frame
  const state = { x: 0.9, y: 0.55, scale: 0.9, tilt: 0.38, unravel: 0, planetAlpha: 1, strandAlpha: 1 };
  const smooth = { ...state };
  const mouse = new Vector2();
  const mouseSmooth = new Vector2();

  if (!reduced) {
    window.addEventListener('pointermove', (e) => {
      mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    });
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    strandMat.uniforms.uAspect.value = w / h;
  }
  resize();
  window.addEventListener('resize', resize);

  let running = true;
  let last = performance.now();
  let time = 0;

  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!reduced) time += dt;

    const k = reduced ? 1 : 1 - Math.pow(0.0025, dt);
    for (const key in state) smooth[key] += (state[key] - smooth[key]) * k;
    mouseSmooth.lerp(mouse, reduced ? 1 : 1 - Math.pow(0.02, dt));

    // on narrow screens keep the planet inside the viewport
    const narrow = Math.min(Math.max(camera.aspect / 1.2, 0.45), 1);
    group.position.set(smooth.x * narrow + mouseSmooth.x * 0.12, smooth.y + mouseSmooth.y * 0.1, 0);
    // the curtain keeps full size; the planet and rings shrink on portrait screens
    group.scale.setScalar(smooth.scale * (narrow + (1 - narrow) * smooth.unravel));
    group.rotation.y = mouseSmooth.x * 0.15 * (1 - smooth.unravel);
    group.rotation.x = mouseSmooth.y * -0.08 * (1 - smooth.unravel);
    planet.rotation.y = time * 0.08;

    planetMat.uniforms.uTime.value = time;
    planetMat.uniforms.uAlpha.value = smooth.planetAlpha;
    planet.visible = smooth.planetAlpha > 0.01;
    // a fading planet must not punch a hole in the strands behind it
    planetMat.depthWrite = smooth.planetAlpha > 0.97;
    strandMat.uniforms.uTime.value = time;
    strandMat.uniforms.uUnravel.value = smooth.unravel;
    strandMat.uniforms.uTilt.value = smooth.tilt;
    strandMat.uniforms.uSpin.value = time * 0.05;
    strandMat.uniforms.uAlpha.value = smooth.strandAlpha;
    strandMat.uniforms.uMouse.value.copy(mouseSmooth);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) {
      last = performance.now();
      requestAnimationFrame(frame);
    }
  });

  return { state };
}
