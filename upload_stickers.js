const fs = require('fs');
const https = require('https');

async function uploadToCloudinary(filePath) {
  const fileData = fs.readFileSync(filePath);
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  
  let body = '';
  body += '--' + boundary + '\r\n';
  body += 'Content-Disposition: form-data; name="upload_preset"\r\n\r\n';
  body += 'cryptochat\r\n';
  body += '--' + boundary + '\r\n';
  body += 'Content-Disposition: form-data; name="file"; filename="sticker.gif"\r\n';
  body += 'Content-Type: image/gif\r\n\r\n';
  
  const footer = '\r\n--' + boundary + '--\r\n';
  
  const payload = Buffer.concat([
    Buffer.from(body, 'utf8'),
    fileData,
    Buffer.from(footer, 'utf8')
  ]);

  return new Promise((resolve, reject) => {
    const req = https.request('https://api.cloudinary.com/v1_1/f5msdmar/auto/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': payload.length
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.secure_url);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

const urls = [
  'https://i.makeagif.com/media/5-11-2020/YvsYZ_.gif', 
  'https://i.makeagif.com/media/4-13-2016/OTBzTg.gif',
  'https://media1.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif',
  'https://media1.giphy.com/media/jpbnoe3UIa8WX8XpnG/giphy.gif',
  'https://media1.giphy.com/media/2FazqiXvVst3P5hTO/giphy.gif'
];

async function run() {
  for (let i = 0; i < urls.length; i++) {
    const filePath = 'temp_' + i + '.gif';
    try {
      await new Promise((resolve, reject) => {
        https.get(urls[i], (res) => {
          if (res.statusCode !== 200) return reject(new Error('Status ' + res.statusCode));
          const stream = fs.createWriteStream(filePath);
          res.pipe(stream);
          stream.on('finish', resolve);
        }).on('error', reject);
      });
      const cloudUrl = await uploadToCloudinary(filePath);
      console.log('UPLOADED:', cloudUrl);
    } catch(e) {
      console.error('FAILED for', urls[i], e.message);
    }
  }
}
run();
