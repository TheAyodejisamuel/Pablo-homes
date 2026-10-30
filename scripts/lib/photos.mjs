// Stock photography helpers (SRS: Mandatory Visual Asset and Image Implementation Plan).
// Photos are listed in src/data/photos.json (which doubles as the image source log) and
// stored as optimised WebP files in src/static/images/photos/<key>-<width>.webp.
import fs from 'node:fs';
import path from 'node:path';
import { esc } from './util.mjs';

export const SIZES = {
  full: '100vw',
  card: '(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 420px',
  gallery: '(max-width: 1280px) 100vw, 1240px',
  half: '(max-width: 860px) 100vw, 640px',
  tile: '(max-width: 720px) 50vw, (max-width: 1180px) 25vw, 190px',
  article: '(max-width: 1100px) 100vw, 1100px',
};

export function createPhotos(cfg, staticDir) {
  const dir = path.join(staticDir, 'images/photos');
  const lib = {};
  for (const [key, p] of Object.entries(cfg.photos)) {
    const widths = [640, 1280, ...(p.hero ? [1920] : [])];
    for (const w of widths) {
      if (!fs.existsSync(path.join(dir, `${key}-${w}.webp`))) throw new Error(`Photo file missing: images/photos/${key}-${w}.webp`);
    }
    lib[key] = {
      key,
      alt: p.alt,
      src: `/images/photos/${key}-1280.webp`,
      thumb: `/images/photos/${key}-640.webp`,
      srcset: widths.map((w) => `/images/photos/${key}-${w}.webp ${w}w`).join(', '),
      large: `/images/photos/${key}-${widths[widths.length - 1]}.webp`,
    };
  }

  const photo = (key) => {
    const ph = lib[key];
    if (!ph) throw new Error(`Unknown photo key "${key}" (add it to src/data/photos.json)`);
    return ph;
  };
  const section = (name) => photo(cfg.sections[name]);

  // <img> with responsive srcset. `eager` for above-the-fold images, lazy otherwise.
  const img = (keyOrPhoto, { sizes = SIZES.half, alt, eager = false, cls = '' } = {}) => {
    const ph = typeof keyOrPhoto === 'string' ? photo(keyOrPhoto) : keyOrPhoto;
    const a = alt ?? ph.alt;
    return `<img${cls ? ` class="${cls}"` : ''} src="${ph.src}" srcset="${ph.srcset}" sizes="${sizes}" alt="${esc(a)}" width="1200" height="800" ${eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}>`;
  };

  // Image list for a property: genuine photos first; otherwise clearly-labelled stock photos.
  const propertyImages = (p) => {
    if (p.images?.length) {
      return p.images.map((src, i) => ({ src, thumb: src, alt: `${p.title}, ${p.location.area} — photo ${i + 1}`, real: true }));
    }
    const keys = p.stockImages?.length ? p.stockImages : cfg.categories[p.category];
    if (!keys?.length) throw new Error(`Property ${p.id}: no images and no stock photos for category "${p.category}"`);
    return keys.map((k) => {
      const ph = photo(k);
      return { ...ph, alt: `Sample stock photo: ${ph.alt} (not the actual property)`, real: false };
    });
  };

  return { photo, section, img, propertyImages, postPhoto: (post) => photo(cfg.posts[post.category] || cfg.sections['service-sales']) };
}
