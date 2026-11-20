import { createWorker, OEM, PSM } from 'tesseract.js';
import { simd } from 'wasm-feature-detect';
import workerPath from 'tesseract.js/dist/worker.min.js?url';
import standardCore from 'tesseract.js-core/tesseract-core-lstm.wasm.js?url';
import simdCore from 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url';
import english from '@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz?url';

export async function photoText(file) {
  const langPath = new URL('.', new URL(english, location.href)).href;
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  try {
    const scale = Math.min(1, 2600 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  } finally { bitmap.close(); }

  let worker, stop, timer, finished = false;
  const fail = new Promise((_, reject) => {
    stop = () => reject(new Error('The photo could not be read. Try a clear image or paste the timetable text.'));
    timer = setTimeout(stop, 45_000);
  });
  const recognise = async () => {
    const corePath = await simd() ? simdCore : standardCore;
    worker = await createWorker('eng', OEM.LSTM_ONLY, { corePath, workerPath, langPath, workerBlobURL: false, errorHandler: stop });
    if (finished) { await worker.terminate(); return ''; }
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    return (await worker.recognize(canvas)).data.text;
  };
  try { return await Promise.race([recognise(), fail]); }
  finally { finished = true; clearTimeout(timer); await worker?.terminate(); }
}
