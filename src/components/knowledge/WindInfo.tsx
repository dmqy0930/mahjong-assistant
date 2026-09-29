'use client';

export function WindInfo() {
  return (
    <div className="space-y-6">
      {/* 自风 */}
      <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
        <h3 className="text-base font-serif font-bold text-[#C9A24B] mb-3">自风（自分風）</h3>
        <p className="text-sm text-[#EFE9DA] mb-3">
          每位玩家在本局中的位置风牌，由座位决定。
        </p>
        <div className="grid grid-cols-2 gap-2">
          <WindCard wind="東" label="东家（庄家）" desc="自风为东，开局时庄家位置" />
          <WindCard wind="南" label="南家" desc="庄家右手边的玩家" />
          <WindCard wind="西" label="西家" desc="庄家对面的玩家" />
          <WindCard wind="北" label="北家" desc="庄家左手边的玩家" />
        </div>
        <div className="mt-3 bg-[#0F1A15] rounded-md p-3">
          <p className="text-xs text-[#9FAF9E]">
            <span className="text-[#C9A24B] font-medium">重要：</span>自风牌刻子/杠子可获得「役牌：自风」1番。
            例如自风为东时，东的刻子+1番；自风为南时，南的刻子+1番。
          </p>
        </div>
      </section>

      {/* 场风 */}
      <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
        <h3 className="text-base font-serif font-bold text-[#C9A24B] mb-3">场风（場風）</h3>
        <p className="text-sm text-[#EFE9DA] mb-3">
          当前对局的场风，由当前是第几圈决定。
        </p>
        <div className="space-y-2">
          <div className="bg-[#0F1A15] rounded-md p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-serif font-bold text-[#EFE9DA]">東</span>
              <span className="text-sm text-[#EFE9DA]">东风局</span>
            </div>
            <p className="text-xs text-[#9FAF9E]">
              场风为东。东的刻子可获得「役牌：场风」1番。
              通常只打东风圈（4局）或半庄战（东风圈+南风圈）。
            </p>
          </div>
          <div className="bg-[#0F1A15] rounded-md p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-serif font-bold text-[#EFE9DA]">南</span>
              <span className="text-sm text-[#EFE9DA]">南风局</span>
            </div>
            <p className="text-xs text-[#9FAF9E]">
              场风为南。南的刻子可获得「役牌：场风」1番。
              半庄战进入南风圈后场风变为南。
            </p>
          </div>
        </div>
      </section>

      {/* 连风 */}
      <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
        <h3 className="text-base font-serif font-bold text-[#C9A24B] mb-3">连风牌</h3>
        <p className="text-sm text-[#EFE9DA] mb-3">
          当自风与场风相同时，该风牌称为连风牌。
        </p>
        <div className="bg-[#0F1A15] rounded-md p-3 mb-3">
          <p className="text-xs text-[#9FAF9E]">
            <span className="text-[#C9A24B] font-medium">典型场景：</span>
            东风局中，庄家的自风是东，场风也是东。此时东牌是连风牌。
          </p>
        </div>
        <div className="bg-[#0F1A15] rounded-md p-3">
          <p className="text-xs text-[#EFE9DA] mb-2">连风牌刻子的番数：</p>
          <div className="space-y-1">
            <p className="text-xs text-[#9FAF9E]">
              • 役牌：自风 <span className="text-[#EFE9DA]">+1番</span>
            </p>
            <p className="text-xs text-[#9FAF9E]">
              • 役牌：场风 <span className="text-[#EFE9DA]">+1番</span>
            </p>
            <p className="text-xs text-[#C9A24B] font-medium">
              合计 +2番（同时满足自风和场风条件）
            </p>
          </div>
        </div>
      </section>

      {/* 判定方法 */}
      <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
        <h3 className="text-base font-serif font-bold text-[#C9A24B] mb-3">判定方法</h3>
        <div className="space-y-3">
          <div className="bg-[#0F1A15] rounded-md p-3">
            <h4 className="text-xs font-medium text-[#EFE9DA] mb-1">步骤1：确定场风</h4>
            <p className="text-xs text-[#9FAF9E]">
              看当前是东风圈还是南风圈。东风局/东场=场风东；南风局/南场=场风南。
            </p>
          </div>
          <div className="bg-[#0F1A15] rounded-md p-3">
            <h4 className="text-xs font-medium text-[#EFE9DA] mb-1">步骤2：确定自风</h4>
            <p className="text-xs text-[#9FAF9E]">
              庄家=东，庄家右手=南，对面=西，左手=北。每局结束后按逆时针轮转。
            </p>
          </div>
          <div className="bg-[#0F1A15] rounded-md p-3">
            <h4 className="text-xs font-medium text-[#EFE9DA] mb-1">步骤3：判断役牌</h4>
            <p className="text-xs text-[#9FAF9E]">
              自风刻子=役牌1番；场风刻子=役牌1番；两者相同=连风2番。
              三元牌（白/发/中）刻子始终是役牌1番，与风无关。
            </p>
          </div>
        </div>
      </section>

      {/* 座位图 */}
      <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
        <h3 className="text-base font-serif font-bold text-[#C9A24B] mb-3">座位示意</h3>
        <div className="flex justify-center">
          <div className="relative w-48 h-48">
            {/* 中心 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[#0F1A15] border border-[#26382C] flex items-center justify-center">
                <span className="text-xs text-[#9FAF9E]">牌桌</span>
              </div>
            </div>
            {/* 东（下） */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <span className="text-lg font-serif font-bold text-[#C9A24B]">東</span>
              <span className="text-[10px] text-[#9FAF9E]">庄家</span>
            </div>
            {/* 南（左） */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col items-center">
              <span className="text-lg font-serif font-bold text-[#EFE9DA]">南</span>
              <span className="text-[10px] text-[#9FAF9E]">下家</span>
            </div>
            {/* 西（上） */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <span className="text-lg font-serif font-bold text-[#EFE9DA]">西</span>
              <span className="text-[10px] text-[#9FAF9E]">对家</span>
            </div>
            {/* 北（右） */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center">
              <span className="text-lg font-serif font-bold text-[#EFE9DA]">北</span>
              <span className="text-[10px] text-[#9FAF9E]">上家</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-[#9FAF9E] text-center mt-2">
          逆时针方向：东→南→西→北
        </p>
      </section>
    </div>
  );
}

function WindCard({ wind, label, desc }: { wind: string; label: string; desc: string }) {
  return (
    <div className="bg-[#0F1A15] rounded-md p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl font-serif font-bold text-[#EFE9DA]">{wind}</span>
        <span className="text-xs text-[#EFE9DA]">{label}</span>
      </div>
      <p className="text-[10px] text-[#9FAF9E]">{desc}</p>
    </div>
  );
}
