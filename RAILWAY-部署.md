# Railway 部署步骤

按下面做，拿到一个公网链接（如 `https://xxx.up.railway.app`）即可使用。

---

## 1. 打开 Railway

浏览器打开：**https://railway.app**  
用 **GitHub** 登录（Sign in with GitHub）。

---

## 2. 新建项目并从 GitHub 部署

- 点 **Start a New Project**（或 **New Project**）
- 选 **Deploy from GitHub repo**
- 若第一次用，会提示授权 Railway 访问 GitHub，点 **Configure GitHub App** 或 **Authorize**，勾选你的账号或 **Only select repositories** 选 **XFW-hub/DailyMeals**
- 在仓库列表里选 **DailyMeals**（或 XFW-hub/DailyMeals），确认

Railway 会自动拉取代码并尝试构建、运行。

---

## 3. 确认构建和启动命令（若未自动识别）

- 在项目里点进刚创建的服务（一个方块/卡片）
- 左侧或上方点 **Settings**
- 找到 **Build** / **Deploy** 相关：
  - **Build Command** 填：`npm install`（或留空，Railway 一般会自动执行）
  - **Start Command** 填：`npm start`
- **Root Directory** 留空（项目在仓库根目录）
- 保存

若没有这些输入框，说明 Railway 已从 `package.json` 识别，可跳过。

---

## 4. 生成公网链接

- 在同一服务的 **Settings** 里找 **Networking** / **Public Networking**
- 点 **Generate Domain**（或 **Add Domain**）
- Railway 会分配一个域名，形如：**https://xxxx.up.railway.app**
- 复制这个链接，在浏览器打开即可使用你的三餐记录

---

## 5. 可选：设置环境变量

当前项目用 `process.env.PORT`，Railway 会自动注入端口，一般**不用**再配。  
若以后要加配置（如密钥），在 **Settings** → **Variables** 里添加即可。

---

## 小结

| 步骤 | 操作 |
|------|------|
| 1 | 打开 railway.app，用 GitHub 登录 |
| 2 | New Project → Deploy from GitHub repo → 选 DailyMeals |
| 3 | 需要时在 Settings 里填 Build: `npm install`，Start: `npm start` |
| 4 | Settings → Networking → Generate Domain，复制链接 |
| 5 | 用该链接访问、注册/登录即可使用 |

之后每次在 GitHub 上 **push** 代码，Railway 会自动重新部署；无需再在 Replit/Glitch 上操作。
