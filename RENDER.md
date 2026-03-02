# 用 Render 部署 - 一步步来

按下面做，最后会得到一个**所有人都能打开的链接**（如 `https://xxx.onrender.com`）。

---

## 第一步：把代码推到 GitHub

1. 打开 [github.com](https://github.com) 登录，点右上角 **+** → **New repository**。
2. 仓库名随便起（如 `daily-meals`），选 **Public**，点 **Create repository**。
3. 在电脑上打开**本项目的文件夹**，在终端里执行（把 `你的用户名` 和 `daily-meals` 换成你的仓库地址）：

```bash
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/你的用户名/daily-meals.git
git push -u origin main
```

提示输入 GitHub 账号密码时，用 **Personal access token** 当密码（在 GitHub → Settings → Developer settings → Personal access tokens 里生成）。

---

## 第二步：在 Render 里部署

1. 打开 [render.com](https://render.com)，用 **Sign in with GitHub** 登录。
2. 点 **Dashboard** 里的 **New +** → **Web Service**。
3. 在 **Connect a repository** 里选你刚推送的仓库（如 `daily-meals`），点 **Connect**。
4. 按下面填，其他不用改：

   | 项 | 填什么 |
   |----|--------|
   | **Name** | `daily-meals`（或任意英文名） |
   | **Region** | 选离你近的（如 Singapore） |
   | **Runtime** | **Node** |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Instance Type** | **Free** |

5. 点最下面 **Create Web Service**。
6. 等 2～5 分钟，看到 **Live** 绿字就部署好了。

---

## 第三步：拿到链接

在页面顶部会有一个地址，类似：

**https://daily-meals-xxxx.onrender.com**

复制这个链接，用浏览器打开就能用；发给别人，他们也能打开。

---

## 小提示

- **免费版会休眠**：一段时间没人访问后，第一次打开可能要等 30 秒左右才会加载。
- **数据**：免费实例重启或重新部署后，用户和记录会清空；要长期保留数据可考虑升级付费或换带磁盘的服务。

有这一步报错的话，把报错信息贴出来即可排查。
