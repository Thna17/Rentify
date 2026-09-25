import React, { useEffect, useRef } from 'react';
import { SHOWCASE } from '../../../data/templateMedia';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const MARKETPLACE_TEXTURE = '/rentify/marketplace.webp';
const DASHBOARD_TEXTURE = '/rentify/dashboard.webp';
// MacBook model from pmndrs/examples (MIT), Draco-compressed
const MACBOOK_MODEL = '/rentify/mac-draco.glb';
const DRACO_DECODER_PATH = '/rentify/draco/';

// The storefront story shown after the camera dives into the laptop screen
const STORE_CAPTIONS = [
  {
    eyebrow: 'Rentify Marketplace',
    title: 'Your shop, in front of more of Cambodia.',
    body: 'Shoppers browse many local stores in one place. Your products can appear there too, with the prices you set.',
  },
  {
    eyebrow: 'Your storefront',
    title: 'A store with your own brand.',
    body: 'Pick a template, add your logo and colors, and share one link for your whole shop.',
  },
  {
    eyebrow: 'Checkout',
    title: 'Paid by KHQR, confirmed for you.',
    body: 'Customers scan and pay with their bank app. The payment is confirmed automatically.',
  },
];

// KHQR checkout screen drawn onto a canvas for the laptop display
const makeCheckoutTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d');
  const font = (weight, size) => `${weight} ${size}px -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif`;
  const box = (x, y, w, h, r, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  };

  box(0, 0, 1600, 1000, 0, '#eef1f5');
  box(590, 150, 420, 640, 36, '#ffffff');
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(590, 150, 420, 640, 36);
  ctx.clip();
  ctx.fillStyle = '#e1232e';
  ctx.fillRect(590, 150, 420, 110);
  ctx.restore();
  ctx.font = font(700, 40);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('K H Q R', 800, 220);

  ctx.textAlign = 'left';
  ctx.font = font(500, 24);
  ctx.fillStyle = '#6e6e73';
  ctx.fillText('Aura Botanicals', 630, 310);
  ctx.font = font(700, 56);
  ctx.fillStyle = '#1d1d1f';
  ctx.fillText('24.00', 630, 372);
  ctx.font = font(500, 24);
  ctx.fillStyle = '#6e6e73';
  ctx.fillText('USD', 790, 372);
  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = '#d2d2d7';
  ctx.beginPath();
  ctx.moveTo(630, 402);
  ctx.lineTo(970, 402);
  ctx.stroke();
  ctx.setLineDash([]);

  // Illustrative QR pattern (not scannable)
  const size = 25;
  const cell = 13;
  const qx = 800 - (size * cell) / 2;
  const qy = 428;
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const nearFinder = (x, y) =>
    [[0, 0], [size - 7, 0], [0, size - 7]].some(([fx, fy]) => x >= fx - 1 && x <= fx + 7 && y >= fy - 1 && y <= fy + 7);
  ctx.fillStyle = '#111111';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (nearFinder(x, y) || (Math.abs(x - 12) <= 2 && Math.abs(y - 12) <= 2)) continue;
      if (random() > 0.5) ctx.fillRect(qx + x * cell, qy + y * cell, cell, cell);
    }
  }
  [[0, 0], [size - 7, 0], [0, size - 7]].forEach(([fx, fy]) => {
    box(qx + fx * cell, qy + fy * cell, 7 * cell, 7 * cell, 14, '#111111');
    box(qx + (fx + 1) * cell, qy + (fy + 1) * cell, 5 * cell, 5 * cell, 9, '#ffffff');
    box(qx + (fx + 2) * cell, qy + (fy + 2) * cell, 3 * cell, 3 * cell, 6, '#111111');
  });
  ctx.fillStyle = '#e1232e';
  ctx.beginPath();
  ctx.arc(800, qy + 12.5 * cell, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = font(700, 34);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('$', 800, qy + 12.5 * cell + 12);

  box(650, 830, 300, 60, 30, '#e3f5e8');
  ctx.font = font(600, 24);
  ctx.fillStyle = '#1a7f37';
  ctx.fillText('✓  Payment received', 800, 868);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

// Point-of-sale screen drawn onto a canvas, used as the laptop display texture
const makePosTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d');
  const font = (weight, size) => `${weight} ${size}px -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif`;
  const box = (x, y, w, h, r, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  };
  const text = (value, x, y, weight, size, color, align = 'left') => {
    ctx.font = font(weight, size);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(value, x, y);
  };

  box(0, 0, 1600, 1000, 0, '#f5f5f7');
  box(0, 0, 1600, 76, 0, '#ffffff');
  text('Rentify POS', 40, 48, 700, 28, '#1d1d1f');
  text('Aura Botanicals · Register 1', 1560, 48, 500, 22, '#6e6e73', 'right');

  ['All', 'Cleansers', 'Serums', 'Moisturizers'].forEach((label, i) => {
    box(40 + i * 170, 108, 150, 48, 24, i === 0 ? '#1d1d1f' : '#ffffff');
    text(label, 115 + i * 170, 140, 600, 20, i === 0 ? '#ffffff' : '#424245', 'center');
  });

  const products = [
    ['Foaming Cleanser', '$24.00', ['#e8e3f7', '#b9acea']],
    ['Balancing Toner', '$22.00', ['#dcefe6', '#9fd3b9']],
    ['Hydrating Serum', '$18.00', ['#fdebd9', '#f5c08b']],
    ['Vitamin C Serum', '$26.00', ['#fff3cc', '#f2cf5b']],
    ['Daily Moisturizer', '$21.00', ['#e1ecfb', '#9fc0f0']],
    ['Night Cream', '$28.00', ['#f3e1e8', '#dca3b9']],
  ];
  products.forEach(([name, price, [from, to]], i) => {
    const x = 40 + (i % 3) * 330;
    const y = 190 + Math.floor(i / 3) * 380;
    box(x, y, 310, 350, 22, '#ffffff');
    const gradient = ctx.createLinearGradient(x, y, x + 310, y + 240);
    gradient.addColorStop(0, from);
    gradient.addColorStop(1, to);
    box(x + 14, y + 14, 282, 240, 16, gradient);
    text(name, x + 24, y + 294, 600, 22, '#1d1d1f');
    text(price, x + 24, y + 328, 500, 20, '#6e6e73');
  });

  box(1060, 108, 500, 852, 24, '#ffffff');
  text('Current sale', 1090, 160, 700, 28, '#1d1d1f');
  [['Foaming Cleanser × 1', '$24.00'], ['Hydrating Serum × 2', '$36.00'], ['Night Cream × 1', '$28.00']].forEach(
    ([item, price], i) => {
      text(item, 1090, 230 + i * 56, 500, 22, '#424245');
      text(price, 1530, 230 + i * 56, 600, 22, '#1d1d1f', 'right');
    }
  );
  box(1090, 660, 440, 2, 0, '#e8e8ed');
  text('Total', 1090, 716, 600, 26, '#1d1d1f');
  text('$88.00', 1530, 718, 700, 34, '#1d1d1f', 'right');
  box(1090, 756, 210, 56, 28, '#fde8e9');
  text('KHQR', 1195, 792, 700, 22, '#e1232e', 'center');
  box(1320, 756, 210, 56, 28, '#f0f0f2');
  text('Cash', 1425, 792, 600, 22, '#424245', 'center');
  box(1090, 830, 440, 72, 36, '#0071e3');
  text('Charge $88.00', 1310, 876, 700, 26, '#ffffff', 'center');

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

// A MacBook Pro–style laptop built in code: aluminum unibody, black glass
// display with a notch, full keyboard, speaker grilles, trackpad and hinge.
const W = 3.7; // body width
const D = 2.5; // body depth
const T = 0.1; // base thickness
const H = 2.42; // lid height

const makeMacBook = (marketplaceTexture, dashboardTexture, posTexture, storefrontTexture, checkoutTexture) => {
  const root = new THREE.Group();

  const aluminum = new THREE.MeshPhysicalMaterial({
    color: 0xd4d7dc,
    metalness: 1,
    roughness: 0.34,
    clearcoat: 0.25,
    clearcoatRoughness: 0.4,
  });
  const keyMaterial = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.55 });
  const wellMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2b2e, metalness: 0.4, roughness: 0.6 });
  const grilleMaterial = new THREE.MeshStandardMaterial({ color: 0x8d9097, metalness: 0.8, roughness: 0.55 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: 0.06, clearcoat: 1 });
  const hingeMaterial = new THREE.MeshStandardMaterial({ color: 0x2c2d30, metalness: 0.7, roughness: 0.35 });

  // Base unibody
  const base = new THREE.Mesh(new RoundedBoxGeometry(W, T, D, 4, 0.05), aluminum);
  base.position.y = T / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  root.add(base);
  const top = T + 0.001;

  // Keyboard well and keys
  const wellDepth = 1.12;
  const wellZ = -D / 2 + 0.2 + wellDepth / 2;
  const well = new THREE.Mesh(new RoundedBoxGeometry(2.95, 0.004, wellDepth, 2, 0.002), wellMaterial);
  well.position.set(0, top, wellZ);
  root.add(well);

  const cols = 14;
  const pitch = 2.95 / cols;
  const keySize = pitch * 0.86;
  const rowHeights = [0.1, keySize, keySize, keySize, keySize, keySize];
  const rowGap = (wellDepth - rowHeights.reduce((a, b) => a + b, 0)) / (rowHeights.length + 1);
  const keyGeometry = new RoundedBoxGeometry(1, 0.012, 1, 2, 0.004);
  const keys = new THREE.InstancedMesh(keyGeometry, keyMaterial, cols * rowHeights.length);
  const matrix = new THREE.Matrix4();
  let count = 0;
  let z = wellZ - wellDepth / 2 + rowGap;
  rowHeights.forEach((height, row) => {
    const isBottom = row === rowHeights.length - 1;
    for (let col = 0; col < cols; col++) {
      // The bottom row leaves room for the wide space bar
      if (isBottom && col >= 4 && col <= 9) continue;
      const x = -2.95 / 2 + pitch * (col + 0.5);
      matrix.compose(
        new THREE.Vector3(x, top + 0.006, z + height / 2),
        new THREE.Quaternion(),
        new THREE.Vector3(keySize, 1, height)
      );
      keys.setMatrixAt(count++, matrix);
    }
    if (isBottom) {
      const spaceWidth = pitch * 6 - (pitch - keySize);
      matrix.compose(
        new THREE.Vector3(-2.95 / 2 + pitch * 7, top + 0.006, z + height / 2),
        new THREE.Quaternion(),
        new THREE.Vector3(spaceWidth, 1, height)
      );
      keys.setMatrixAt(count++, matrix);
    }
    z += height + rowGap;
  });
  keys.count = count;
  root.add(keys);

  // Speaker grilles either side of the keyboard
  [-1, 1].forEach((side) => {
    const grille = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.003, wellDepth, 2, 0.0015), grilleMaterial);
    grille.position.set(side * (2.95 / 2 + 0.17), top, wellZ);
    root.add(grille);
  });

  // Trackpad
  const trackpad = new THREE.Mesh(
    new RoundedBoxGeometry(1.55, 0.004, 0.95, 3, 0.002),
    new THREE.MeshPhysicalMaterial({ color: 0xc7cacf, metalness: 0.6, roughness: 0.22, clearcoat: 0.6 })
  );
  trackpad.position.set(0, top, D / 2 - 0.12 - 0.95 / 2);
  root.add(trackpad);

  // Hinge along the back edge
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, W - 0.5, 24), hingeMaterial);
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, T, -D / 2 + 0.03);
  root.add(hinge);

  // Lid, pivoting at the hinge
  const lid = new THREE.Group();
  lid.position.set(0, T, -D / 2 + 0.03);
  root.add(lid);

  const shell = new THREE.Mesh(new RoundedBoxGeometry(W, H, 0.06, 4, 0.03), aluminum);
  shell.position.set(0, H / 2, -0.03);
  shell.castShadow = true;
  lid.add(shell);

  const panel = new THREE.Mesh(new RoundedBoxGeometry(W - 0.03, H - 0.03, 0.006, 2, 0.003), glass);
  panel.position.set(0, H / 2, 0.001);
  lid.add(panel);

  // Screen with thin side bezels and a slightly deeper chin
  const screenW = W - 0.16;
  const screenH = H - 0.07 - 0.13;
  const screenY = 0.13 + screenH / 2;
  const marketplaceMaterial = new THREE.MeshBasicMaterial({ map: marketplaceTexture, transparent: true, toneMapped: false });
  const dashboardMaterial = new THREE.MeshBasicMaterial({ map: dashboardTexture, transparent: true, opacity: 0, toneMapped: false });
  const marketplaceScreen = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH), marketplaceMaterial);
  const dashboardScreen = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH), dashboardMaterial);
  marketplaceScreen.position.set(0, screenY, 0.0045);
  dashboardScreen.position.set(0, screenY, 0.005);
  const posMaterial = new THREE.MeshBasicMaterial({ map: posTexture, transparent: true, opacity: 0, toneMapped: false });
  const posScreen = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH), posMaterial);
  posScreen.position.set(0, screenY, 0.0055);
  const addScreen = (texture, z) => {
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, toneMapped: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH), material);
    mesh.position.set(0, screenY, z);
    lid.add(mesh);
    return material;
  };
  const storefrontMaterial = addScreen(storefrontTexture, 0.006);
  const checkoutMaterial = addScreen(checkoutTexture, 0.0065);
  lid.add(marketplaceScreen, dashboardScreen, posScreen);

  // Camera notch
  const notch = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.075, 0.004, 2, 0.002), glass);
  notch.position.set(0, screenY + screenH / 2 - 0.02, 0.006);
  lid.add(notch);

  const glow = new THREE.PointLight(0x3b82f6, 0.5, 6);
  glow.position.set(0, 1.2, 1.1);
  lid.add(glow);

  return {
    root,
    lid,
    marketplaceMaterial,
    dashboardMaterial,
    posMaterial,
    storefrontMaterial,
    checkoutMaterial,
    baseScale: 1,
    basePositionY: -0.05,
    lidClosed: 1.52,
    lidOpen: -0.3,
  };
};

// Uses the real MacBook model: "screenflip" is the lid pivot and the
// "screen.001" material is the display, which gets the Rentify screens.
// Anodized aluminium finishes: matte, soft reflections, no glossy highlights
const FINISHES = {
  silver: { label: 'Silver', color: 0xc3c6ca, metalness: 0.45, roughness: 0.7 },
  spaceBlack: { label: 'Space Black', color: 0x2e2f33, metalness: 0.65, roughness: 0.58 },
};

const prepareRealMacBook = (gltf, textures, finish) => {
  const { marketplaceTexture, dashboardTexture, posTexture, storefrontTexture, checkoutTexture } = textures;
  const root = gltf.scene;
  const lid = root.getObjectByName('screenflip');
  let display = null;
  root.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    if (child.material?.name === 'screen.001') display = child;
    if (child.material?.name === 'aluminium') {
      child.material.color.set(finish.color);
      child.material.metalness = finish.metalness;
      child.material.roughness = finish.roughness;
    }
    if (child.material?.name === 'matte.001' || child.material?.name === 'screen.001') {
      child.material.color.set(0x050506);
      child.material.roughness = 0.2;
      child.material.metalness = 0;
    }
  });
  if (!lid || !display) return null;

  // Measure the display with the lid upright, in the lid's own space
  const restingAngle = lid.rotation.x;
  lid.rotation.x = 0;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(display);
  const size = box.getSize(new THREE.Vector3());
  const center = lid.worldToLocal(box.getCenter(new THREE.Vector3()));
  const front = lid.worldToLocal(new THREE.Vector3(0, 0, box.max.z)).z;
  lid.rotation.x = restingAngle;

  const makeScreen = (texture, opacity, offset) => {
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity, toneMapped: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size.x * 0.975, size.y * 0.955), material);
    mesh.position.set(center.x, center.y + size.y * 0.012, front + offset);
    lid.add(mesh);
    return material;
  };
  const marketplaceMaterial = makeScreen(marketplaceTexture, 0, 0.004);
  const dashboardMaterial = makeScreen(dashboardTexture, 1, 0.005);
  const posMaterial = makeScreen(posTexture, 0, 0.006);
  const storefrontMaterial = makeScreen(storefrontTexture, 0, 0.007);
  const checkoutMaterial = makeScreen(checkoutTexture, 0, 0.008);

  return { root, lid, marketplaceMaterial, dashboardMaterial, posMaterial, storefrontMaterial, checkoutMaterial, lidClosed: 1.575, lidOpen: -0.22 };
};

const RentifyLaptopShowcase = ({ variant = 'silver' }) => {
  const finish = FINISHES[variant] || FINISHES.silver;
  const sectionRef = useRef(null);
  const canvasHostRef = useRef(null);
  const canvasLayerRef = useRef(null);
  const captionsRef = useRef(null);
  const featurePanelRef = useRef(null);
  const introRef = useRef(null);
  const marketplaceLabelRef = useRef(null);
  const dashboardLabelRef = useRef(null);
  const modelStatus = `MacBook Pro · ${finish.label}`;

  useEffect(() => {
    const section = sectionRef.current;
    const host = canvasHostRef.current;
    const canvasLayer = canvasLayerRef.current;
    const captionLayer = captionsRef.current;
    const featurePanel = featurePanelRef.current;
    if (!section || !host || !canvasLayer || !captionLayer || !featurePanel) return undefined;

    gsap.registerPlugin(ScrollTrigger);
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xf1f7ff, 0.055);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 1.5, 6.2);
    camera.lookAt(0, 0.65, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.88;
    renderer.domElement.setAttribute('aria-label', 'Scroll-controlled 3D Rentify laptop');
    host.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;
    scene.environmentIntensity = 0.25;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa2ad, 1.9));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(-3.5, 6, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(15, 15),
      new THREE.ShadowMaterial({ color: 0x35618c, opacity: 0.16 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.08;
    ground.receiveShadow = true;
    scene.add(ground);

    const textureLoader = new THREE.TextureLoader();
    const marketplaceTexture = textureLoader.load(MARKETPLACE_TEXTURE);
    const dashboardTexture = textureLoader.load(DASHBOARD_TEXTURE);
    const posTexture = makePosTexture();
    const checkoutTexture = makeCheckoutTexture();
    const storefrontTexture = textureLoader.load(SHOWCASE.tech.desktop);
    storefrontTexture.colorSpace = THREE.SRGBColorSpace;
    const textures = { marketplaceTexture, dashboardTexture, posTexture, storefrontTexture, checkoutTexture };
    [marketplaceTexture, dashboardTexture].forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    });

    // 0 = lid closed, 1 = fully open; spin turns the laptop toward the viewer as it opens
    const motion = {
      open: 0,
      spin: -0.55,
      dashboard: 1,
      marketplace: 0,
      pos: 0,
      storefront: 0,
      checkout: 0,
      slide: 0,
      cameraTargetY: 0.65,
      modelLift: 0,
    };
    let activeModel = null;

    const showModel = (model) => {
      activeModel = model;
      scene.add(model.root);
      resize();
    };

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);
    const showCodedLaptop = () => showModel(makeMacBook(marketplaceTexture, dashboardTexture, posTexture, storefrontTexture, checkoutTexture));
    gltfLoader.load(
      MACBOOK_MODEL,
      (gltf) => {
        const prepared = prepareRealMacBook(gltf, textures, finish);
        if (!prepared) {
          showCodedLaptop();
          return;
        }
        prepared.lid.rotation.x = prepared.lidClosed;
        const bounds = new THREE.Box3().setFromObject(prepared.root);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const baseScale = 3.3 / Math.max(size.x, size.z);
        const basePositionY = -bounds.min.y * baseScale - 0.08;
        const basePositionX = -center.x * baseScale;
        prepared.root.position.set(basePositionX, basePositionY, -center.z * baseScale);
        showModel({ ...prepared, baseScale, basePositionY, basePositionX });
      },
      undefined,
      showCodedLaptop
    );

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      if (!activeModel) return;
      const scale = window.innerWidth < 640 ? 0.7 : window.innerWidth < 1024 ? 0.88 : 1;
      activeModel.root.scale.setScalar(activeModel.baseScale * scale);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let frameId;
    const render = () => {
      if (activeModel) {
        const { lidClosed, lidOpen } = activeModel;
        activeModel.lid.rotation.x = lidClosed + (lidOpen - lidClosed) * motion.open;
        activeModel.root.rotation.y = motion.spin;
        activeModel.dashboardMaterial.opacity = motion.dashboard;
        activeModel.marketplaceMaterial.opacity = motion.marketplace;
        activeModel.posMaterial.opacity = motion.pos;
        activeModel.storefrontMaterial.opacity = motion.storefront;
        activeModel.checkoutMaterial.opacity = motion.checkout;
        // On wide screens the laptop moves right to make room for the feature text
        const slideDistance = window.innerWidth >= 1024 ? 1.35 : 0;
        activeModel.root.position.x = (activeModel.basePositionX || 0) + motion.slide * slideDistance;
        activeModel.root.position.y = activeModel.basePositionY + motion.modelLift;
      }
      camera.lookAt(0, motion.cameraTargetY, 0);
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(render);
    };
    render();

    const labels = [dashboardLabelRef.current, marketplaceLabelRef.current];
    const featureItems = featurePanel.querySelectorAll('[data-feature]');
    gsap.set(labels, { autoAlpha: 0, y: 18 });
    gsap.set(featurePanel, { autoAlpha: 0 });
    gsap.set(featureItems, { opacity: 0.3 });
    const captions = captionLayer.querySelectorAll('[data-caption]');
    gsap.set(captions, { autoAlpha: 0, y: 16 });

    const timeline = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.8,
        invalidateOnRefresh: true,
      },
    });

    timeline
      // 1. The lid opens on the dashboard
      .to(introRef.current, { autoAlpha: 0, y: -20, duration: 0.3 }, 0.1)
      .to(motion, { open: 1, spin: 0, duration: 1, ease: 'power3.inOut' }, 0.05)
      .to(dashboardLabelRef.current, { autoAlpha: 1, y: 0, duration: 0.3 }, 0.75)
      .to(dashboardLabelRef.current, { autoAlpha: 0, y: -16, duration: 0.25 }, 1.35)
      // 2. The screen switches to the marketplace, then the camera dives into it
      .to(motion, { dashboard: 0, marketplace: 1, duration: 0.4 }, 1.4)
      .to(marketplaceLabelRef.current, { autoAlpha: 1, y: 0, duration: 0.3 }, 1.55)
      .to(marketplaceLabelRef.current, { autoAlpha: 0, y: -16, duration: 0.25 }, 2.1)
      // The camera moves in until the laptop screen fills most of the view
      // Narrow windows zoom less so the whole screen stays in view
      .to(camera.position, { z: () => (window.innerWidth / window.innerHeight < 1.4 ? 5.6 : 3.9), y: 1.35, duration: 0.8 }, 2.1)
      .to(motion, { cameraTargetY: 1.1, duration: 0.8 }, 2.1)
      .to(captions[0], { autoAlpha: 1, y: 0, duration: 0.25 }, 2.7)
      .to(captions[0], { autoAlpha: 0, y: -12, duration: 0.15 }, 3.35)
      .to(motion, { marketplace: 0, storefront: 1, duration: 0.3 }, 3.4)
      .to(captions[1], { autoAlpha: 1, y: 0, duration: 0.2 }, 3.5)
      .to(captions[1], { autoAlpha: 0, y: -12, duration: 0.15 }, 4.15)
      .to(motion, { storefront: 0, checkout: 1, duration: 0.3 }, 4.2)
      .to(captions[2], { autoAlpha: 1, y: 0, duration: 0.2 }, 4.3)
      .to(captions[2], { autoAlpha: 0, y: -12, duration: 0.15 }, 5)
      // 3. Back to the dashboard and the whole laptop
      .to(motion, { checkout: 0, dashboard: 1, duration: 0.3 }, 5.05)
      .to(camera.position, { z: 6.2, y: 1.5, duration: 0.9 }, 5.2)
      .to(motion, { cameraTargetY: 0.65, duration: 0.9 }, 5.2)
      // 4. The laptop moves right, dashboard features appear on the left, led by POS
      .to(motion, { slide: 1, duration: 0.6 }, 6.1)
      .fromTo(featurePanel, { autoAlpha: 0, x: -30 }, { autoAlpha: 1, x: 0, duration: 0.4 }, 6.3)
      .to(motion, { dashboard: 0, pos: 1, duration: 0.4 }, 6.4)
      .to(featureItems[0], { opacity: 1, duration: 0.2 }, 6.45)
      .to(featureItems[1], { opacity: 1, duration: 0.2 }, 6.75)
      .to(featureItems[2], { opacity: 1, duration: 0.2 }, 7.05)
      .to(motion, { pos: 0, dashboard: 1, duration: 0.3 }, 7.3)
      .to(featureItems[3], { opacity: 1, duration: 0.2 }, 7.35)
      .to({}, { duration: 0.35 }, 7.6);

    return () => {
      timeline.scrollTrigger?.kill();
      timeline.kill();
      observer.disconnect();
      cancelAnimationFrame(frameId);
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      environment.dispose();
      pmrem.dispose();
      dracoLoader.dispose();
      marketplaceTexture.dispose();
      posTexture.dispose();
      checkoutTexture.dispose();
      storefrontTexture.dispose();
      dashboardTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [finish]);

  return (
    <section
      ref={sectionRef}
      aria-label="Rentify product experience"
      className="relative h-[960vh] bg-[#f5f5f7]"
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        <div ref={canvasLayerRef} className="absolute inset-0 z-10">
          <div ref={canvasHostRef} className="absolute inset-0" />

          <div ref={introRef} className="pointer-events-none absolute inset-x-5 top-[10vh] text-center sm:top-[12vh]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">One connected platform</p>
            <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-5xl lg:text-6xl">
              Your whole business, on one screen.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-500 sm:text-lg">Scroll to open it up.</p>
          </div>

          <div ref={dashboardLabelRef} className="pointer-events-none absolute inset-x-5 top-[8vh] text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Merchant dashboard</p>
            <h3 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-slate-950 sm:text-5xl">Manage everything.</h3>
          </div>

          <div ref={marketplaceLabelRef} className="pointer-events-none absolute inset-x-5 top-[8vh] text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Rentify Marketplace</p>
            <h3 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-slate-950 sm:text-5xl">Reach more buyers.</h3>
          </div>

          <div
            ref={featurePanelRef}
            className="pointer-events-none absolute inset-x-5 bottom-20 rounded-3xl bg-white/85 p-6 backdrop-blur lg:inset-x-auto lg:bottom-auto lg:left-[6vw] lg:top-1/2 lg:w-[380px] lg:-translate-y-1/2 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Inside the dashboard</p>
            <h3 className="mt-3 text-3xl font-bold leading-tight tracking-[-0.03em] text-slate-950 lg:text-5xl">
              Sell at the counter, too.
            </h3>
            <ul className="mt-6 space-y-4 lg:mt-8 lg:space-y-5">
              {[
                ['Point of sale', 'Ring up in-store sales in seconds on any laptop or tablet.'],
                ['KHQR and cash', 'Take payment by KHQR or cash right at the counter.'],
                ['One stock count', 'In-store sales draw from the same products as your online store.'],
                ['Orders and reports', 'Every sale lands in one list, ready for your reports.'],
              ].map(([title, body]) => (
                <li key={title} data-feature className="border-l-2 border-blue-600/30 pl-4">
                  <p className="text-base font-semibold text-slate-950 lg:text-lg">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500 lg:text-base">{body}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-xs font-medium text-slate-500 shadow-sm backdrop-blur">
            {modelStatus} · Scroll to explore
          </div>
        </div>

        <div ref={captionsRef} className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-44">
          {STORE_CAPTIONS.map((caption) => (
            <div
              key={caption.eyebrow}
              data-caption
              className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#f5f5f7] via-[#f5f5f7]/95 to-transparent pb-8 pt-16"
            >
              <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-5 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:gap-12 lg:px-[6vw]">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">{caption.eyebrow}</p>
                  <h3 className="mt-2 text-2xl font-bold leading-tight tracking-[-0.03em] text-slate-950 sm:text-4xl">
                    {caption.title}
                  </h3>
                </div>
                <p className="max-w-md text-base leading-7 text-slate-500">{caption.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RentifyLaptopShowcase;
