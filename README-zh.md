# TagAnything

一个现代化、功能强大的文件标签管理应用程序，灵感来源于TagSpaces，使用Electron和React构建。TagAnything帮助您通过标签组织文件，让您轻松查找和管理多个位置的文档、图片和其他文件。

## ✨ 功能特性

### 🏷️ **智能文件标签**
- 直接在文件名中添加、删除和管理标签
- 支持嵌入式标签和库式标签管理
- 自动解析现有文件名中的标签
- 彩色标签系统，提供更好的视觉组织

### 📁 **多位置文件管理**
- 同时管理多个文件位置
- 通过面包屑导航快速切换位置
- 支持嵌套文件夹结构
- 实时文件系统监控

### 🎨 **现代化用户界面**
- 美观的Material-UI设计，支持明暗主题
- 响应式网格和列表视图模式
- 可自定义缩放级别（Ctrl + 鼠标滚轮或缩放滑块）
- 直观的拖放文件操作
- 键盘导航支持，高效浏览文件

### 🔍 **高级文件浏览器**
- 高性能文件浏览，支持缩略图
- 图像和视频文件缩略图生成
- 多种排序选项（名称、日期、类型、大小）
- 按标签和文件类型高级筛选
- 跨所有位置的搜索功能
- 软件内目录选择器，便于文件操作

### 🎯 **标签管理系统**
- 集中式标签库，支持颜色编码
- 自定义标签颜色和字体颜色设置
- 标签分组，更好地组织管理
- 批量标签操作
- 标签使用统计和管理

### ⚡ **性能与可靠性**
- 快速文件操作，带进度跟踪
- 高效缓存系统，支持完整缓存清理
- 自动保存功能
- 强大的错误处理和恢复机制

### ⌨️ **键盘快捷键**
| 快捷键 | 功能 |
|--------|------|
| ↑ / ↓ / ← / → | 在文件卡片间导航 |
| Enter | 打开选中文件或进入文件夹 |
| Backspace | 返回上级目录 |
| ESC | 取消选中当前文件 |
| F5 | 刷新文件列表 |
| Ctrl + 滚轮 | 放大/缩小 |

### 🛠️ **文件操作**
- 复制、移动和重命名文件
- 批量文件操作
- 文件操作历史记录
- 撤销/重做支持

## 🚀 快速开始

### 系统要求
- Windows 10/11 (64位)
- 最低4GB内存
- 100MB可用磁盘空间

### 安装方法

#### 方法一：下载发布版本（推荐）
1. 访问[发布页面](https://github.com/FelixChristian011226/TagAnything/releases)
2. 下载最新的`TagAnything-Setup-x.x.x.exe`
3. 运行安装程序并按照设置向导操作
4. 从开始菜单或桌面启动TagAnything

#### 方法二：从源码构建
1. 克隆仓库：
```bash
git clone https://github.com/FelixChristian011226/TagAnything.git
cd TagAnything
```

2. 安装依赖：
```bash
npm install
```

3. 构建应用程序：
```bash
npm run build
```

4. 启动应用程序：
```bash
npm start
```

## 📖 使用指南

### 首次设置
1. **添加位置**：点击"+"按钮添加您的第一个文件位置
2. **浏览文件**：使用文件浏览器导航您的文件
3. **添加标签**：右键点击文件添加标签或使用标签面板
4. **组织管理**：使用标签管理器组织和为标签着色

### 文件标签
- **内联标签**：标签直接嵌入文件名中（例如：`document[tag1][tag2].pdf`）
- **库模式**：标签单独存储并链接到文件
- **批量操作**：选择多个文件批量应用标签

### 导航操作
- **面包屑**：点击面包屑栏中的文件夹名称进行导航
- **前进/后退**：使用导航按钮或键盘快捷键
- **快速访问**：固定常用位置以便快速访问

## 🛠️ 开发

### 技术栈
- **前端**：React 18、TypeScript、Material-UI v5
- **后端**：Electron 28、Node.js
- **构建工具**：Webpack 5、TypeScript编译器
- **媒体处理**：FFmpeg用于视频缩略图
- **存储**：electron-store用于设置和缓存

### 项目结构
```
TagAnything/
├── src/
│   ├── main/           # Electron主进程
│   │   ├── main.ts     # 主应用程序逻辑
│   │   ├── preload.ts  # 预加载脚本
│   │   └── util.ts     # 工具函数
│   ├── renderer/       # React渲染进程
│   │   ├── App.tsx     # 主应用程序组件
│   │   ├── components/ # React组件
│   │   ├── utils/      # 工具函数
│   │   └── types.ts    # TypeScript类型定义
│   └── shared/         # 共享工具
├── build/              # 构建资源
├── release/            # 分发包
└── dist/               # 构建输出
```

### 可用脚本
- `npm run dev` - 开发模式，支持热重载
- `npm run build:main` - 构建主进程
- `npm run build:renderer` - 构建渲染进程
- `npm run build` - 构建两个进程
- `npm start` - 启动Electron应用程序
- `npm run package` - 创建分发包
- `npm run lint` - 运行ESLint
- `npm run test` - 运行测试

### 开发环境设置
1. 安装Node.js（v16或更高版本）
2. 克隆仓库并安装依赖
3. 运行`npm run dev`进入开发模式
4. 应用程序将启动并启用热重载

## 🤝 贡献

我们欢迎贡献！请按照以下步骤：

1. Fork仓库
2. 创建您的功能分支（`git checkout -b feature/AmazingFeature`）
3. 提交您的更改（`git commit -m 'Add some AmazingFeature'`）
4. 推送到分支（`git push origin feature/AmazingFeature`）
5. 打开Pull Request

### 贡献指南
- 遵循现有的代码风格和约定
- 为新功能添加测试
- 根据需要更新文档
- 确保所有测试在提交前通过

## 📄 许可证

本项目采用MIT许可证 - 详情请参阅[LICENSE](LICENSE)文件。

## 🙏 致谢

- 灵感来源于[TagSpaces](https://github.com/tagspaces/tagspaces) - 原创文件标签解决方案
- 使用[Electron](https://electronjs.org/)构建 - 跨平台桌面应用框架
- UI组件来自[Material-UI](https://mui.com/) - React组件库
- 媒体处理由[FFmpeg](https://ffmpeg.org/)提供支持

## 📞 支持

如果您遇到任何问题或有疑问：
- 查看[Issues](https://github.com/FelixChristian011226/TagAnything/issues)页面
- 创建包含详细信息的新issue
- 加入我们的社区讨论

---

**TagAnything** - 用标签的力量组织您的文件！🏷️✨