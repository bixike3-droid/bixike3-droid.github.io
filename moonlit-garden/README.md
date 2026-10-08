# 夜樱庭院

bixike3-droid 的场景式个人网站。六个全屏空间通过点击切换：入口、庭院中央、作品展室、月下书桌、爱好与技能、庭院访客簿。每个空间使用独立插画，支持场景网址、浏览器前进后退、键盘导航及减少动态效果。

## 内容填写

当前个人介绍、作品、爱好与技能保留待填写位置。在 app/components/SceneGarden.tsx 中填写文字与项目内容，场景样式位于 app/components/scene-garden.css。插画记录与生成提示见 SCENE-ART.md。

## 留言

访客通过昵称和留言表单提交内容，留言保存在 Cloudflare D1 数据库。GET /api/guestbook 返回最近 50 封信，POST /api/guestbook 保存一封信。支持长度限制、来源校验、重复提交间隔和失败重试。网页以普通文字渲染留言。

## 本地预览

需要 Node.js 22.13 或更新版本。安装依赖后执行：

    node scripts/run-framework.mjs build
    node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_even_northstar.sql
    node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_guest_messages.sql
    node scripts/run-framework.mjs dev

默认预览地址 http://localhost:5173。类型检查：node node_modules/typescript/bin/tsc --noEmit。留言集成检查：node scripts/check-guestbook.mjs，仅连接本机，验证后清理其创建的验证记录。

## 发布

项目使用 Vinext 和 Cloudflare D1，留言功能需要服务端运行环境。Sites 负责部署与数据库迁移；GitHub 保存第一版源代码。访问范围沿用当前站点设置。

## 素材

场景图片位于 public/assets；网站图标与装饰由 SVG 绘制。字体使用本机中文宋体与黑体。浏览器只将动态偏好保存在本机，留言由数据库持久保存。
