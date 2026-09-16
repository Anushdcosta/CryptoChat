const fs = require('fs');
const { createCanvas } = require('canvas');

const COLORS = {
  red: { key: '#ff0000', comp: '#00ffff' },
  green: { key: '#00ff00', comp: '#ff00ff' },
  blue: { key: '#0000ff', comp: '#ffff00' },
};

const encryptTextToCanvas = (text, keyColorName) => {
  const canvas = createCanvas(400, 150);
  const ctx = canvas.getContext('2d');
  const colorSet = COLORS[keyColorName];

  // 1. White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Secret text
  ctx.fillStyle = colorSet.comp;
  ctx.font = '900 64px "Arial Black", sans-serif'; 
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  // 3. Punch holes to make the text sparse (halftone effect)
  ctx.globalCompositeOperation = 'destination-out';
  for (let y = 0; y < canvas.height; y += 4) {
    ctx.fillRect(0, y, canvas.width, 2); 
  }
  for (let x = 0; x < canvas.width; x += 4) {
    ctx.fillRect(x, 0, 2, canvas.height); 
  }
  
  // Fill the erased holes with white
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 4. Draw sparse Cyan Decoys
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = colorSet.comp;
  ctx.strokeStyle = colorSet.comp;
  for (let i = 0; i < 200; i++) {
    const size = Math.random() * 4 + 2; // SMALL decoys
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, size, size);
  }

  // 5. Build OFFSCREEN Camo
  const camoCanvas = createCanvas(canvas.width, canvas.height);
  const camoCtx = camoCanvas.getContext('2d');
  camoCtx.fillStyle = '#ffffff';
  camoCtx.fillRect(0, 0, camoCanvas.width, camoCanvas.height);

  for (let i = 0; i < 1500; i++) {
    let r = 255, g = 255, b = 255;
    if (keyColorName === 'red') {
      g = Math.floor(Math.random() * 256);
      b = Math.floor(Math.random() * 256);
    } else if (keyColorName === 'green') {
      r = Math.floor(Math.random() * 256);
      b = Math.floor(Math.random() * 256);
    } else if (keyColorName === 'blue') {
      r = Math.floor(Math.random() * 256);
      g = Math.floor(Math.random() * 256);
    }
    
    camoCtx.fillStyle = `rgb(${r},${g},${b})`;
    camoCtx.strokeStyle = `rgb(${r},${g},${b})`;
    
    if (Math.random() > 0.5) {
      const size = Math.random() * 20 + 5;
      camoCtx.fillRect(Math.random() * camoCanvas.width, Math.random() * camoCanvas.height, size, size);
    } else {
      camoCtx.lineWidth = Math.random() * 4 + 1;
      camoCtx.beginPath();
      camoCtx.moveTo(Math.random() * camoCanvas.width, Math.random() * camoCanvas.height);
      camoCtx.lineTo(Math.random() * camoCanvas.width, Math.random() * camoCanvas.height);
      camoCtx.stroke();
    }
  }

  // 6. MULTIPLY the camo onto the main canvas
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(camoCanvas, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  // SIMULATE RED LENS FOR COUNTING
  const lensCanvas = createCanvas(400, 150);
  const lctx = lensCanvas.getContext('2d');
  lctx.drawImage(canvas, 0, 0);
  lctx.globalCompositeOperation = 'multiply';
  lctx.fillStyle = '#ff0000';
  lctx.fillRect(0, 0, 400, 150);

  return { original: canvas, lens: lensCanvas };
};

const result = encryptTextToCanvas('HELLO', 'red');
fs.writeFileSync('test_original.png', result.original.toBuffer('image/png'));
fs.writeFileSync('test_lens.png', result.lens.toBuffer('image/png'));

const data = result.lens.getContext('2d').getImageData(0,0,400,150).data;
let black = 0;
for(let i=0; i<data.length; i+=4) {
  if (data[i] < 50 && data[i+1] < 50 && data[i+2] < 50) black++;
}
console.log('Black pixels:', black, '/', 60000, '(', Math.round(black/60000*100), '%)');
