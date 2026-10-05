const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = 'C:/Users/DELL/AppData/Local/Temp/casket_frames/casket';
const OUT = path.join(__dirname, '..', 'frames');

async function probe() {
  const f = path.join(SRC, 'frame_0001_t0_000s.png');
  const meta = await sharp(f).metadata();
  console.log('dimensions:', meta.width, 'x', meta.height, 'format:', meta.format);

  const img = sharp(f);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const mid = (a) => a.map(Math.round).join(',');
  console.log('corner TL:', mid(px(2, 2)), ' corner TR:', mid(px(info.width - 3, 2)));
  console.log('corner BL:', mid(px(2, info.height - 3)), ' corner BR:', mid(px(info.width - 3, info.height - 3)));
  console.log('center:', mid(px(Math.floor(info.width / 2), Math.floor(info.height / 2))));
  console.log('edge mid-top:', mid(px(Math.floor(info.width / 2), 2)), ' edge mid-left:', mid(px(2, Math.floor(info.height / 2))));

  // last frame too
  const fl = path.join(SRC, 'frame_0242_t8_033s.png');
  const { data: d2, info: i2 } = await sharp(fl).raw().toBuffer({ resolveWithObject: true });
  const px2 = (x, y) => {
    const i = (y * i2.width + x) * i2.channels;
    return [d2[i], d2[i + 1], d2[i + 2]];
  };
  console.log('LAST corner TL:', mid(px2(2, 2)), ' LAST edge mid-top:', mid(px2(Math.floor(i2.width / 2), 2)));
}

probe().catch(console.error);
