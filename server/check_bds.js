const axios = require('axios');
const AdmZip = require('adm-zip');

async function test() {
  console.log('Testing download of 1.26.61.1 win...');
  const url = 'https://www.minecraft.net/bedrockdedicatedserver/bin-win/bedrock-server-1.26.61.1.zip';
  const res = await axios({
    url,
    method: 'GET',
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    timeout: 30000
  });
  console.log('Downloaded size:', res.data.length, 'bytes');
  const zip = new AdmZip(Buffer.from(res.data));
  const entries = zip.getEntries().map(e => e.entryName);
  console.log('Has bedrock_server.exe:', entries.includes('bedrock_server.exe'));
  console.log('Total files in zip:', entries.length);
}
test().catch(console.error);
