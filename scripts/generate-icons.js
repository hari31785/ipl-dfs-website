const sharp = require('sharp');
const path = require('path');

const makeSvg = (size) => {
  const trophy = size >= 256 ? 72 : 40;
  const fontSize = size >= 256 ? 48 : 26;
  const subSize = size >= 256 ? 28 : 16;
  const cx = size / 2;
  const trophyY = size * 0.32;
  const textY = size * 0.65;
  const subY = size * 0.80;

  const tx = cx - trophy * 0.4;
  const ty = trophyY - trophy * 0.45;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="#60B8E0"/>
  <g transform="translate(${tx}, ${ty})">
    <rect x="${trophy*0.28}" y="${trophy*0.72}" width="${trophy*0.14}" height="${trophy*0.24}" fill="#F97316"/>
    <rect x="${trophy*0.14}" y="${trophy*0.92}" width="${trophy*0.52}" height="${trophy*0.08}" rx="${trophy*0.03}" fill="#F97316"/>
    <path d="M${trophy*0.1} ${trophy*0.05} L${trophy*0.7} ${trophy*0.05} L${trophy*0.7} ${trophy*0.45} Q${trophy*0.7} ${trophy*0.75} ${trophy*0.4} ${trophy*0.75} Q${trophy*0.1} ${trophy*0.75} ${trophy*0.1} ${trophy*0.45} Z" fill="#F97316"/>
    <path d="M${trophy*0.1} ${trophy*0.15} Q${trophy*(-0.08)} ${trophy*0.15} ${trophy*(-0.08)} ${trophy*0.38} Q${trophy*(-0.08)} ${trophy*0.55} ${trophy*0.1} ${trophy*0.55}" stroke="#F97316" stroke-width="${trophy*0.07}" fill="none" stroke-linecap="round"/>
    <path d="M${trophy*0.7} ${trophy*0.15} Q${trophy*0.88} ${trophy*0.15} ${trophy*0.88} ${trophy*0.38} Q${trophy*0.88} ${trophy*0.55} ${trophy*0.7} ${trophy*0.55}" stroke="#F97316" stroke-width="${trophy*0.07}" fill="none" stroke-linecap="round"/>
    <polygon points="${trophy*0.28},${trophy*0.08} ${trophy*0.4},${trophy*(-0.06)} ${trophy*0.52},${trophy*0.08}" fill="#FBBF24"/>
  </g>
  <text x="${cx}" y="${textY}" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="${fontSize}" fill="#F97316" text-anchor="middle" letter-spacing="1">IPL</text>
  <text x="${cx}" y="${subY}" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="${subSize}" fill="#EA580C" text-anchor="middle" letter-spacing="3">DFS</text>
</svg>`;
};

const pub = path.join(__dirname, '..', 'public');

Promise.all([
  sharp(Buffer.from(makeSvg(192))).png().toFile(path.join(pub, 'icon-192.png')),
  sharp(Buffer.from(makeSvg(512))).png().toFile(path.join(pub, 'icon-512.png')),
]).then(() => {
  console.log('✅ Generated icon-192.png and icon-512.png');
}).catch(console.error);
