'use client';

export function FuCalc() {
  return (
    <div className="space-y-6">
      {/* 符的构成 */}
      <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
        <h3 className="text-base font-serif font-bold text-[#C9A24B] mb-3">符的构成</h3>
        <div className="space-y-3">
          <FuItem name="底符" value="20符" desc="所有和牌都有20符底符" />
          <FuItem name="门清荣和" value="+10符" desc="门清状态下荣和时加10符" />
          <FuItem name="自摸" value="+2符" desc="自摸时加2符（平和自摸除外）" />
          <FuItem name="雀头符" value="+2符" desc="三元牌雀头+2符；自风/场风雀头各+2符" />
        </div>
      </section>

      {/* 面子符 */}
      <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
        <h3 className="text-base font-serif font-bold text-[#C9A24B] mb-3">面子符数</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[#9FAF9E] border-b border-[#26382C]">
                <th className="text-left py-2 pr-2">面子类型</th>
                <th className="text-center py-2 px-2">中张</th>
                <th className="text-center py-2 px-2">幺九</th>
              </tr>
            </thead>
            <tbody className="text-[#EFE9DA]">
              <tr className="border-b border-[#26382C]/50">
                <td className="py-2 pr-2">明刻</td>
                <td className="text-center py-2 px-2">2符</td>
                <td className="text-center py-2 px-2">4符</td>
              </tr>
              <tr className="border-b border-[#26382C]/50">
                <td className="py-2 pr-2">暗刻</td>
                <td className="text-center py-2 px-2">4符</td>
                <td className="text-center py-2 px-2">8符</td>
              </tr>
              <tr className="border-b border-[#26382C]/50">
                <td className="py-2 pr-2">明杠</td>
                <td className="text-center py-2 px-2">8符</td>
                <td className="text-center py-2 px-2">16符</td>
              </tr>
              <tr>
                <td className="py-2 pr-2">暗杠</td>
                <td className="text-center py-2 px-2">16符</td>
                <td className="text-center py-2 px-2">32符</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[#9FAF9E] mt-2">
          顺子无论明暗、中张幺九均为0符。
        </p>
      </section>

      {/* 听牌形符 */}
      <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
        <h3 className="text-base font-serif font-bold text-[#C9A24B] mb-3">听牌形加符</h3>
        <div className="space-y-2">
          <FuItem name="嵌张听" value="+2符" desc="听顺子中间的牌（如3-5听4）" />
          <FuItem name="边张听" value="+2符" desc="听顺子边缘的牌（如1-2听3、8-9听7）" />
          <FuItem name="单骑听" value="+2符" desc="听雀头的另一张牌" />
          <FuItem name="两面听" value="0符" desc="听顺子两端的牌，不加符" />
          <FuItem name="双碰听" value="0符" desc="两个对子听其中任一成刻，不加符" />
        </div>
      </section>

      {/* 点数换算 */}
      <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
        <h3 className="text-base font-serif font-bold text-[#C9A24B] mb-3">翻数与点数换算</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[#9FAF9E] border-b border-[#26382C]">
                <th className="text-left py-2 pr-2">级别</th>
                <th className="text-center py-2 px-2">条件</th>
                <th className="text-center py-2 px-2">闲家荣和</th>
                <th className="text-center py-2 px-2">庄家荣和</th>
              </tr>
            </thead>
            <tbody className="text-[#EFE9DA]">
              <tr className="border-b border-[#26382C]/50">
                <td className="py-2 pr-2">满贯</td>
                <td className="text-center py-2 px-2">5番 / 4番40符+ / 3番70符+</td>
                <td className="text-center py-2 px-2 text-[#C9A24B]">8000</td>
                <td className="text-center py-2 px-2 text-[#C9A24B]">12000</td>
              </tr>
              <tr className="border-b border-[#26382C]/50">
                <td className="py-2 pr-2">跳满</td>
                <td className="text-center py-2 px-2">6-7番</td>
                <td className="text-center py-2 px-2 text-[#C9A24B]">12000</td>
                <td className="text-center py-2 px-2 text-[#C9A24B]">18000</td>
              </tr>
              <tr className="border-b border-[#26382C]/50">
                <td className="py-2 pr-2">倍满</td>
                <td className="text-center py-2 px-2">8-10番</td>
                <td className="text-center py-2 px-2 text-[#C9A24B]">16000</td>
                <td className="text-center py-2 px-2 text-[#C9A24B]">24000</td>
              </tr>
              <tr className="border-b border-[#26382C]/50">
                <td className="py-2 pr-2">三倍满</td>
                <td className="text-center py-2 px-2">11-12番</td>
                <td className="text-center py-2 px-2 text-[#C9A24B]">24000</td>
                <td className="text-center py-2 px-2 text-[#C9A24B]">36000</td>
              </tr>
              <tr>
                <td className="py-2 pr-2 text-[#C9A24B] font-bold">役满</td>
                <td className="text-center py-2 px-2">13番+</td>
                <td className="text-center py-2 px-2 text-[#C9A24B] font-bold">32000</td>
                <td className="text-center py-2 px-2 text-[#C9A24B] font-bold">48000</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 自摸点数 */}
      <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
        <h3 className="text-base font-serif font-bold text-[#C9A24B] mb-3">自摸点数</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[#9FAF9E] border-b border-[#26382C]">
                <th className="text-left py-2 pr-2">级别</th>
                <th className="text-center py-2 px-2">庄家自摸</th>
                <th className="text-center py-2 px-2">闲家自摸</th>
              </tr>
            </thead>
            <tbody className="text-[#EFE9DA]">
              <tr className="border-b border-[#26382C]/50">
                <td className="py-2 pr-2">满贯</td>
                <td className="text-center py-2 px-2">4000点×2</td>
                <td className="text-center py-2 px-2">2000/4000</td>
              </tr>
              <tr className="border-b border-[#26382C]/50">
                <td className="py-2 pr-2">跳满</td>
                <td className="text-center py-2 px-2">6000点×2</td>
                <td className="text-center py-2 px-2">3000/6000</td>
              </tr>
              <tr className="border-b border-[#26382C]/50">
                <td className="py-2 pr-2">倍满</td>
                <td className="text-center py-2 px-2">8000点×2</td>
                <td className="text-center py-2 px-2">4000/8000</td>
              </tr>
              <tr className="border-b border-[#26382C]/50">
                <td className="py-2 pr-2">三倍满</td>
                <td className="text-center py-2 px-2">12000点×2</td>
                <td className="text-center py-2 px-2">6000/12000</td>
              </tr>
              <tr>
                <td className="py-2 pr-2 text-[#C9A24B] font-bold">役满</td>
                <td className="text-center py-2 px-2 text-[#C9A24B]">16000点×2</td>
                <td className="text-center py-2 px-2 text-[#C9A24B]">8000/16000</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 计算示例 */}
      <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
        <h3 className="text-base font-serif font-bold text-[#C9A24B] mb-3">计算示例</h3>
        <div className="space-y-4">
          <div className="bg-[#0F1A15] rounded-md p-3">
            <p className="text-xs font-medium text-[#EFE9DA] mb-2">示例1：门清立直 70符3番</p>
            <p className="text-xs text-[#9FAF9E]">
              底符20 + 门清荣和10 + 暗刻8符 + 雀头2符 + 嵌张2符 = 42符 → 50符（进位）<br />
              50符3番 = 基本点 50×2^(3+2) = 1600 → 跳满12000点
            </p>
          </div>
          <div className="bg-[#0F1A15] rounded-md p-3">
            <p className="text-xs font-medium text-[#EFE9DA] mb-2">示例2：副露 30符1番</p>
            <p className="text-xs text-[#9FAF9E]">
              底符20 + 明刻2符 + 雀头2符 + 两面听0符 = 24符 → 30符（副露最低30符）<br />
              30符1番 = 基本点 30×2^(1+2) = 240 → 闲家荣和 240×4 = 960 → 1000点
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function FuItem({ name, value, desc }: { name: string; value: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 bg-[#0F1A15] rounded-md p-2">
      <div className="flex-1">
        <span className="text-xs font-medium text-[#EFE9DA]">{name}</span>
        <p className="text-[10px] text-[#9FAF9E] mt-0.5">{desc}</p>
      </div>
      <span className="text-xs font-bold text-[#C9A24B] whitespace-nowrap">{value}</span>
    </div>
  );
}
