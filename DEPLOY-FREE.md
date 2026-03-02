# 不绑银行卡的部署方式

下面这些平台**不需要绑定信用卡/银行卡**，用邮箱或 GitHub 登录即可免费部署。

> **说明**：Render、Koyeb 等目前会要求绑卡，这里只列不要求绑卡的选项。

---

## 方式一：Glitch（免卡，推荐先试）

Glitch 完全在浏览器里操作，**不绑卡**，把项目“复制”过去就能跑。

1. **打开** [glitch.com](https://glitch.com) ，用 **GitHub** 登录。
2. 点 **New project** → **Import from GitHub**。
3. 填仓库地址：`https://github.com/XFW-hub/DailyMeals`，点 **Import**。
4. 等导入完成。Glitch 会识别为 Node 项目；若没有自动设置：
   - 在左侧找到或新建 **package.json**，确保有 `"start": "node server.js"`。
   - 在 **Tools** 里可查看 **Logs** 确认是否启动成功。
5. 点左上角 **Share** → **Live site**，会得到一个 `xxx.glitch.me` 的链接，就是你的公网地址。

**注意**：免费版一段时间没人访问会休眠，第一次打开可能要等几秒唤醒；数据在休眠/重启后可能清空。

---

## 方式二：Replit（免卡，在线编辑运行）

1. **打开** [replit.com](https://replit.com) ，用 **GitHub** 或邮箱注册（无需信用卡）。
2. 点 **Create Repl** → 选 **Import from GitHub**，填 `https://github.com/XFW-hub/DailyMeals`。
3. 导入后 Replit 会识别为 Node 项目。在 Shell 里执行：
   ```bash
   npm install
   npm start
   ```
4. 右上角会出现 **Webview** 或 **Open in new tab**，点开就是你的站点。  
   也可在 **Deploy** 里生成一个长期链接（免费版可能有限制）。

---

## 小结

| 平台      | 是否要绑卡 | 特点                     |
|-----------|------------|--------------------------|
| **Glitch**  | 否         | 导入 GitHub 即可，免卡   |
| **Replit**  | 否         | 在线编辑 + 运行，免卡   |
| ~~Koyeb~~   | 需绑卡     | 已从免卡列表移除         |

优先试 **Glitch**；若访问慢或有问题，再用 **Replit**。
