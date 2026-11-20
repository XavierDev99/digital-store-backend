const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const httpError = require('./httpError');

const directory = path.resolve(process.env.UPLOAD_DIR || 'uploads');

async function saveImage(image, createdFiles) {
  if (typeof image.content !== 'string') throw httpError(400, 'Conteúdo da imagem obrigatório.');
  if (/^https?:\/\//i.test(image.content)) {
    let url;
    try { url = new URL(image.content); } catch { throw httpError(400, 'URL de imagem inválida.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.href.length > 255) throw httpError(400, 'URL de imagem inválida.');
    return url.href;
  }
  const extensions = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg' };
  const extension = extensions[image.type];
  if (!extension) throw httpError(400, 'Envie uma imagem PNG ou JPEG.');
  const content = image.content.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(content)) throw httpError(400, 'Base64 inválido.');
  const buffer = Buffer.from(content, 'base64');
  const signature = extension === 'png'
    ? buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  if (!signature || buffer.length > 5 * 1024 * 1024) throw httpError(400, 'Imagem inválida ou maior que 5 MB.');
  const name = crypto.randomUUID() + '.' + extension;
  const relative = '/uploads/' + name;
  await fs.mkdir(directory, { recursive: true });
  // Track first so a partial write is removed if the database operation fails.
  createdFiles.push(relative);
  await fs.writeFile(path.join(directory, name), buffer, { flag: 'wx' });
  return relative;
}

async function removeFiles(paths) {
  for (const value of paths) {
    if (!/^\/uploads\/[a-f0-9-]+\.(png|jpg)$/.test(value)) continue;
    try { await fs.unlink(path.join(directory, path.basename(value))); }
    catch (error) { if (error.code !== 'ENOENT') console.error('Falha ao remover imagem:', error.code); }
  }
}
module.exports = { saveImage, removeFiles, directory };

