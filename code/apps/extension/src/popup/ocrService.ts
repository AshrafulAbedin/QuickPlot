import { createWorker, PSM, type Worker } from 'tesseract.js';
import { cleanRawInput } from './equationValidator';

export interface OcrProgress {
  status: string;
  progress: number;
}

export type OcrProgressCallback = (progress: OcrProgress) => void;

/**
 * Preprocesses an image before feeding to Tesseract:
 * 1. Upscales small equation crops (minimum height 160px) so superscripts are readable.
 * 2. Adds 30px clean white margin so boundary characters and brackets are not clipped.
 * 3. Detects dark/light background polarity and inverts dark backgrounds to black-on-white.
 * 4. Stretches contrast so text is sharp black and background is clean white.
 */
export function preprocessMathCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const minHeight = 160;
  const scale = source.height < minHeight ? Math.max(2, Math.min(4, Math.ceil(minHeight / Math.max(source.height, 1)))) : 2;
  const padding = 30;

  const dest = document.createElement('canvas');
  dest.width = source.width * scale + padding * 2;
  dest.height = source.height * scale + padding * 2;
  const ctx = dest.getContext('2d');
  if (!ctx) return source;

  // 1. Crisp white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, dest.width, dest.height);

  // 2. High-quality scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, padding, padding, source.width * scale, source.height * scale);

  // 3. Grayscale, background polarity & contrast stretch
  const imgData = ctx.getImageData(0, 0, dest.width, dest.height);
  const data = imgData.data;

  // Sample corner pixels of the source image to detect background polarity
  let sampleLum = 0;
  let sampleCount = 0;
  const samplePoints = [
    [padding + 2, padding + 2],
    [dest.width - padding - 3, padding + 2],
    [padding + 2, dest.height - padding - 3],
    [dest.width - padding - 3, dest.height - padding - 3],
  ];
  for (const [x, y] of samplePoints) {
    const idx = (y * dest.width + x) * 4;
    sampleLum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    sampleCount++;
  }
  const isDarkBackground = sampleLum / sampleCount < 128;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;

    if (isDarkBackground) {
      gray = 255 - gray;
    }

    // High contrast thresholding
    if (gray > 195) {
      gray = 255;
    } else if (gray < 130) {
      gray = 0;
    } else {
      gray = Math.round(((gray - 130) / 65) * 255);
    }

    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
    data[i + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
  return dest;
}

/**
 * Intelligent post-processor specifically for mathematical equations recognized via OCR.
 * Disambiguates OCR confusion:
 * - Superscript 2/3 misread as '?' or '%' (e.g. 'y?' -> 'y^2', 'x%' -> 'x^2')
 * - Trailing exponent on brackets without caret (e.g. ')3' -> ')^3')
 * - Wide minuses misread as double hyphens (e.g. '--' -> '-')
 * - Implicit multiplication between adjacent variables (e.g. 'x^2 y^3' -> 'x^2 * y^3')
 * - Spacing normalization around operators (+, -, *, /, =)
 */
export function cleanOcrMathText(rawText: string): string {
  if (!rawText) return '';

  // 1. Pick the best candidate line containing math symbols or '='
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return '';

  let candidate = lines.find((l) => l.includes('=') || /[\+\-\*\/\^]/.test(l)) || lines[0];

  // 2. Strip leading / trailing OCR artifacts (pipes, bullets, backticks)
  candidate = candidate.replace(/^[\s\|·•`~'\"]+/, '').replace(/[\s\|·•`~'\"]+$/, '');

  // Strip trailing equation numbering e.g. "(1)", "[2]" early before implicit multiplication
  candidate = candidate.replace(/\s*[\(\[]\s*\d+\s*[\)\]]\s*$/, '');

  // 3. Normalize unicode math symbols
  candidate = candidate
    .replace(/[—–−]/g, '-')
    .replace(/[×✕]/g, '*')
    .replace(/÷/g, '/')
    .replace(/[\u221A√]/g, 'sqrt')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/⁴/g, '^4')
    .replace(/⁵/g, '^5')
    .replace(/⁶/g, '^6')
    .replace(/⁷/g, '^7')
    .replace(/⁸/g, '^8')
    .replace(/⁹/g, '^9')
    .replace(/⁰/g, '^0')
    .replace(/[θΘ]/g, 'theta')
    .replace(/[πΠ]/g, 'pi');

  // 4. Fix conflated or confused operators from OCR smudges
  // e.g. '- =' or '-=' -> '-', '+ =' or '+=' -> '+'
  candidate = candidate.replace(/[-–—]\s*=\s*/g, '- ');
  candidate = candidate.replace(/\+\s*=\s*/g, '+ ');
  candidate = candidate.replace(/[\*×✕]\s*=\s*/g, '* ');
  candidate = candidate.replace(/[\/÷]\s*=\s*/g, '/ ');

  // Fix double or triple hyphens from wide minus / en-dash glyphs
  candidate = candidate.replace(/-{2,}/g, '-');
  candidate = candidate.replace(/\+\s*-/g, '-');
  candidate = candidate.replace(/-\s*-/g, '-');
  candidate = candidate.replace(/\+\s*\+/g, '+');

  // If there are multiple '=' signs in an equation, any '=' inside parentheses e.g. '(x^2 + y^2 = 1)'
  // when another '=' is outside (e.g. '= 0') was an OCR minus misread:
  while ((candidate.match(/=/g) || []).length > 1 && /\([^()]*=[^()]*\)/.test(candidate)) {
    candidate = candidate.replace(/\(([^()]*)=([^()]*)\)/g, '($1 - $2)');
  }

  // 5. Fix common OCR misidentifications of superscripts:
  // When '?' or '%' follows a variable or term (e.g. 'y?', 'x%', 'y%'), it is an exponent '^2'
  candidate = candidate.replace(/\b([a-zA-Z])\s*[\?%]/g, '$1^2');
  candidate = candidate.replace(/[\)\]]\s*[\?%]/g, ')^2');

  // When a number directly follows a closing parenthesis or bracket e.g. ')3' or ') 3' or ']3' -> ')^3'
  candidate = candidate.replace(/[\)\]]\s*([2-9]|\d+)\b/g, ')^$1');

  // When a variable without carets is followed immediately by another variable e.g. 'x2y3' -> 'x^2 * y^3'
  candidate = candidate.replace(/(?<![a-zA-Z])([xytrzs])([2-9])(?=[a-zA-Z])/gi, '$1^$2 * ');

  // When a single digit follows a variable with zero or more spaces e.g. '3x2' -> '3x^2', 'x2' -> 'x^2', 'y3' -> 'y^3', 'x 2' -> 'x^2'
  candidate = candidate.replace(/(?<![a-zA-Z])([xytrzs])\s*([2-9])\b(?!\s*[\(\w])/gi, '$1^$2');
  candidate = candidate.replace(/(?<![a-zA-Z])([a-zA-Z])\s*([2-9])\b(?!\s*[\(\w])/g, '$1^$2');

  // 6. Fix zero vs capital O
  candidate = candidate.replace(/([=\+\-\*\/\^\(\s])O(?=[=\+\-\*\/\^\)\s\.,]|$)/g, '$10');
  candidate = candidate.replace(/^O(?=[=\+\-\*\/\^\)\s\.,]|$)/g, '0');
  candidate = candidate.replace(/([0-9])O\b/g, '$10');

  // 7. Fix vertical bars or letters misread for digit 1 around operators
  candidate = candidate.replace(/([=\+\-\*\/]\s*)[|lI]\b/g, '$11');

  // 8. Fix trig functions missing parens
  candidate = candidate.replace(/\b(sin|cos|tan|cot|sec|csc|asin|acos|atan|sinh|cosh|tanh|ln|log|exp|sqrt)\s*\((.*?)\)/gi, '$1($2)');
  candidate = candidate.replace(/\b(sin|cos|tan|cot|sec|csc)\s*(x|y|t|theta)\b/gi, '$1($2)');

  // 9. Fix implicit multiplication between terms:
  // e.g. 'x^2 y^3' -> 'x^2 * y^3', 'x^2y^3' -> 'x^2 * y^3'
  candidate = candidate.replace(/(\^[0-9]+)\s*([a-zA-Z])/g, '$1 * $2');
  candidate = candidate.replace(/\b([0-9]+)\s+([a-zA-Z])/g, '$1 * $2');
  candidate = candidate.replace(/\)\s*\(/g, ') * (');
  candidate = candidate.replace(/\)\s*([a-zA-Z])/g, ') * $1');

  // 10. Clean up spaces around operators: single clean space around +, -, *, /, =
  candidate = candidate
    .replace(/\s*([=\+\-\*\/])\s*/g, ' $1 ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s*\^\s*/g, '^')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Strip trailing orphan operators if any
  candidate = candidate.replace(/[\+\-\*\/\^]+$/, '').trim();

  // 11. Run standard equation cleaner (handles trailing (1), periods, brackets)
  return cleanRawInput(candidate);
}

let activeWorker: Worker | null = null;

/**
 * Perform local browser-side OCR on an image source.
 */
export async function recognizeEquationImage(
  imageSource: HTMLCanvasElement | HTMLImageElement | Blob | string,
  onProgress?: OcrProgressCallback
): Promise<string> {
  try {
    onProgress?.({ status: 'Preprocessing image for math recognition...', progress: 0.1 });

    let finalSource: HTMLCanvasElement | HTMLImageElement | Blob | string = imageSource;
    if (typeof HTMLCanvasElement !== 'undefined' && imageSource instanceof HTMLCanvasElement) {
      finalSource = preprocessMathCanvas(imageSource);
    }

    if (!activeWorker) {
      onProgress?.({ status: 'Initializing OCR engine...', progress: 0.25 });
      activeWorker = await createWorker('eng', 1, {
        ...(typeof chrome !== 'undefined' && chrome.runtime?.getURL ? {
          workerPath: chrome.runtime.getURL('ocr/worker.min.js'),
          corePath: chrome.runtime.getURL('ocr/tesseract-core-lstm.wasm.js'),
          workerBlobURL: false,
        } : {}),
        logger: (m) => {
          if (m.status && onProgress) {
            onProgress({
              status: m.status,
              progress: typeof m.progress === 'number' ? 0.3 + m.progress * 0.5 : 0.5,
            });
          }
        },
      });

      // Configure OCR parameters for single block math
      await activeWorker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      });
    }

    onProgress?.({ status: 'Scanning mathematical characters...', progress: 0.65 });

    const ret = await activeWorker.recognize(finalSource);
    const rawText = ret.data.text || '';

    onProgress?.({ status: 'Optimizing math syntax & spacing...', progress: 0.95 });

    const cleaned = cleanOcrMathText(rawText);
    onProgress?.({ status: 'Complete', progress: 1.0 });

    return cleaned || rawText.trim();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`OCR Recognition failed: ${message}`);
  }
}

/**
 * Terminate background OCR worker if needed to free resources.
 */
export async function terminateOcrWorker(): Promise<void> {
  if (activeWorker) {
    try {
      await activeWorker.terminate();
    } catch {
      // ignore
    } finally {
      activeWorker = null;
    }
  }
}
