'use client';

import { THREE_PLAYER_TSUMO_RULES } from '@/lib/mahjong/scoring';

const DIFFERENCES = [
  {
    title: '人数与座位',
    four: '4 人，东・南・西・北四个座位',
    three: '3 人，只有东・南・西，没有北家',
  },
  {
    title: '使用的牌',
    four: '全部 136 张（含万子 1-9）',
    three: '108 张：去掉万子的 2-8，只保留 1 万和 9 万',
  },
  {
    title: '三色同顺',
    four: '成立',
    three: '不成立（万子只剩 1 和 9，凑不出顺子）；三色同刻仍可成立',
  },
  {
    title: '自摸的支付',
    four: '3 家支付：闲家自摸时庄家付 2 倍、闲家付 1 倍',
    three: '只有 2 家支付，各规则处理方式不同，见下方',
  },
  {
    title: '起始点数',
    four: '通常 25000',
    three: '常提高到 30000 或 35000，因为高打点更容易出现、容易被击飞',
  },
  {
    title: '中途流局',
    four: '九种九牌、四风连打、四家立直、三家和了',
    three: '多数不采用；部分规则保留「三风子连打」「三人立直」',
  },
  {
    title: '积棒（本场）',
    four: '每本 300 点（自摸每家 100）',
    three: '部分规则按 1 本 1000 点处理',
  },
];

const NORTH_RULES = [
  { name: '常时役牌', desc: '北永远算役牌。最简单，但北的刻子会变得非常强。' },
  {
    name: '拔北宝牌',
    desc: '摸到北可以拔出来当作宝牌，并从岭上补牌（类似杠）。通常还要规定手牌中不能使用北。',
  },
  {
    name: '常时宝牌',
    desc: '北本身就是宝牌，摸到即加番。也有规则把 1 万、9 万一并设为拔宝牌。',
  },
];

export function ThreePlayerRules() {
  return (
    <div className="space-y-6">
      <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
        <h3 className="text-base font-serif font-bold text-[#C9A24B] mb-3">三麻与四麻的差异</h3>
        <div className="space-y-2">
          {DIFFERENCES.map(item => (
            <div key={item.title} className="bg-[#0F1A15] rounded-md p-3">
              <p className="text-xs font-medium text-[#EFE9DA] mb-1.5">{item.title}</p>
              <div className="space-y-1">
                <p className="text-[11px] text-[#9FAF9E] leading-relaxed">
                  <span className="text-[#9FAF9E]/60">四麻　</span>
                  {item.four}
                </p>
                <p className="text-[11px] text-[#EFE9DA] leading-relaxed">
                  <span className="text-[#C9A24B]">三麻　</span>
                  {item.three}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
        <h3 className="text-base font-serif font-bold text-[#C9A24B] mb-2">北风牌怎么处理</h3>
        <p className="text-xs text-[#9FAF9E] leading-relaxed mb-3">
          没有北家，北牌就成了三麻特有的问题，常见三种处理方式：
        </p>
        <div className="space-y-2">
          {NORTH_RULES.map(item => (
            <RuleItem key={item.name} name={item.name} desc={item.desc} />
          ))}
        </div>
      </section>

      <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
        <h3 className="text-base font-serif font-bold text-[#C9A24B] mb-2">自摸的三种常见算法</h3>
        <p className="text-xs text-[#9FAF9E] leading-relaxed mb-3">
          三麻没有北家，自摸时少一家支付，各家规则对此处理不同。本工具在新建对局时可以选定：
        </p>
        <div className="space-y-2">
          {THREE_PLAYER_TSUMO_RULES.map(rule => (
            <RuleItem key={rule.id} name={rule.name} desc={rule.description} />
          ))}
        </div>
        <p className="text-[11px] text-[#9FAF9E] leading-relaxed mt-3 bg-[#0F1A15] rounded p-2">
          除上述三种外，还有「丸取り」（按荣和点数反推两家分摊）、「親3倍かぶり」等变体，
          实际对局前最好先与同桌确认。
        </p>
      </section>

      <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
        <h3 className="text-base font-serif font-bold text-[#C9A24B] mb-2">实战影响</h3>
        <ul className="space-y-1.5 text-xs text-[#9FAF9E] leading-relaxed">
          <li>• 牌数变少、顺子变少，手牌更容易做大，役满与高打点出现频率明显高于四麻。</li>
          <li>• 起始点数若仍为 25000，东场就可能出现击飞，因此常上调到 30000 以上。</li>
          <li>• 「ツモ損」规则下荣和更划算，会催生更多暗听与愚形立直。</li>
          <li>• 只有两家对手，节奏更快，副露与立直的博弈权重更高。</li>
        </ul>
      </section>
    </div>
  );
}

function RuleItem({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="bg-[#0F1A15] rounded-md p-2.5">
      <p className="text-xs font-medium text-[#EFE9DA] mb-0.5">{name}</p>
      <p className="text-[11px] text-[#9FAF9E] leading-relaxed">{desc}</p>
    </div>
  );
}
