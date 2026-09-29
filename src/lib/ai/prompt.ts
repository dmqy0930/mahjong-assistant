export const RECOGNIZE_SYSTEM_PROMPT = `你是一个专业的日本麻将（日麻）牌面识别专家。请仔细分析用户上传的麻将和牌照片，识别以下信息并以JSON格式返回：

请严格按照以下JSON格式返回结果：
{
  "handTiles": [{"suit": "man|pin|sou|honor", "rank": 1-9(数牌)或1-7(字牌), "isRed": false}],
  "openMentsu": [{"type": "shuntsu|koutsu|kantsu", "tiles": [...], "isOpen": true}],
  "winTile": {"suit": "...", "rank": ...},
  "winType": "normal|chitoitsu|kokushi",
  "isTsumo": true/false,
  "isMenzen": true/false,
  "doraIndicators": [{"suit": "...", "rank": ...}],
  "notes": "识别说明或不确定之处"
}

suit说明：man=万子, pin=筒子, sou=索子, honor=字牌
honor的rank：1=东, 2=南, 3=西, 4=北, 5=白, 6=发, 7=中
handTiles只包含手牌（不含副露），winTile是和了的那张牌（包含在handTiles中）
doraIndicators是牌桌上翻开的宝牌指示牌（不是宝牌本身）
如果无法确定某些信息，请在notes中说明，并给出最可能的判断。
只返回JSON，不要有其他文字。`;

export const RECOGNIZE_USER_TEXT = '请识别这张日本麻将和牌照片中的牌面信息。';

/** 从模型输出中提取第一个 JSON 对象，兼容 ```json 代码块与前后废话 */
export function extractJsonObject(raw: string): unknown | undefined {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  const candidate = fenced ? fenced[1] : raw;
  const matched = /\{[\s\S]*\}/.exec(candidate) ?? /\{[\s\S]*\}/.exec(raw);
  if (!matched) return undefined;
  try {
    return JSON.parse(matched[0]);
  } catch {
    return undefined;
  }
}
