/**
 * 上传前的图片预处理。
 *
 * 各厂商对图片格式的支持并不一致（DeepSeek 只收 webp/png/jpeg/gif，手机拍照默认
 * 产出 HEIC/HEIF），而且 Vercel 的请求体上限是 4.5MB。这里统一在浏览器里把图片
 * 解码 → 等比缩放 → 重新编码为 JPEG，一次性解决格式、体积两个问题。
 */

/** 默认不缩放，原图上传 */
export const DEFAULT_MAX_EDGE: number | null = null;
/** 需要转码时的质量，尽量不损失细节 */
export const DEFAULT_QUALITY = 1;

/** 各厂商都直接支持的格式，原样上传即可，无需重新编码 */
const PASSTHROUGH_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new ImageDecodeError('读取图片失败，请重试。'));
    reader.readAsDataURL(file);
  });
}

/** 只为了在界面上显示分辨率，失败不影响上传 */
async function readDimensions(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const image = await decode(file);
    const size = { width: image.width, height: image.height };
    if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) image.close();
    return size;
  } catch {
    return null;
  }
}

function renderJpeg(
  image: DecodedImage,
  width: number,
  height: number,
  quality: number,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageDecodeError('当前浏览器不支持 Canvas，无法处理图片。');

  // 铺白底，避免带透明通道的 PNG 转 JPEG 后变成黑底
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  if (!dataUrl.startsWith('data:image/jpeg')) {
    throw new ImageDecodeError('图片转码失败，请换一张图片重试。');
  }
  return dataUrl;
}

export interface TargetSize {
  width: number;
  height: number;
  scaled: boolean;
}

export class ImageDecodeError extends Error {
  constructor(
    message = '浏览器无法解码这张图片（可能是 HEIC/AVIF 等格式），请改用 JPG/PNG，或先用截图另存后再上传。',
  ) {
    super(message);
    this.name = 'ImageDecodeError';
  }
}

/** 等比缩放到最长边不超过 maxEdge（只缩不放）；maxEdge 为 null 时原样返回 */
export function computeTargetSize(
  width: number,
  height: number,
  maxEdge: number | null,
): TargetSize {
  if (maxEdge === null || !Number.isFinite(maxEdge) || maxEdge <= 0) {
    return { width, height, scaled: false };
  }
  const longest = Math.max(width, height);
  if (!Number.isFinite(longest) || longest <= 0) {
    return { width, height, scaled: false };
  }
  if (longest <= maxEdge) return { width, height, scaled: false };

  const ratio = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
    scaled: true,
  };
}

/** 估算 dataURL 负载的二进制字节数 */
export function estimateDataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
}

export interface PreparedImage {
  dataUrl: string;
  mediaType: string;
  bytes: number;
  width: number;
  height: number;
  /** 是否做过缩放 */
  scaled: boolean;
  /** 是否做过重新编码（原始格式不是 JPEG） */
  converted: boolean;
  /** 原始文件的格式与体积，便于排查问题 */
  sourceType: string;
  sourceBytes: number;
}

export type DetectedImageType = 'jpeg' | 'png' | 'gif' | 'webp' | 'unknown';

export interface ImageProbe {
  /** dataURL 里声明的 MIME */
  declaredType: string;
  /** 依据字节头判断出的真实格式 */
  detectedType: DetectedImageType;
  bytes: number;
  /** 前 8 个字节的十六进制，排查用 */
  magicHex: string;
}

function headBytes(base64: string): Uint8Array {
  // 只取头部，24 个字符 = 18 字节，且长度是 4 的倍数，满足 atob 要求
  const head = base64.slice(0, 24);
  if (typeof atob !== 'function') return new Uint8Array(0);
  try {
    const binary = atob(head);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return new Uint8Array(0);
  }
}

function detectType(bytes: Uint8Array): DetectedImageType {
  const ascii = (start: number, text: string) =>
    text.split('').every((ch, i) => bytes[start + i] === ch.charCodeAt(0));

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
  if (ascii(0, 'GIF8')) return 'gif';
  if (ascii(0, 'RIFF') && ascii(8, 'WEBP')) return 'webp';
  return 'unknown';
}

/**
 * 按文件字节头判断图片真实格式。
 * 厂商普遍按内容而非声明的 MIME 判断，所以这一步能快速定位“为什么图被拒”。
 */
export function sniffImage(dataUrl: string): ImageProbe {
  const matched = /^data:([^;,]+);base64,([\s\S]*)$/.exec(dataUrl);
  const declaredType = matched ? matched[1] : 'unknown';
  const payload = matched ? matched[2] : dataUrl;
  const head = headBytes(payload);

  return {
    declaredType,
    detectedType: detectType(head),
    bytes: estimateDataUrlBytes(dataUrl),
    magicHex: Array.from(head.slice(0, 8))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(''),
  };
}

export function formatProbe(probe: ImageProbe): string {
  return `${probe.detectedType} · ${Math.round(probe.bytes / 1024)}KB · 头字节 ${probe.magicHex || '空'}`;
}

/** 界面上展示「已上传」那一行用 */
export function describePreparedImage(image: PreparedImage): string {
  const kb = Math.max(1, Math.round(image.bytes / 1024));
  const dims = image.width > 0 && image.height > 0 ? ` · ${image.width}×${image.height}` : '';
  const converted = image.converted ? `（原图 ${image.sourceType || '未知'}，已转码）` : '';
  return `${image.mediaType} · ${kb}KB${dims}${converted}`;
}

export interface PrepareOptions {
  /** 传数字才会缩放；默认 null 表示原图上传 */
  maxEdge?: number | null;
  quality?: number;
}

type DecodedImage = ImageBitmap | HTMLImageElement;

async function decode(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // 落到 <img> 解码分支
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new ImageDecodeError());
      image.src = objectUrl;
    });
  } catch (error) {
    throw error instanceof ImageDecodeError ? error : new ImageDecodeError();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function prepareImageForUpload(
  file: File,
  options: PrepareOptions = {},
): Promise<PreparedImage> {
  const maxEdge = options.maxEdge ?? DEFAULT_MAX_EDGE;
  const quality = options.quality ?? DEFAULT_QUALITY;

  // 原图优先：格式已被厂商支持、且没有显式要求缩放时，直接上传原始字节，
  // 完全不经过 canvas，避免任何重新编码造成的细节损失。
  if (maxEdge === null && PASSTHROUGH_TYPES.has(file.type)) {
    const dataUrl = await readAsDataUrl(file);
    const size = await readDimensions(file);
    return {
      dataUrl,
      mediaType: file.type,
      bytes: estimateDataUrlBytes(dataUrl),
      width: size?.width ?? 0,
      height: size?.height ?? 0,
      scaled: false,
      converted: false,
      sourceType: file.type,
      sourceBytes: file.size,
    };
  }

  // HEIC / AVIF 等厂商不认的格式必须转码；此处保留原始分辨率与质量
  const image = await decode(file);
  const sourceWidth = image.width;
  const sourceHeight = image.height;

  try {
    const target = computeTargetSize(sourceWidth, sourceHeight, maxEdge);
    const dataUrl = renderJpeg(image, target.width, target.height, quality);
    return {
      dataUrl,
      mediaType: 'image/jpeg',
      bytes: estimateDataUrlBytes(dataUrl),
      width: target.width,
      height: target.height,
      scaled: target.scaled,
      converted: file.type !== 'image/jpeg',
      sourceType: file.type || '未知',
      sourceBytes: file.size,
    };
  } finally {
    if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) image.close();
  }
}
