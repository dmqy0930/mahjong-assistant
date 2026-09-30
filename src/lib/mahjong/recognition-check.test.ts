import { describe, expect, it } from 'vitest';
import { checkRecognition } from './recognition-check';

const tile = (suit: string, rank: number) => ({ suit, rank });

/** 14 张的一般型：234m 567m 234p 567p 88s */
function validHand() {
  return {
    handTiles: [
      tile('man', 2), tile('man', 3), tile('man', 4),
      tile('man', 5), tile('man', 6), tile('man', 7),
      tile('pin', 2), tile('pin', 3), tile('pin', 4),
      tile('pin', 5), tile('pin', 6), tile('pin', 7),
      tile('sou', 8), tile('sou', 8),
    ],
    openMentsu: [],
    winTile: tile('man', 4),
    winType: 'normal',
  };
}

describe('checkRecognition', () => {
  it('合法结果没有问题', () => {
    expect(checkRecognition(validHand())).toEqual([]);
  });

  it('张数不对时给出提示', () => {
    const hand = validHand();
    hand.handTiles = hand.handTiles.slice(0, 13);
    expect(checkRecognition(hand).join()).toContain('应该是 14 张');
  });

  it('有副露时手牌张数相应减少', () => {
    const hand = {
      handTiles: [
        tile('man', 2), tile('man', 3), tile('man', 4),
        tile('man', 5), tile('man', 6), tile('man', 7),
        tile('pin', 2), tile('pin', 3), tile('pin', 4),
        tile('sou', 8), tile('sou', 8),
      ],
      openMentsu: [
        { type: 'koutsu', tiles: [tile('honor', 7), tile('honor', 7), tile('honor', 7)] },
      ],
      winTile: tile('man', 4),
      winType: 'normal',
    };
    expect(checkRecognition(hand)).toEqual([]);
  });

  it('同种牌超过 4 张会被抓出来', () => {
    const hand = validHand();
    // 造出 5 张 5 万
    for (let i = 0; i < 5; i++) hand.handTiles[i] = tile('man', 5);
    const problems = checkRecognition(hand);
    expect(problems.some(p => p.includes('超过 4 张'))).toBe(true);
  });

  it('和了牌不在手牌中会被抓出来', () => {
    const hand = validHand();
    hand.winTile = tile('sou', 1);
    expect(checkRecognition(hand).join()).toContain('没有出现在 handTiles');
  });

  it('非法花色与点数会被指出', () => {
    const hand = validHand();
    hand.handTiles[0] = tile('wan', 2);
    hand.handTiles[1] = tile('honor', 9);
    const problems = checkRecognition(hand).join();
    expect(problems).toContain('非法花色');
    expect(problems).toContain('非法点数');
  });

  it('缺少 handTiles 直接返回问题', () => {
    expect(checkRecognition({})).toEqual(['缺少 handTiles，或它不是非空数组']);
  });

  it('winType 非法会被指出', () => {
    const hand = validHand();
    hand.winType = 'chiitoitsu-maybe';
    expect(checkRecognition(hand).join()).toContain('winType');
  });

  it('七对子（无副露 14 张）合法', () => {
    const hand = {
      handTiles: [
        tile('man', 1), tile('man', 1), tile('man', 2), tile('man', 2),
        tile('pin', 3), tile('pin', 3), tile('pin', 4), tile('pin', 4),
        tile('sou', 5), tile('sou', 5), tile('sou', 6), tile('sou', 6),
        tile('honor', 7), tile('honor', 7),
      ],
      openMentsu: [],
      winTile: tile('honor', 7),
      winType: 'chitoitsu',
    };
    expect(checkRecognition(hand)).toEqual([]);
  });
});
