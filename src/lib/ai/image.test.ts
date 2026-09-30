import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAX_EDGE,
  computeTargetSize,
  estimateDataUrlBytes,
  sniffImage,
} from './image';

const toDataUrl = (mime: string, bytes: number[]) =>
  `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;

describe('computeTargetSize', () => {
  it('未超过上限时原样返回', () => {
    expect(computeTargetSize(1200, 800, 1600)).toEqual({
      width: 1200,
      height: 800,
      scaled: false,
    });
  });

  it('超过上限时按最长边等比缩放', () => {
    expect(computeTargetSize(4000, 3000, 1600)).toEqual({
      width: 1600,
      height: 1200,
      scaled: true,
    });
  });

  it('竖图按高度缩放', () => {
    expect(computeTargetSize(3000, 4000, 1600)).toEqual({
      width: 1200,
      height: 1600,
      scaled: true,
    });
  });

  it('只缩不放', () => {
    expect(computeTargetSize(100, 80, 1600)).toEqual({ width: 100, height: 80, scaled: false });
  });

  it('极小图片不会被压成 0 像素', () => {
    const result = computeTargetSize(1, 4000, 1600);
    expect(result.width).toBeGreaterThanOrEqual(1);
    expect(result.height).toBe(1600);
  });

  it('非法尺寸不会抛错', () => {
    expect(computeTargetSize(0, 0, 1600)).toEqual({ width: 0, height: 0, scaled: false });
    expect(computeTargetSize(Number.NaN, 100, 1600).scaled).toBe(false);
  });
});

describe('原图上传', () => {
  it('默认不做缩放', () => {
    expect(DEFAULT_MAX_EDGE).toBeNull();
  });

  it('maxEdge 为 null 时原样返回尺寸', () => {
    expect(computeTargetSize(4000, 3000, null)).toEqual({
      width: 4000,
      height: 3000,
      scaled: false,
    });
  });

  it('显式传入 maxEdge 时仍然会缩放', () => {
    expect(computeTargetSize(4000, 3000, 2400).scaled).toBe(true);
  });
});

describe('estimateDataUrlBytes', () => {
  it('带 dataURL 前缀与填充', () => {
    // "hello" 的 base64 为 aGVsbG8=（5 字节）
    expect(estimateDataUrlBytes('data:image/jpeg;base64,aGVsbG8=')).toBe(5);
  });

  it('无填充', () => {
    // "Man" 的 base64 为 TWFu（3 字节）
    expect(estimateDataUrlBytes('TWFu')).toBe(3);
  });

  it('空负载返回 0', () => {
    expect(estimateDataUrlBytes('data:image/jpeg;base64,')).toBe(0);
  });
});

describe('sniffImage 字节头识别', () => {
  it('识别 JPEG', () => {
    const probe = sniffImage(toDataUrl('image/jpeg', [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]));
    expect(probe.detectedType).toBe('jpeg');
    expect(probe.declaredType).toBe('image/jpeg');
    expect(probe.magicHex.startsWith('ffd8ff')).toBe(true);
  });

  it('识别 PNG', () => {
    const probe = sniffImage(toDataUrl('image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(probe.detectedType).toBe('png');
  });

  it('识别 GIF', () => {
    const probe = sniffImage(toDataUrl('image/gif', [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]));
    expect(probe.detectedType).toBe('gif');
  });

  it('识别 WEBP', () => {
    const bytes = [
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ];
    expect(sniffImage(toDataUrl('image/webp', bytes)).detectedType).toBe('webp');
  });

  it('声明是 jpeg 但内容是别的格式时，以字节头为准', () => {
    const probe = sniffImage(toDataUrl('image/jpeg', [0x00, 0x11, 0x22, 0x33, 0x44, 0x55]));
    expect(probe.declaredType).toBe('image/jpeg');
    expect(probe.detectedType).toBe('unknown');
  });

  it('空负载不会抛错', () => {
    const probe = sniffImage('data:image/jpeg;base64,');
    expect(probe.detectedType).toBe('unknown');
    expect(probe.bytes).toBe(0);
  });
});
