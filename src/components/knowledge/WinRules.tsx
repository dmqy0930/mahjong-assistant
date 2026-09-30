'use client';

export function WinRules() {
  return (
    <div className="space-y-6">
      {/* 一般型 */}
      <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
        <h3 className="text-base font-serif font-bold text-[#C9A24B] mb-3">一般型（4面子1雀头）</h3>
        <p className="text-sm text-[#EFE9DA] mb-3">
          手牌14张，由4组面子（顺子/刻子/杠子）+ 1组雀头（对子）组成。
        </p>
        <div className="bg-[#0F1A15] rounded-md p-3 mb-3">
          <p className="text-xs text-[#9FAF9E] mb-2">示例：</p>
          <div className="flex flex-wrap gap-1 items-center">
            <TileGroup label="[1-2-3万]" />
            <TileGroup label="[5-6-7筒]" />
            <TileGroup label="[2-2-2条]" />
            <TileGroup label="[7-8-9万]" />
            <TileGroup label="[東-東]" highlight />
          </div>
        </div>
        <p className="text-xs text-[#9FAF9E]">
          面子可以是顺子（3张连续数牌）、刻子（3张相同牌）或杠子（4张相同牌）。
        </p>
      </section>

      {/* 七对子 */}
      <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
        <h3 className="text-base font-serif font-bold text-[#C9A24B] mb-3">七对子</h3>
        <p className="text-sm text-[#EFE9DA] mb-3">
          手牌由7组不同的对子组成。门清限定，固定25符。
        </p>
        <div className="bg-[#0F1A15] rounded-md p-3">
          <p className="text-xs text-[#9FAF9E] mb-2">示例：</p>
          <div className="flex flex-wrap gap-1 items-center">
            <TileGroup label="[1-1万]" />
            <TileGroup label="[3-3万]" />
            <TileGroup label="[5-5筒]" />
            <TileGroup label="[7-7筒]" />
            <TileGroup label="[2-2条]" />
            <TileGroup label="[8-8条]" />
            <TileGroup label="[中-中]" />
          </div>
        </div>
        <p className="text-xs text-[#C4463A] mt-2">
          注意：相同的牌不能出现4张（即不能有2组完全相同的对子）。
        </p>
      </section>

      {/* 国士无双 */}
      <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
        <h3 className="text-base font-serif font-bold text-[#C9A24B] mb-3">国士无双（十三幺）</h3>
        <p className="text-sm text-[#EFE9DA] mb-3">
          13种幺九牌各一张，再加其中任意一张做雀头。役满。
        </p>
        <div className="bg-[#0F1A15] rounded-md p-3 mb-3">
          <p className="text-xs text-[#9FAF9E] mb-2">13种幺九牌：</p>
          <div className="flex flex-wrap gap-1">
            {['1万', '9万', '1筒', '9筒', '1条', '9条', '東', '南', '西', '北', '白', '發', '中'].map(t => (
              <span key={t} className="inline-block px-2 py-1 bg-[#17251D] rounded text-xs text-[#EFE9DA]">{t}</span>
            ))}
          </div>
        </div>
        <p className="text-xs text-[#9FAF9E]">
          国士无双十三面听（听13种幺九牌中任意一张）为双倍役满。
        </p>
      </section>

      {/* 听牌形式 */}
      <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
        <h3 className="text-base font-serif font-bold text-[#C9A24B] mb-3">听牌形式</h3>
        <div className="space-y-3">
          <TenpaiItem name="两面听" desc="顺子两端的牌" example="[3-4] 听 [2] 和 [5]" fu={0} />
          <TenpaiItem name="嵌张听" desc="顺子中间的牌" example="[3-5] 听 [4]" fu={2} />
          <TenpaiItem name="边张听" desc="顺子边缘的牌" example="[1-2] 听 [3] 或 [8-9] 听 [7]" fu={2} />
          <TenpaiItem name="单骑听" desc="雀头的另一张" example="已有 [東] 听 [東]" fu={2} />
          <TenpaiItem name="双碰听" desc="两个对子任一成刻" example="[3-3] [7-7] 听 [3] 或 [7]" fu={0} />
        </div>
      </section>

      {/* 振听规则 */}
      <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
        <h3 className="text-base font-serif font-bold text-[#C4463A] mb-3">振听规则</h3>
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-[#EFE9DA] mb-1">舍牌振听</h4>
            <p className="text-xs text-[#9FAF9E]">自己曾打出的牌中包含可以和的牌，则不能荣和，只能自摸。</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-[#EFE9DA] mb-1">同巡振听</h4>
            <p className="text-xs text-[#9FAF9E]">在自己摸牌到下一次摸牌之间，有人打出的牌你可以和但没有和，则进入振听状态直到自己摸牌。</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-[#EFE9DA] mb-1">立直后振听</h4>
            <p className="text-xs text-[#9FAF9E]">立直后，如果有人打出的牌你可以和但没有和（见逃），则永久振听，只能自摸。</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function TileGroup({ label, highlight }: { label: string; highlight?: boolean }) {
  return (
    <span className={`inline-block px-2 py-1 rounded text-xs ${
      highlight ? 'bg-[#C9A24B]/20 text-[#C9A24B] border border-[#C9A24B]/30' : 'bg-[#17251D] text-[#EFE9DA]'
    }`}>
      {label}
    </span>
  );
}

function TenpaiItem({ name, desc, example, fu }: { name: string; desc: string; example: string; fu: number }) {
  return (
    <div className="bg-[#0F1A15] rounded-md p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-[#EFE9DA]">{name}</span>
        {fu > 0 && <span className="text-xs text-[#C9A24B]">+{fu}符</span>}
      </div>
      <p className="text-xs text-[#9FAF9E]">{desc}</p>
      <p className="text-xs text-[#EFE9DA] mt-1 font-mono">{example}</p>
    </div>
  );
}
