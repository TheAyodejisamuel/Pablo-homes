// Generates minimalist architectural SVG illustrations.
// These stand in for photography until Pablo Homes supplies real property photos
// (SRS §27: real listings must use genuine photos — see README "Adding real photos").

import { seeded } from './util.mjs';

const W = 1200;
const H = 800;

const PAL = {
  dusk: {
    sky: [['#1a1816', 0], ['#3a2f27', 0.42], ['#8c6a49', 0.8], ['#d3b082', 1]],
    sun: '#f1d29e', sunOp: 0.9, ground: '#151413', ground2: '#0f0e0d',
    b1: '#262321', b2: '#2e2a27', b3: '#1b1917', win: '#f2d49c', winOff: '#3b3631',
    line: '#b8915f', tree: '#0e0d0c', haze: '#c9a678', hazeOp: 0.18, glass: '#d9b88a',
  },
  day: {
    sky: [['#bfb8ac', 0], ['#dcd6cb', 0.45], ['#f2ede5', 1]],
    sun: '#fffaf0', sunOp: 0.75, ground: '#b3a893', ground2: '#9c917c',
    b1: '#f8f4ed', b2: '#ebe5da', b3: '#cfc6b7', win: '#45423f', winOff: '#5a5651',
    line: '#9a7b4f', tree: '#363a2c', haze: '#ffffff', hazeOp: 0.35, glass: '#a8b4b8',
  },
  night: {
    sky: [['#070809', 0], ['#121212', 0.55], ['#2a241f', 1]],
    sun: '#ece4d2', sunOp: 0.95, ground: '#0b0b0b', ground2: '#060606',
    b1: '#1b1a19', b2: '#211f1d', b3: '#121110', win: '#ecc27d', winOff: '#2a2724',
    line: '#8d7050', tree: '#040404', haze: '#5a4a3a', hazeOp: 0.15, glass: '#6b5a48',
  },
};

const f = (n) => Math.round(n * 10) / 10;

function rect(x, y, w, h, fill, extra = '') {
  return `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra}/>`;
}

// --- Building blueprints: lists of rects with roles, rendered either solid or as line drawings.
function duplexParts(R) {
  const p = [];
  p.push({ x: 0, y: -150, w: 480, h: 150, role: 'b1' });
  p.push({ x: 440, y: -150, w: 40, h: 150, role: 'shade' });
  p.push({ x: 80, y: -300, w: 520, h: 150, role: 'b2' });
  p.push({ x: 560, y: -300, w: 40, h: 150, role: 'shade' });
  p.push({ x: 60, y: -312, w: 560, h: 12, role: 'slab' });
  p.push({ x: -20, y: -162, w: 120, h: 12, role: 'slab' });
  p.push({ x: 480, y: -150, w: 120, h: 8, role: 'slab' });
  p.push({ x: 586, y: -150, w: 10, h: 150, role: 'slab' });
  [40, 160, 280].forEach((x) => p.push({ x, y: -126, w: 100, h: 112, role: 'win', lit: R() < 0.7, mull: true }));
  p.push({ x: 398, y: -122, w: 30, h: 122, role: 'door' });
  for (let i = 0; i < 6; i++) p.push({ x: 122 + i * 70, y: -268, w: 66, h: 84, role: 'win', lit: R() < 0.55 });
  p.push({ x: 80, y: -176, w: 220, h: 24, role: 'glass' });
  p.push({ x: 80, y: -178, w: 220, h: 3, role: 'line' });
  return { parts: p, w: 600, h: 312 };
}

function apartmentParts(R, floors = 6) {
  const p = [];
  const H0 = floors * 70 + 20;
  p.push({ x: 0, y: -H0, w: 420, h: H0, role: 'b1' });
  p.push({ x: 380, y: -H0, w: 40, h: H0, role: 'shade' });
  p.push({ x: -10, y: -H0 - 12, w: 440, h: 12, role: 'slab' });
  for (let fl = 0; fl < floors - 1; fl++) {
    const y = -H0 + 22 + fl * 70;
    for (let i = 0; i < 4; i++) p.push({ x: 28 + i * 88, y, w: 60, h: 42, role: 'win', lit: R() < 0.45 });
    p.push({ x: 0, y: y + 52, w: 380, h: 5, role: 'slab' });
  }
  p.push({ x: 160, y: -62, w: 80, h: 62, role: 'door' });
  p.push({ x: 30, y: -54, w: 90, h: 36, role: 'win', lit: R() < 0.5 });
  p.push({ x: 270, y: -54, w: 90, h: 36, role: 'win', lit: R() < 0.5 });
  return { parts: p, w: 420, h: H0 + 12 };
}

function terraceParts(R) {
  const p = [];
  for (let i = 0; i < 4; i++) {
    const h = i % 2 ? 282 : 254;
    const x = i * 150;
    p.push({ x, y: -h, w: 150, h, role: i % 2 ? 'b2' : 'b1' });
    p.push({ x: x + 146, y: -h, w: 4, h, role: 'shade' });
    p.push({ x: x - 4, y: -h - 10, w: 158, h: 10, role: 'slab' });
    p.push({ x: x + 25, y: -h + 34, w: 100, h: 62, role: 'win', lit: R() < 0.6, mull: true });
    p.push({ x: x + 20, y: -112, w: 34, h: 112, role: 'door' });
    p.push({ x: x + 72, y: -100, w: 58, h: 60, role: 'win', lit: R() < 0.6 });
    p.push({ x: x + 10, y: -124, w: 56, h: 8, role: 'slab' });
  }
  return { parts: p, w: 600, h: 292 };
}

function commercialParts(R) {
  const p = [];
  p.push({ x: -120, y: -430, w: 140, h: 430, role: 'shade' });
  p.push({ x: 0, y: -620, w: 260, h: 620, role: 'b2' });
  p.push({ x: 220, y: -620, w: 40, h: 620, role: 'shade' });
  p.push({ x: -6, y: -632, w: 272, h: 12, role: 'slab' });
  for (let y = -600; y < -160; y += 36) p.push({ x: 14, y, w: 200, h: 22, role: 'win', lit: R() < 0.35 });
  p.push({ x: -140, y: -142, w: 560, h: 142, role: 'b1' });
  p.push({ x: -150, y: -150, w: 580, h: 10, role: 'slab' });
  for (let i = 0; i < 6; i++) p.push({ x: -124 + i * 88, y: -116, w: 80, h: 92, role: 'win', lit: R() < 0.6 });
  return { parts: p, w: 420, h: 632, x0: -150 };
}

function renderParts(model, P, mode = 'solid') {
  return model.parts
    .map((r) => {
      if (mode === 'line') {
        if (r.role === 'glass') return '';
        const dash = r.role === 'win' || r.role === 'door' ? ' stroke-dasharray="6 5"' : '';
        return rect(r.x, r.y, r.w, r.h, 'none', ` stroke="${P.line}" stroke-width="2"${dash}`);
      }
      let fill;
      let extra = '';
      switch (r.role) {
        case 'b1': fill = P.b1; break;
        case 'b2': fill = P.b2; break;
        case 'shade': case 'slab': fill = P.b3; break;
        case 'door': fill = P.line; break;
        case 'line': fill = P.b3; break;
        case 'glass': fill = P.glass; extra = ' opacity=".35"'; break;
        case 'win': fill = r.lit ? P.win : P.winOff; break;
        default: fill = P.b1;
      }
      let s = rect(r.x, r.y, r.w, r.h, fill, extra);
      if (r.role === 'win' && r.mull) s += rect(r.x + r.w / 2 - 1.5, r.y, 3, r.h, P.b3);
      return s;
    })
    .join('');
}

function palm(x, g, h, color, lean = 20) {
  const tx = x + lean;
  const ty = g - h;
  let s = `<path d="M${f(x)} ${f(g)} Q${f(x + lean * 0.2)} ${f(g - h * 0.55)} ${f(tx)} ${f(ty)}" stroke="${color}" stroke-width="${f(Math.max(5, h / 34))}" fill="none" stroke-linecap="round"/>`;
  const L = h * 0.42;
  for (const a of [-172, -145, -118, -92, -66, -38, -10, 205]) {
    const rad = (a * Math.PI) / 180;
    const ex = tx + Math.cos(rad) * L;
    const ey = ty + Math.sin(rad) * L * 0.55 + L * 0.38;
    const cx = tx + Math.cos(rad) * L * 0.5;
    const cy = ty + Math.sin(rad) * L * 0.5 - L * 0.12;
    s += `<path d="M${f(tx)} ${f(ty)} Q${f(cx)} ${f(cy - 10)} ${f(ex)} ${f(ey)} Q${f(cx)} ${f(cy + 7)} ${f(tx)} ${f(ty)}Z" fill="${color}"/>`;
  }
  return s;
}

function bush(x, g, w, color) {
  return `<ellipse cx="${f(x)}" cy="${f(g - w * 0.18)}" rx="${f(w / 2)}" ry="${f(w * 0.28)}" fill="${color}"/><ellipse cx="${f(x + w * 0.3)}" cy="${f(g - w * 0.12)}" rx="${f(w * 0.3)}" ry="${f(w * 0.2)}" fill="${color}"/>`;
}

function treeline(g, R, color, op, amp = 26, width = W) {
  let d = `M0 ${g}`;
  for (let x = 0; x <= width; x += 40) d += ` Q${x + 20} ${f(g - amp * (0.4 + R()))} ${x + 40} ${f(g - amp * 0.3 * R())}`;
  d += ` L${width} ${g + 2} L0 ${g + 2}Z`;
  return `<path d="${d}" fill="${color}" opacity="${op}"/>`;
}

function skyDefs(P, w = W, h = H) {
  const stops = P.sky.map(([c, o]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');
  return `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>` +
    `<radialGradient id="glow"><stop offset="0" stop-color="${P.sun}" stop-opacity=".55"/><stop offset="1" stop-color="${P.sun}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="gnd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.ground}"/><stop offset="1" stop-color="${P.ground2}"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#sky)"/>`;
}

const open = (w = W, h = H) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">`;

function exterior(kind, P, R, { flip = false } = {}) {
  const g = 660;
  const sunX = flip ? 250 + R() * 200 : 750 + R() * 250;
  let s = open() + skyDefs(P);
  s += `<circle cx="${f(sunX)}" cy="${g - 150}" r="300" fill="url(#glow)"/>`;
  s += `<circle cx="${f(sunX)}" cy="${g - 150}" r="${P === PAL.night ? 34 : 56}" fill="${P.sun}" opacity="${P.sunOp}"/>`;
  // hazy background city
  let bg = '';
  for (let i = 0; i < 9; i++) {
    const bw = 60 + R() * 110;
    const bh = 60 + R() * 180;
    bg += rect(i * 140 + R() * 40 - 20, g - bh, bw, bh, P.b3);
  }
  s += `<g opacity=".55">${bg}</g>`;
  s += treeline(g, R, P.tree, 0.85, 30);
  s += `<rect x="0" y="${g - 6}" width="${W}" height="${H - g + 6}" fill="url(#gnd)"/>`;

  let model;
  let scale = 1;
  if (kind === 'apartment') { model = apartmentParts(R); scale = 1.08; }
  else if (kind === 'terrace') { model = terraceParts(R); scale = 1.12; }
  else if (kind === 'commercial') { model = commercialParts(R); scale = 0.92; }
  else { model = duplexParts(R); scale = 1.18; }
  const bx = (W - model.w * scale) / 2 + (model.x0 ? -model.x0 * scale * 0.5 : 0) + (R() - 0.5) * 60;
  const tf = flip ? `translate(${f(bx + model.w * scale)} ${g}) scale(${-scale} ${scale})` : `translate(${f(bx)} ${g}) scale(${scale})`;
  s += `<g transform="${tf}">${renderParts(model, P)}</g>`;

  // perimeter wall with gate (Benin City compounds are usually fenced)
  if (kind === 'duplex' || kind === 'terrace') {
    s += rect(0, g - 40, W, 40, P.b2) + rect(0, g - 44, W, 5, P.b3);
    const gx = W / 2 - 40 + (R() - 0.5) * 120;
    let bars = '';
    for (let i = 0; i <= 12; i++) bars += rect(gx + i * 13, g - 40, 2.5, 40, P.line);
    s += rect(gx, g - 40, 160, 40, P.b3) + bars + rect(gx, g - 42, 160, 3, P.line);
  }
  s += palm(110 + R() * 60, g + 4, 300 + R() * 70, P.tree, 24);
  s += palm(W - 120 - R() * 70, g + 4, 250 + R() * 80, P.tree, -26);
  if (R() > 0.4) s += palm(W - 260 - R() * 60, g + 4, 190 + R() * 50, P.tree, 14);
  s += bush(330, g + 4, 120, P.tree) + bush(W - 360, g + 4, 100, P.tree);
  s += rect(0, g + 20, W, 2, P.line, ' opacity=".35"');
  return s + '</svg>';
}

function landScene(P, R, close = false) {
  const g = close ? 360 : 420;
  let s = open() + skyDefs(P);
  const sunX = 200 + R() * 800;
  s += `<circle cx="${f(sunX)}" cy="${g - 90}" r="260" fill="url(#glow)"/><circle cx="${f(sunX)}" cy="${g - 90}" r="50" fill="${P.sun}" opacity="${P.sunOp}"/>`;
  s += treeline(g, R, P.tree, 0.55, 22) + treeline(g + 8, R, P.tree, 0.9, 14);
  s += `<rect x="0" y="${g}" width="${W}" height="${H - g}" fill="url(#gnd)"/>`;
  // perspective plot outline
  const [nl, nr, fl, fr] = close ? [80, 1120, 380, 820] : [260, 940, 470, 730];
  const fy = g + (close ? 30 : 40);
  const ny = H - 40;
  s += `<polygon points="${nl},${ny} ${nr},${ny} ${fr},${fy} ${fl},${fy}" fill="${P.line}" opacity=".1"/>`;
  s += `<polygon points="${nl},${ny} ${nr},${ny} ${fr},${fy} ${fl},${fy}" fill="none" stroke="${P.line}" stroke-width="3" stroke-dasharray="14 10"/>`;
  for (const [x, y, sc] of [[nl, ny, 1.4], [nr, ny, 1.4], [fl, fy, 0.6], [fr, fy, 0.6]]) {
    s += rect(x - 4 * sc, y - 34 * sc, 8 * sc, 34 * sc, P.b3) + rect(x - 6 * sc, y - 40 * sc, 12 * sc, 9 * sc, P.line);
  }
  // signboard
  const sx = close ? 980 : 1010;
  s += rect(sx, g - 10, 6, 120, P.b3) + rect(sx + 90, g - 10, 6, 120, P.b3) + rect(sx - 14, g - 70, 124, 70, P.b1) + rect(sx - 14, g - 70, 124, 6, P.line);
  for (let i = 0; i < 26; i++) {
    const x = R() * W;
    const y = g + 30 + R() * (H - g - 40);
    s += `<path d="M${f(x)} ${f(y)} l4 -12 l3 10 l4 -14 l3 16" fill="none" stroke="${P.tree}" stroke-width="2" opacity=".5"/>`;
  }
  s += palm(140 + R() * 40, g + 6, close ? 330 : 260, P.tree, 22) + palm(820 + R() * 60, g + 2, 150, P.tree, -12);
  return s + '</svg>';
}

function interior(P, R, light) {
  const wall = light ? '#efe9df' : '#2b2724';
  const wall2 = light ? '#e4ddd1' : '#24211e';
  const floor = light ? '#c9bba6' : '#3a3029';
  const sofa = light ? '#8f7f6c' : '#4a4038';
  const sofa2 = light ? '#7d6e5d' : '#3e352e';
  const win = light ? PAL.day : PAL.dusk;
  const fy = 600;
  let s = open() + `<defs><linearGradient id="v" x1="0" y1="0" x2="0" y2="1">${win.sky.map(([c, o]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient><radialGradient id="lamp"><stop offset="0" stop-color="#f6d9a3" stop-opacity=".6"/><stop offset="1" stop-color="#f6d9a3" stop-opacity="0"/></radialGradient></defs>`;
  s += rect(0, 0, W, fy, wall) + rect(0, fy, W, H - fy, floor) + rect(0, fy - 14, W, 14, wall2);
  // window with view
  const wx = 640, wy = 90, ww = 470, wh = 420;
  s += rect(wx - 14, wy - 14, ww + 28, wh + 28, light ? '#d8cfc1' : '#1a1816');
  s += rect(wx, wy, ww, wh, 'url(#v)');
  let city = '';
  for (let i = 0; i < 8; i++) {
    const bw = 40 + R() * 50, bh = 60 + R() * 170;
    city += rect(wx + i * 60 + R() * 10, wy + wh - bh, bw, bh, light ? '#b9b1a4' : '#1d1b19');
  }
  s += city + palm(wx + 380, wy + wh, 200, light ? '#7d806f' : '#141210', -10);
  s += rect(wx + ww / 3 - 3, wy, 6, wh, light ? '#d8cfc1' : '#1a1816') + rect(wx + (2 * ww) / 3 - 3, wy, 6, wh, light ? '#d8cfc1' : '#1a1816');
  // art frame
  s += rect(150, 170, 260, 170, light ? '#f7f3ec' : '#332e2a', ` stroke="${PAL.dusk.line}" stroke-width="5"`);
  s += `<circle cx="300" cy="245" r="40" fill="${PAL.dusk.line}" opacity=".7"/>` + rect(190, 290, 180, 6, PAL.dusk.line, ' opacity=".5"');
  // rug, sofa, table
  s += `<ellipse cx="420" cy="${fy + 120}" rx="380" ry="60" fill="${light ? '#b3a48e' : '#2f2620'}" opacity=".8"/>`;
  s += `<rect x="70" y="${fy - 150}" width="560" height="110" rx="18" fill="${sofa2}"/>`;
  s += `<rect x="60" y="${fy - 70}" width="580" height="80" rx="16" fill="${sofa}"/>`;
  s += `<rect x="40" y="${fy - 110}" width="60" height="120" rx="16" fill="${sofa2}"/><rect x="600" y="${fy - 110}" width="60" height="120" rx="16" fill="${sofa2}"/>`;
  s += `<rect x="160" y="${fy - 130}" width="90" height="70" rx="12" fill="${PAL.dusk.line}" opacity=".85"/>`;
  s += rect(70, fy + 10, 10, 26, sofa2) + rect(620, fy + 10, 10, 26, sofa2);
  s += rect(260, fy + 70, 300, 14, PAL.dusk.line) + rect(290, fy + 84, 8, 50, PAL.dusk.line) + rect(522, fy + 84, 8, 50, PAL.dusk.line);
  // pendant lamp
  s += rect(409, 0, 2, 150, light ? '#6b645c' : '#8d7050') + `<circle cx="410" cy="200" r="150" fill="url(#lamp)"/>` + `<path d="M360 190 A50 50 0 0 1 460 190 Z" fill="${PAL.dusk.line}"/>`;
  // plant
  s += rect(1110, fy - 60, 60, 70, light ? '#d8cfc1' : '#3a332d');
  for (let i = 0; i < 7; i++) s += `<ellipse cx="${1140 + (i - 3) * 14}" cy="${fy - 110 - (3 - Math.abs(i - 3)) * 22}" rx="12" ry="48" fill="${light ? '#5f6a4f' : '#2a3125'}" transform="rotate(${(i - 3) * 14} ${1140 + (i - 3) * 14} ${fy - 70})"/>`;
  return s + '</svg>';
}

function blueprint(R, kind = 'duplex') {
  const P = { line: '#c39a63' };
  const g = 620;
  let s = open() + rect(0, 0, W, H, '#16181a');
  let grid = '';
  for (let x = 0; x <= W; x += 40) grid += rect(x, 0, 1, H, x % 200 ? '#202326' : '#2a2e32');
  for (let y = 0; y <= H; y += 40) grid += rect(0, y, W, 1, y % 200 ? '#202326' : '#2a2e32');
  s += grid;
  const model = kind === 'terrace' ? terraceParts(R) : duplexParts(R);
  const sc = 1.15;
  const bx = (W - model.w * sc) / 2 - 60;
  s += `<g transform="translate(${f(bx)} ${g}) scale(${sc})">${renderParts(model, P, 'line')}</g>`;
  s += rect(60, g, W - 120, 2, P.line, ' opacity=".7"');
  // dimension line
  const x1 = bx, x2 = bx + model.w * sc;
  s += rect(x1, g + 50, x2 - x1, 1.5, '#8d949b') + rect(x1, g + 40, 1.5, 20, '#8d949b') + rect(x2, g + 40, 1.5, 20, '#8d949b');
  s += rect(x2 + 50, g - model.h * sc, 1.5, model.h * sc, '#8d949b') + rect(x2 + 40, g - model.h * sc, 20, 1.5, '#8d949b');
  // crane
  const cx = 1010;
  let crane = `<path d="M${cx} ${g} V140 M${cx + 28} ${g} V140" stroke="#8d949b" stroke-width="2.5" fill="none"/>`;
  for (let y = g; y > 150; y -= 36) crane += `<path d="M${cx} ${y} L${cx + 28} ${y - 36}" stroke="#8d949b" stroke-width="1.5"/>`;
  crane += `<path d="M${cx - 520} 140 H${cx + 140} M${cx - 520} 162 H${cx + 140} M${cx + 14} 90 L${cx - 300} 140 M${cx + 14} 90 L${cx + 140} 140 M${cx + 14} 90 V140" stroke="#8d949b" stroke-width="2" fill="none"/>`;
  for (let x = cx - 520; x < cx + 140; x += 30) crane += `<path d="M${x} 162 L${x + 30} 140" stroke="#8d949b" stroke-width="1.2"/>`;
  crane += rect(cx + 90, 162, 40, 40, '#8d949b', ' opacity=".6"');
  crane += `<path d="M${cx - 380} 162 V330" stroke="${P.line}" stroke-width="1.5"/>` + rect(cx - 392, 330, 24, 14, P.line);
  s += crane;
  for (const [x, y] of [[bx + 40, g - 340], [bx + 300, g - 200]]) s += `<circle cx="${f(x)}" cy="${f(y)}" r="16" fill="none" stroke="${P.line}" stroke-width="1.5"/><circle cx="${f(x)}" cy="${f(y)}" r="3" fill="${P.line}"/>`;
  return s + '</svg>';
}

// Image plan per property category
export function propertyArtSet(p) {
  const R = seeded(p.id);
  const c = p.category;
  if (c === 'land') return [landScene(PAL.day, R), landScene(PAL.dusk, R), landScene(PAL.day, R, true)];
  if (c === 'offplan') return [blueprint(R), exterior('duplex', PAL.dusk, R), exterior('duplex', PAL.day, R, { flip: true })];
  if (c === 'commercial') return [exterior('commercial', PAL.dusk, R), exterior('commercial', PAL.day, R, { flip: true }), exterior('commercial', PAL.night, R)];
  if (c === 'shortlet') return [interior(PAL.dusk, R, false), interior(PAL.day, R, true), exterior('apartment', PAL.dusk, R), exterior('apartment', PAL.night, R, { flip: true })];
  const kind = c === 'apartment' ? 'apartment' : c === 'terrace' ? 'terrace' : 'duplex';
  return [exterior(kind, PAL.dusk, R), exterior(kind, PAL.day, R, { flip: true }), exterior(kind, PAL.night, R), interior(PAL.day, R, true)];
}

export function sectionArt(name) {
  const R = seeded(name);
  switch (name) {
    case 'about': return exterior('terrace', PAL.dusk, R);
    case 'sales': return exterior('duplex', PAL.day, R);
    case 'rentals': return exterior('apartment', PAL.dusk, R, { flip: true });
    case 'land': return landScene(PAL.dusk, R);
    case 'investment': return blueprint(R, 'terrace');
    case 'abroad': return exterior('duplex', PAL.night, R, { flip: true });
    case 'contact': return interior(PAL.dusk, R, false);
    default: return exterior('duplex', PAL.dusk, R);
  }
}

export function heroArt() {
  const R = seeded('pablo-hero-2026');
  const HW = 1600, HH = 1000, g = 860;
  const P = PAL.dusk;
  let s = open(HW, HH) + skyDefs(P, HW, HH);
  s += `<circle cx="1150" cy="640" r="420" fill="url(#glow)"/><circle cx="1150" cy="640" r="70" fill="${P.sun}" opacity=".9"/>`;
  let bg = '';
  for (let i = 0; i < 14; i++) {
    const bw = 70 + R() * 120, bh = 90 + R() * 260;
    bg += rect(i * 120 + R() * 40 - 30, g - bh, bw, bh, P.b3);
  }
  s += `<g opacity=".6">${bg}</g>`;
  s += `<g transform="translate(240 ${g}) scale(.72)" opacity=".75">${renderParts(apartmentParts(R, 8), P)}</g>`;
  s += treeline(g, R, P.tree, 0.9, 34, HW);
  s += `<rect x="0" y="${g - 6}" width="${HW}" height="${HH - g + 6}" fill="url(#gnd)"/>`;
  s += `<g transform="translate(700 ${g}) scale(1.32)">${renderParts(duplexParts(R), P)}</g>`;
  s += rect(0, g - 44, HW, 44, P.b2) + rect(0, g - 48, HW, 5, P.b3);
  let bars = '';
  for (let i = 0; i <= 14; i++) bars += rect(980 + i * 13, g - 44, 2.5, 44, P.line);
  s += rect(980, g - 44, 186, 44, P.b3) + bars + rect(980, g - 46, 186, 3, P.line);
  s += palm(620, g + 4, 420, P.tree, 30) + palm(1480, g + 4, 380, P.tree, -30) + palm(1560, g + 4, 260, P.tree, -12) + palm(80, g + 4, 300, P.tree, 18);
  s += bush(560, g + 4, 150, P.tree) + bush(1400, g + 4, 130, P.tree);
  return s + '</svg>';
}
