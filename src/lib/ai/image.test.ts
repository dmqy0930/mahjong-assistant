import { describe, expect, it } from 'vitest';
import { computeTargetSize, estimateDataUrlBytes } from './image';

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
