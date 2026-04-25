项目构建说明

推荐目录结构

```text
kbd-web/
├─ assets/
│  ├─ data/          # 生成产物：搜索索引
│  ├─ images/        # 站点图片资源
│  ├─ scripts/       # 前端 JS 逻辑
│  └─ styles/        # 全站样式
├─ keyboard/
│  ├─ zh/            # 键盘中文页面
│  └─ en/            # 键盘英文页面
├─ pages/
│  ├─ zh/            # 文档/教程/功能/固件/搜索（中文）
│  └─ en/            # 文档/教程/功能/固件/搜索（英文）
├─ scripts/          # 构建脚本
├─ *.html            # 首页入口（中/英文）
├─ Makefile
├─ package.json
└─ README.md
```

快速使用：

```bash
# 生成搜索索引（需要 Python3）
python3 scripts/build_index.py
# 或使用 Makefile
make build-index
make build

# 或使用 npm 脚本（若已安装 npm）
npm run build-index
npm run build
```

将上述命令加入发布/构建流程即可在每次构建时自动更新搜索索引。
