# 背概念（Flashcard PWA）

> 主动回忆 + 间隔重复的概念背诵工具。纯前端、可离线、数据只存在你自己的浏览器里。

适合背定义、术语、公式、外语概念、考试知识点。

## 功能

- 卡片管理：新增 / 编辑 / 删除 / 关键词搜索 / 标签筛选
- 卡片字段：概念名、标准答案、要点清单、解释、例子、标签、难度、来源
- 复习：看概念 → 心里回忆 → 翻面看答案 → 自评「忘记 / 模糊 / 记住」
- 调度算法：SM-2 简化版（EF 1.3~3.0，间隔上限 365 天）
- 首页：今日待复习数、每日目标进度、连续打卡、卡片总数
- 统计：近 7 天复习量、各标签掌握度、遗忘最多的卡片
- 数据：JSON 完整备份 / 恢复，CSV 导出（Excel 查看），一键清空
- PWA：可添加到手机主屏，断网可用

## 环境要求

- Node.js **20 LTS 或 22 LTS**（https://nodejs.org/zh-cn/download）
- npm 随 Node.js 一起安装，无需单独安装

## 本地运行

```powershell
# 进入项目目录
Set-Location D:\projects\beigainian

# 首次运行：安装依赖（国内镜像加速，可跳过）
npm config set registry https://registry.npmmirror.com
npm install

# 启动开发服务器
npm run dev
```

浏览器打开 http://localhost:5173 。

## 构建与离线预览

```powershell
npm run build     # 类型检查 + 打包，产物在 dist/
npm run preview   # 本地预览生产包，http://localhost:4173
```

> 离线缓存只在 `build` 之后生效。`dev` 模式下没有 Service Worker，测离线请用 `preview`。

## 技术栈

- React 19 + TypeScript + Vite 6
- Tailwind CSS v3（简约黑白灰）
- Dexie 4 → IndexedDB（本地数据库）
- vite-plugin-pwa 2 → Service Worker + manifest
- lucide-react 图标

## 目录结构

```
src/
├── algorithms/sm2.ts      # SM-2 调度算法（纯函数）
├── components/            # NavBar、CardForm
├── db/
│   ├── index.ts           # Dexie 实例 + 增删改查
│   └── types.ts           # Card / ReviewLog / Settings 类型
├── pages/                 # Home / Cards / Study / Stats / Settings
├── utils/
│   ├── backup.ts          # 导入导出、清空
│   ├── date.ts            # 日期与连续打卡
│   └── stats.ts           # 统计汇总
├── App.tsx                # 用 useState 切换 5 个页面
├── main.tsx
└── index.css
```

## 数据说明

- 所有数据存放在浏览器 IndexedDB（数据库名 `beigainian`），不经过任何服务器
- 换浏览器、换设备、换域名都不会自动同步，需用「设置 → 导出 JSON」再「导入 JSON」
- 清除浏览器数据会一并删除卡片，请定期导出备份

## 部署到 Vercel

1. 把代码推到 GitHub（见下文「推送到 GitHub」）
2. 打开 https://vercel.com ，点 `Sign Up` → `Continue with GitHub` 授权
3. 点 `Add New...` → `Project` → 找到仓库 → `Import`
4. Framework Preset 会自动识别为 **Vite**，Build Command `npm run build`，Output Directory `dist`，都不用改
5. 点 `Deploy`，等待 1 分钟左右
6. 拿到形如 `https://beigainian-xxx.vercel.app` 的地址
7. 之后每次 `git push`，Vercel 会自动重新部署

## 推送到 GitHub

```powershell
Set-Location D:\projects\beigainian

git --version          # 没有则先安装 https://git-scm.com/download/win
git init
git add .
git commit -m "feat: 背概念 MVP"
git branch -M main
git remote add origin https://github.com/<你的用户名>/beigainian.git
git push -u origin main
```

首次 push 会弹出浏览器让你登录 GitHub，按提示授权即可。

## 安装到手机主屏

- Android Chrome：打开网址 → 右上角 `⋮` → `安装应用` 或 `添加到主屏幕`
- iPhone Safari（必须用 Safari）：打开网址 → 底部「分享」按钮 → `添加到主屏幕` → `添加`
- 装好后从桌面图标打开，没有浏览器地址栏，断网也能用

## 图标资源

`public/` 下由 `favicon.svg` 生成：

| 文件 | 用途 |
| --- | --- |
| `pwa-192x192.png` | Android 主屏图标 |
| `pwa-512x512.png` | 启动画面 / 高分辨率 |
| `maskable-icon-512x512.png` | Android 自适应图标 |
| `apple-touch-icon-180x180.png` | iPhone 主屏图标 |
| `favicon.ico` / `favicon.svg` | 浏览器标签页 |

改图标后重新生成：

```powershell
npx pwa-assets-generator --preset minimal public/favicon.svg
```

## 常见问题

**端口被占用**：Vite 会自动换到 5174，看终端打印的地址即可。

**改了代码页面没变**：先确认终端里 dev 进程还在跑；必要时 `Ctrl + R` 强制刷新。

**手机上打开是空的**：每个设备的数据独立，在电脑上「设置 → 导出 JSON」，手机上「导入 JSON」即可。

**想加「输入答案 + 要点覆盖检查」**：属于后续迭代，算法与数据字段（`keyPoints`）已预留。

**清空数据**：设置页 → 清空所有数据（两次确认）。清空前建议先导出 JSON。
