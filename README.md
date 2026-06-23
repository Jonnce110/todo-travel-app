# 做了么

一个零依赖的静态网页应用，包含两类清单：

- 日常待办：支持新增、勾选、编辑、删除。
- 出行清单：支持潜水、冲浪、滑雪等类别，支持新增、复制已有清单、修改后保存为新清单。

登录后，数据会自动保存到 Supabase。使用同一个账号在手机和电脑登录，可以看到同一份清单。

## Supabase 初始化

在 Supabase 项目的 `SQL Editor` 里运行 `supabase-schema.sql` 一次，用来创建数据表和账号级数据隔离策略。
这个 SQL 也会让新注册用户自动确认邮箱，因此保留邮箱登录，但不需要点击邮件验证链接。

在 `Authentication` -> `URL Configuration` 里设置：

- Site URL: `https://jonnce110.github.io/todo-travel-app/`
- Redirect URLs: `https://jonnce110.github.io/todo-travel-app/`

## 使用方式

直接用浏览器打开 `index.html` 即可。

也可以在目录中启动本地服务：

```bash
python3 -m http.server 5173
```

然后访问：

```text
http://localhost:5173
```
