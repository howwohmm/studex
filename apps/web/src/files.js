export const fileAccept = '.pdf,.ppt,.pptx,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp';
const types = {
  pdf: 'application/pdf', ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
};
const headerIs = (head, bytes, start = 0) => bytes.every((b, i) => head[start + i] === b);
const ascii = (s) => Array.from(s, (c) => c.charCodeAt(0));

export async function verifyFile(file) {
  const ext = file.name.split('.').at(-1).toLowerCase();
  if (!Object.hasOwn(types, ext)) throw new Error('Choose a PDF, slide deck, Word document, text file, or supported image.');
  if (!file.size || file.size > 20 * 1024 * 1024) throw new Error('The file must be between 1 byte and 20 MB.');
  if (file.type && file.type !== 'application/octet-stream' && file.type !== types[ext]) throw new Error('The file type doesn’t match its name.');
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  const checks = {
    pdf: () => headerIs(head, ascii('%PDF-')),
    png: () => headerIs(head, [137, 80, 78, 71, 13, 10, 26, 10]),
    jpg: () => headerIs(head, [255, 216, 255]),
    jpeg: () => headerIs(head, [255, 216, 255]),
    webp: () => headerIs(head, ascii('RIFF')) && headerIs(head, ascii('WEBP'), 8),
    doc: () => headerIs(head, [208, 207, 17, 224, 161, 177, 26, 225]),
    ppt: () => headerIs(head, [208, 207, 17, 224, 161, 177, 26, 225]),
    docx: () => headerIs(head, [80, 75, 3, 4]),
    pptx: () => headerIs(head, [80, 75, 3, 4]),
    txt: () => !head.includes(0),
  };
  if (!checks[ext]()) throw new Error('This file does not look like the selected format.');
  return types[ext];
}

export async function pdfText(file, maxPages = 60) {
  const [{ getDocument, GlobalWorkerOptions }, { default: workerUrl }] = await Promise.all([
    import('pdfjs-dist/build/pdf.mjs'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  GlobalWorkerOptions.workerSrc = workerUrl;
  const load = getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, enableXfa: false });
  try {
    const doc = await load.promise;
    if (doc.numPages > maxPages) throw new Error(`This PDF has more than ${maxPages} pages. Try a smaller export.`);
    const result = [];
    for (let number = 1; number <= doc.numPages; number++) {
      const page = await doc.getPage(number);
      const content = await page.getTextContent();
      result.push(content.items.map((item) => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join(''));
      page.cleanup();
    }
    return { pages: doc.numPages, text: result.join('\n').trim() };
  } finally { await load.destroy(); }
}

export async function fileHash(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
