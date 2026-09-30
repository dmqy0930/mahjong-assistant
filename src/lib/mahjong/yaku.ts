import type { Yaku } from './types';

// 日麻役种完整列表
export const YAKU_LIST: Yaku[] = [
  // === 1番 ===
  { id: 'riichi', name: '立直', nameJp: 'リーチ', han: 1, hanOpen: 0, isYakuman: false, description: '门清状态下报听。副露时不可使用。' },
  { id: 'double_riichi', name: '双立直', nameJp: 'ダブルリーチ', han: 2, hanOpen: 0, isYakuman: false, description: '第一巡即报听。副露时不可使用。' },
  { id: 'ippatsu', name: '一发', nameJp: '一発', han: 1, hanOpen: 0, isYakuman: false, description: '立直后一巡内和牌。副露时不可使用。' },
  { id: 'menzen_tsumo', name: '门清自摸', nameJp: '門前清自摸和', han: 1, hanOpen: 0, isYakuman: false, description: '门清状态下自摸和牌。' },
  { id: 'tanyao', name: '断幺九', nameJp: '断幺九', han: 1, hanOpen: 1, isYakuman: false, description: '手牌全部由2-8的数牌组成，无字牌。' },
  { id: 'pinfu', name: '平和', nameJp: '平和', han: 1, hanOpen: 0, isYakuman: false, description: '门清、全为顺子、雀头非役牌、两面听。' },
  { id: 'iipeikou', name: '一杯口', nameJp: '一盃口', han: 1, hanOpen: 0, isYakuman: false, description: '门清，有两组相同的顺子。' },
  { id: 'yakuhaku_haku', name: '役牌：白', nameJp: '役牌：白', han: 1, hanOpen: 1, isYakuman: false, description: '白板刻子/杠子。' },
  { id: 'yakuhaku_hatsu', name: '役牌：发', nameJp: '役牌：發', han: 1, hanOpen: 1, isYakuman: false, description: '发财刻子/杠子。' },
  { id: 'yakuhaku_chun', name: '役牌：中', nameJp: '役牌：中', han: 1, hanOpen: 1, isYakuman: false, description: '红中刻子/杠子。' },
  { id: 'yakuhaku_jikaze', name: '役牌：自风', nameJp: '役牌：自風', han: 1, hanOpen: 1, isYakuman: false, description: '自风牌刻子/杠子。' },
  { id: 'yakuhaku_bakaze', name: '役牌：场风', nameJp: '役牌：場風', han: 1, hanOpen: 1, isYakuman: false, description: '场风牌刻子/杠子。' },
  { id: 'rinshan', name: '岭上开花', nameJp: '嶺上開花', han: 1, hanOpen: 1, isYakuman: false, description: '开杠后摸岭上牌和牌。' },
  { id: 'chankan', name: '抢杠', nameJp: '槍槓', han: 1, hanOpen: 1, isYakuman: false, description: '他人加杠时和牌。' },
  { id: 'haitei', name: '海底捞月', nameJp: '海底摸月', han: 1, hanOpen: 1, isYakuman: false, description: '自摸牌山最后一张牌和牌。' },
  { id: 'houtei', name: '河底捞鱼', nameJp: '河底撈魚', han: 1, hanOpen: 1, isYakuman: false, description: '荣和他人打出的最后一张牌。' },

  // === 2番 ===
  { id: 'sanshoku_doujun', name: '三色同顺', nameJp: '三色同順', han: 2, hanOpen: 1, isYakuman: false, description: '万、筒、条各有一组相同数字的顺子。' },
  { id: 'ikkitsuukan', name: '一气通贯', nameJp: '一気通貫', han: 2, hanOpen: 1, isYakuman: false, description: '同一花色有123、456、789三组顺子。' },
  { id: 'chantaiyao', name: '混全带幺九', nameJp: '混全帯幺九', han: 2, hanOpen: 1, isYakuman: false, description: '所有面子和雀头都含幺九牌，且有字牌。' },
  { id: 'chitoitsu', name: '七对子', nameJp: '七対子', han: 2, hanOpen: 0, isYakuman: false, description: '7组不同的对子。门清限定，25符固定。' },
  { id: 'toitoi', name: '对对和', nameJp: '対々和', han: 2, hanOpen: 2, isYakuman: false, description: '全部由刻子（杠子）组成。' },
  { id: 'sanankou', name: '三暗刻', nameJp: '三暗刻', han: 2, hanOpen: 2, isYakuman: false, description: '有三组暗刻（含暗杠）。' },
  { id: 'sankantsu', name: '三杠子', nameJp: '三槓子', han: 2, hanOpen: 2, isYakuman: false, description: '有三组杠子。' },
  { id: 'sanshoku_doukou', name: '三色同刻', nameJp: '三色同刻', han: 2, hanOpen: 2, isYakuman: false, description: '万、筒、条各有一组相同数字的刻子。' },
  { id: 'shousangen', name: '小三元', nameJp: '小三元', han: 2, hanOpen: 2, isYakuman: false, description: '白、发、中其中两组为刻子/杠子，另一组为雀头。' },
  { id: 'honroutou', name: '混老頭', nameJp: '混老頭', han: 2, hanOpen: 2, isYakuman: false, description: '全部由幺九牌和字牌组成，且所有面子均为刻子/杠子。' },

  // === 3番 ===
  { id: 'honchantaiyao', name: '纯全带幺九', nameJp: '純全帯幺九', han: 3, hanOpen: 2, isYakuman: false, description: '所有面子和雀头都含幺九牌，且无字牌。' },
  { id: 'honitsu', name: '混一色', nameJp: '混一色', han: 3, hanOpen: 2, isYakuman: false, description: '手牌由一种数牌和字牌组成。' },
  { id: 'ryanpeikou', name: '二杯口', nameJp: '二盃口', han: 3, hanOpen: 0, isYakuman: false, description: '门清，有两组一杯口（共4组顺子含2对相同）。' },

  // === 6番 ===
  { id: 'chinitsu', name: '清一色', nameJp: '清一色', han: 6, hanOpen: 5, isYakuman: false, description: '手牌全部由一种数牌组成，无字牌。' },

  // === 役满 ===
  { id: 'kokushi', name: '国士无双', nameJp: '国士無双', han: 13, hanOpen: 13, isYakuman: true, description: '13种幺九牌各一张，再加其中任意一张做雀头。' },
  { id: 'kokushi_juusanmen', name: '国士无双十三面', nameJp: '国士無双十三面待ち', han: 26, hanOpen: 26, isYakuman: true, description: '国士无双听13种幺九牌中的任意一张。双倍役满。' },
  { id: 'suuankou', name: '四暗刻', nameJp: '四暗刻', han: 13, hanOpen: 13, isYakuman: true, description: '有四组暗刻。门清限定。' },
  { id: 'suuankou_tanki', name: '四暗刻单骑', nameJp: '四暗刻単騎', han: 26, hanOpen: 26, isYakuman: true, description: '四暗刻且单骑听雀头。双倍役满。' },
  { id: 'daisangen', name: '大三元', nameJp: '大三元', han: 13, hanOpen: 13, isYakuman: true, description: '白、发、中三组刻子/杠子。' },
  { id: 'shousuushii', name: '小四喜', nameJp: '小四喜', han: 13, hanOpen: 13, isYakuman: true, description: '有三组风牌刻子+一组风牌雀头。' },
  { id: 'daisuushii', name: '大四喜', nameJp: '大四喜', han: 26, hanOpen: 26, isYakuman: true, description: '四组风牌刻子。双倍役满。' },
  { id: 'tsuiisou', name: '字一色', nameJp: '字一色', han: 13, hanOpen: 13, isYakuman: true, description: '全部由字牌组成。' },
  { id: 'chinroutou', name: '清老头', nameJp: '清老頭', han: 13, hanOpen: 13, isYakuman: true, description: '全部由1和9的数牌组成。' },
  { id: 'ryuiisou', name: '绿一色', nameJp: '緑一色', han: 13, hanOpen: 13, isYakuman: true, description: '全部由绿色牌组成（2346条+发）。' },
  { id: 'suukantsu', name: '四杠子', nameJp: '四槓子', han: 13, hanOpen: 13, isYakuman: true, description: '有四组杠子。' },
  { id: 'chuuren', name: '九莲宝灯', nameJp: '九蓮宝燈', han: 13, hanOpen: 13, isYakuman: true, description: '门清，同一花色1112345678999加任意一张同花色牌。' },
  { id: 'chuuren_pure', name: '纯正九莲宝灯', nameJp: '純正九蓮宝燈', han: 26, hanOpen: 26, isYakuman: true, description: '九莲宝灯听1112345678999中的特定牌。双倍役满。' },
  { id: 'tenhou', name: '天和', nameJp: '天和', han: 13, hanOpen: 13, isYakuman: true, description: '庄家第一巡自摸。仅庄家。' },
  { id: 'chiihou', name: '地和', nameJp: '地和', han: 13, hanOpen: 13, isYakuman: true, description: '闲家第一巡自摸，且无人副露。仅闲家。' },
];

// 按番数分组的役种
export const YAKU_BY_HAN = {
  '1': YAKU_LIST.filter(y => y.han === 1 && !y.isYakuman),
  '2': YAKU_LIST.filter(y => y.han === 2 && !y.isYakuman),
  '3': YAKU_LIST.filter(y => y.han === 3 && !y.isYakuman),
  '6': YAKU_LIST.filter(y => y.han === 6 && !y.isYakuman),
  'yakuman': YAKU_LIST.filter(y => y.isYakuman),
};

// 宝牌说明
export const DORA_INFO = {
  description: '宝牌（ドラ）每张加1番，不计入役。',
  types: [
    { name: '表宝牌', nameJp: '表ドラ', description: '宝牌指示牌的下一张牌为宝牌。数牌按数字顺序，字牌按东南西北白发中顺序，9/北/中之后回到1/东/白。' },
    { name: '里宝牌', nameJp: '裏ドラ', description: '立直和牌时，表宝牌指示牌下方的牌为里宝牌指示牌。仅立直者可计算。' },
    { name: '赤宝牌', nameJp: '赤ドラ', description: '红色标记的数牌（通常5万、5筒、5条各一张），每张加1番。' },
    { name: '拔宝牌', nameJp: '抜きドラ', description: '北牌作为宝牌的特殊规则（部分规则使用）。' },
  ],
};
