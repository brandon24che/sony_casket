const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = 'C:/Users/DELL/AppData/Local/Temp/casket_frames/casket';
const OUT = path.join(__dirname, '..', 'frames');
const WIDTH = 1536;
const STEP = 2;

fs.mkdirSync(OUT, { recursive: true });
const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.png')).sort();
const picked = files.filter((_, i) => i % STEP === 0);
console.log(`source frames: ${files.length}, picked: ${picked.length}`);

(async () => {
  let total = 0;
  for (let i = 0; i < picked.length; i++) {
    const outName = `f_${String(i).padStart(3, '0')}.webp`;
    const info = await sharp(path.join(SRC, picked[i]))
      .resize({ width: WIDTH })
      .webp({ quality: 80, effort: 4 })
      .toFile(path.join(OUT, outName));
    total += info.size;
    if (i % 20 === 0 || i === picked.length - 1) console.log(`${i + 1}/${picked.length}`);
  }
  // poster frame for instant first paint
  await sharp(path.join(SRC, picked[0])).resize({ width: WIDTH }).jpeg({ quality: 82 }).toFile(path.join(OUT, 'poster.jpg'));
  console.log('done. total webp size:', (total / 1024 / 1024).toFixed(1), 'MB');
})();
