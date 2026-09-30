// 日本麻将类型定义

// 牌的种类
export type TileSuit = 'man' | 'pin' | 'sou' | 'honor'; // 万子、筒子、索子、字牌
export type HonorType = 'wind' | 'dragon'; // 风牌、三元牌
export type WindType = 'east' | 'south' | 'west' | 'north';

// 单张牌
export interface Tile {
  suit: TileSuit;
  rank: number; // 1-9 for numbered suits, 1=east,2=south,3=west,4=north,5=white,6=green,7=red for honors
  isRed?: boolean; // 赤宝牌
  id?: string; // 唯一标识
}

// 面子类型
export type MentsuType = 'shuntsu' | 'koutsu' | 'kantsu'; // 顺子、刻子、杠子

// 面子
export interface Mentsu {
  type: MentsuType;
  tiles: Tile[];
  isOpen: boolean; // 是否副露（明刻/明杠/明顺）
}

// 雀头（将牌）
export interface Janto {
  tiles: [Tile, Tile];
}

// 和牌形式
export type WinType = 'normal' | 'chitoitsu' | 'kokushi'; // 一般型、七对子、国士无双

// 和牌方式
export type AgariType = 'tsumo' | 'ron'; // 自摸、荣和

// 玩家位置
export type PlayerWind = 'east' | 'south' | 'west' | 'north'; // 自风

// 场风
export type BaWind = 'east' | 'south' | 'west' | 'north';

// 听牌形式
export type TenpaiType = 'ryanmen' | 'kanchan' | 'penchan' | 'tanki' | 'shanpon';
// 两面、嵌张、边张、单骑、双碰

// 役种
export interface Yaku {
  id: string;
  name: string;
  nameJp: string; // 日文名
  han: number; // 番数（门清时）
  hanOpen: number; // 番数（副露时，0表示门清限定）
  isYakuman: boolean;
  description: string;
}

// 计算结果
export interface CalcResult {
  yakuList: { yaku: Yaku; han: number }[];
  totalHan: number;
  fu: number;
  /** 基本点，用于按人数（三麻/四麻）推导各家授受 */
  basicPoints: number;
  points: {
    dealer_tsumo: number; // 庄家自摸（每家支付）
    non_dealer_tsumo_dealer: number; // 闲家自摸庄家支付
    non_dealer_tsumo_non_dealer: number; // 闲家自摸闲家支付
    dealer_ron: number; // 庄家荣和
    non_dealer_ron: number; // 闲家荣和
  };
  isYakuman: boolean;
  hasYaku: boolean; // 是否至少有一个役（无役不能和牌）
  doraCount: number; // 宝牌合计张数（表+里+赤）
  limitType: 'none' | 'mangan' | 'haneman' | 'baiman' | 'sanbaiman' | 'yakuman';
}

// 和牌输入
export interface WinHandInput {
  handTiles: Tile[]; // 手牌（含和牌的那张）
  openMentsu: Mentsu[]; // 副露面子
  janto: Janto | null; // 雀头
  mentsu: Mentsu[]; // 手牌中的面子
  winTile: Tile; // 和了牌
  winType: WinType;
  agariType: AgariType;
  isMenzen: boolean; // 是否门清
  isTsumo: boolean; // 是否自摸
  isDealer: boolean; // 是否庄家
  playerWind: PlayerWind; // 自风
  baWind: BaWind; // 场风
  doraTiles: Tile[]; // 表宝牌（已由指示牌换算后的宝牌本身）
  uraDoraTiles: Tile[]; // 里宝牌（同为宝牌本身）
  redDoraCount: number; // 赤宝牌数
  isRiichi: boolean; // 是否立直
  isDoubleRiichi: boolean; // 是否双立直
  isIppatsu: boolean; // 是否一发
  isMenzenTsumo: boolean; // 是否门清自摸
  isLastTile: boolean; // 是否海底/河底
  isLastDraw: boolean; // 是否岭上
  isFirstDraw: boolean; // 是否天和/地和
  isTenhou: boolean; // 天和
  isChiihou: boolean; // 地和
  honba: number; // 本场数
  kyoutaku: number; // 供托数（立直棒）
  tenpaiType: TenpaiType; // 听牌形式
  selectedYaku: string[]; // 手动选择的役种ID
  isFuriten: boolean; // 振听
}

// 对局记录
export interface GameRecord {
  id: string;
  players: PlayerInfo[];
  rounds: RoundRecord[];
  startTime: number;
  endTime?: number;
  isFinished: boolean;
}

export interface PlayerInfo {
  name: string;
  score: number;
  wind: PlayerWind;
}

export interface RoundRecord {
  roundName: string; // 如 "东1局"
  results: RoundResult;
  honba: number;
  kyoutaku: number;
}

export interface RoundResult {
  winner?: number; // 和牌者索引
  loser?: number; // 放铳者索引
  isTsumo: boolean;
  points: number; // 基本点数变动
  yakuList: string[];
  han: number;
  fu: number;
  scoreChanges: number[]; // 各家点数变动 [p1, p2, p3, p4]
}

// 术语
export interface Term {
  id: string;
  term: string;
  termJp: string;
  category: string;
  description: string;
}
