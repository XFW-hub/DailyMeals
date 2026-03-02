# 部署到公网 - 让所有人能访问

把「每日三餐记录」部署到网上后，你会得到一个**公网链接**，任何人用浏览器打开就能用。

推荐用下面两种方式之一（都支持免费额度、从 GitHub 一键部署）。

---

## 方式一：Render（推荐，免费）

1. **把代码放到 GitHub**
   - 在 [GitHub](https://github.com) 新建一个仓库（例如 `daily-meals`）。
   - 在本地项目目录执行：
     ```bash
     git init
     git add .
     git commit -m "init"
     git branch -M main
     git remote add origin https://github.com/你的用户名/daily-meals.git
     git push -u origin main
     ```
   - 注意：`data/` 和 `public/uploads/` 已在 `.gitignore` 里，不会上传（部署后会在服务器上重新生成）。

2. **在 Render 部署**
   - 打开 [https://render.com](https://render.com)，用 GitHub 登录。
   - 点击 **New → Web Service**。
   - 选择你刚推送的仓库（如 `daily-meals`）。
   - 按下面填写：
     - **Name**：随便起名，如 `daily-meals`
     - **Runtime**：`Node`
     - **Build Command**：`npm install`
     - **Start Command**：`npm start`
     - **Instance Type**：选 **Free**
   - 点击 **Create Web Service**，等几分钟构建完成。

3. **获取链接**
   - 部署成功后，Render 会给你一个地址，类似：  
     `https://daily-meals-xxxx.onrender.com`  
   - 把这个链接发给别人，大家用浏览器打开即可使用。

**注意（免费版）：** Render 免费实例在一段时间没人访问后会休眠，第一次打开可能要等几十秒唤醒；数据存在服务器内存盘，**重新部署或实例重启后，用户和记录会清空**。若需要长期保存数据，可以升级付费实例或改用下面「方式二」的持久化方案。

---

## 方式二：Railway（免费额度，可挂载磁盘）

1. **代码推送到 GitHub**（同方式一第 1 步）。

2. **在 Railway 部署**
   - 打开 [https://railway.app](https://railway.app)，用 GitHub 登录。
   - 点击 **New Project** → **Deploy from GitHub repo**，选你的仓库。
   - 选中项目后，Railway 会自动检测为 Node 并执行 `npm install` 和 `npm start`。
   - 若没有自动设置，在 **Settings** 里确认：
     - **Build Command**：`npm install`
     - **Start Command**：`npm start`

3. **生成公网链接**
   - 在项目里点你的服务 → **Settings** → **Networking** → **Generate Domain**。
   - 会得到一个类似 `xxx.up.railway.app` 的域名，所有人可访问。

4. **（可选）持久化数据**
   - Railway 免费额度有限，若需要数据不因重启而丢失，可在 **Volumes** 里为项目挂载一块磁盘，并把 `data`、`public/uploads` 放到该盘（需改一点代码里的路径）。  
   - 或先用当前方式部署，数据在运行期间会一直保留，仅重启/重新部署时可能清空。

---

## 部署前自检

- 已用 `process.env.PORT`，部署平台会自动注入端口，无需改代码。
- 若你改了端口或域名，只要用平台提供的「公网域名」访问即可，无需在代码里写死。

---

## 部署后使用方式

- 把得到的链接（如 `https://xxx.onrender.com` 或 `https://xxx.up.railway.app`）发给朋友或发到群里。
- 对方用手机或电脑浏览器打开，添加用户、记三餐即可，无需安装任何东西。

如需绑定自己的域名（如 `meals.你的域名.com`），可在 Render / Railway 的域名设置里添加并按提示解析。
