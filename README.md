# 麻雀助手

日本麻将（日麻）助手网页，移动端优先，和风 + 绿绒牌桌视觉风格。

## 功能

- **基础知识**：和牌规则、役种表（含役满/双倍役满）、术语检索、番符换算、风牌与连风
- **拍照算点**：拍照/上传牌面 → 多模态识别 → 手动修正 → 自动判定和牌形、听牌形与役种 → 计算番符点数
- **一局计分**：对局记录、各家点数增减、顺位排名、历史明细（localStorage 持久化）

## 技术栈

- Next.js 16（App Router）+ React 19 + TypeScript 5
- Tailwind CSS 4（设计令牌定义在 `src/app/globals.css`）
- coze-coding-dev-sdk（多模态 LLM：`doubao-seed-2-0-pro-260215`）
- Vitest（点数与手牌判定单元测试）

## 目录结构

```
src/
├── app/
│   ├── page.tsx                 # 首页导航
│   ├── knowledge/page.tsx       # 基础知识
│   ├── calculator/page.tsx      # 拍照算点
│   ├── game/page.tsx            # 一局计分
│   ├── api/recognize/route.ts   # 牌面识别 API
│   └── globals.css              # 设计令牌 + 牌面样式
├── components/
│   ├── knowledge/               # 知识页组件
│   └── calculator/              # 牌面显示/选择器
└── lib/mahjong/
    ├── types.ts                 # 类型定义
    ├── calculator.ts            # 符数/点数/宝牌计算引擎
    ├── hand.ts                  # 手牌分解 + 自动役种判定
    ├── yaku.ts                  # 役种数据
    ├── terms.ts                 # 术语数据
    └── tile-utils.ts            # 牌工具函数
```

## 本地开发

项目强制使用 pnpm（`preinstall` 会拦截 npm/yarn）：

```bash
corepack enable pnpm
pnpm install
pnpm dev          # 开发服务器（默认 5000 端口）
```

### 识别 API 的环境变量

`/api/recognize` 通过 coze-coding-dev-sdk 调用豆包多模态模型：

- **在扣子编程 / Coze 云运行时内运行**：SDK 使用项目运行时身份鉴权，**不需要注册或配置任何 token**。
- **本地开发、自建服务器、Docker 等非云端环境**：需要注册扣子账号并生成 API Token，参考 `.env.example` 配置 `COZE_API_TOKEN`。

## 常用命令

```bash
pnpm dev          # 开发
pnpm build        # 生产构建
pnpm start        # 启动生产服务
pnpm ts-check     # 类型检查
pnpm lint         # ESLint
pnpm lint:style   # Stylelint
pnpm test         # Vitest 单元测试
pnpm validate     # 以上校验 + 测试全部执行
```

## 部署

1. 在扣子编程中直接部署：`.coze` 已声明 `build` / `run` / `validate` 脚本，平台会自动执行 `scripts/build.sh` 与 `scripts/start.sh`。
2. 自建部署：`pnpm install && pnpm build`，生产启动入口是 `pnpm start`（基于 `src/server.ts`，可用 `PORT`/`HOSTNAME` 覆盖监听地址）。
3. 自建环境务必配置 `COZE_API_TOKEN`，并建议给 `/api/recognize` 增加限流与来源校验，避免接口被刷。

## 设计规范

主题色、字体、动效与禁忌见 `DESIGN.md`；开发约定见 `AGENTS.md`。
