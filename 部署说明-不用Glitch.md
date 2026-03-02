# 不用 Glitch 的部署方式

Glitch 用不了时，可以试下面两种。

---

## 方式一：Railway（免绑卡试用）

Railway 提供**免绑信用卡**的试用：约 30 天 + 5 美元额度，用 GitHub 登录即可。

1. 打开 **https://railway.app**，用 **GitHub** 登录。
2. 点 **Start a New Project** → **Deploy from GitHub repo**。
3. 选仓库 **XFW-hub/DailyMeals**，授权后 Railway 会拉代码并尝试自动部署。
4. 若未自动识别：
   - 在项目里点进该服务 → **Settings**
   - **Build Command** 填：`npm install`
   - **Start Command** 填：`npm start`
5. 在 **Settings** → **Networking** 里点 **Generate Domain**，会得到一个 `xxx.up.railway.app` 的链接，就是你的公网地址。

试用用完后会变成每月约 1 美元免费额度，用超才需绑卡付费。

---

## 方式二：纯前端版 → GitHub Pages / Gitee Pages（完全免卡、无服务器）

如果所有「跑 Node 的云」都不可用或要绑卡，可以改成**纯前端版本**：

- **数据**：只存在**你自己浏览器**的 localStorage里（不经过服务器）。
- **部署**：把前端页面放到 **GitHub Pages** 或 **Gitee Pages**，推代码即更新，**完全不用配服务器、不用绑卡**。
- **限制**：换电脑/换浏览器就看不到之前的数据；不能多人共享同一份数据；图片可用 base64 存进 localStorage（有容量限制），或先不传图。

如果你需要，我可以按你当前项目结构，写一个「纯前端 + localStorage」的版本，并说明怎么部署到 GitHub Pages / Gitee Pages（一步步复制粘贴即可）。

---

## 小结

| 方式 | 是否要绑卡 | 说明 |
|------|------------|------|
| **Railway** | 试用免卡，用超需卡 | 和现在项目一致，直接部署 Node，拿一个链接即可用。 |
| **纯前端 + GitHub/Gitee Pages** | 完全不要 | 改成一页前端，部署到 Pages，无服务器、无配置。 |

先试 **Railway**；若 Railway 也不行，再说一声，我按你仓库帮你做**纯前端版 + Pages 部署步骤**。
