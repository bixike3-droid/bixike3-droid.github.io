# Bixike 个人主页

一个沉浸式暗黑星空风格的静态个人主页，基于 Three.js 粒子星空，纯 HTML/CSS/JS、零构建，直接推到 GitHub Pages 就能上线。

## 部署到 GitHub Pages

1. 在 GitHub 新建仓库，名字必须是 **`bixike3-droid.github.io`**，网址即为 `https://bixike3-droid.github.io`。
2. 在本地推送：

   ```bash
   git init
   git add .
   git commit -m "personal site"
   git branch -M main
   git remote add origin https://github.com/bixike3-droid/bixike3-droid.github.io.git
   git push -u origin main
   ```

3. 进仓库 **Settings → Pages**，Source 选 **Deploy from a branch**，Branch 选 `main`，目录选 `/ (root)`，保存。
4. 等一两分钟，访问 `https://bixike3-droid.github.io`。

> 若用 GitHub CLI：`gh repo create bixike3-droid.github.io --public --source=. --push`，再照上面设置 Pages。

## 修改内容

文案集中在 `index.html`：

- 顶部大标题 `Bixike` → 换成你的名字
- `.hero-sub` → 一句话介绍
- `#about` → 自我介绍
- `#skills` → 技能卡片
- `#projects` → 项目卡片
- `#contact` → GitHub / Email 链接

配色在 `style.css` 顶部 `:root`（`--primary`、`--primary2`、`--accent` 等）。
