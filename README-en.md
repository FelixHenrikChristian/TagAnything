<p align="center">
  <img src="build/icon.ico" alt="TagAnything Logo" width="128" height="128">
</p>

<h1 align="center">TagAnything</h1>

<p align="center">
  <strong>🏷️ A Modern, Powerful Open-Source File Tagging Tool</strong>
</p>

<div align="center">
  <img src="https://img.shields.io/github/v/release/FelixChristian011226/TagAnything">
  <img src="https://img.shields.io/github/license/FelixChristian011226/TagAnything">
  <img src="https://img.shields.io/github/downloads/FelixChristian011226/TagAnything/total">
  <img src="https://img.shields.io/github/stars/FelixChristian011226/TagAnything">
</div>

<p align="center">
  <strong>English</strong> | <a href="README.md">中文</a>
</p>

---

## ✨ Features

### 🏷️ Smart Tagging System
- **Filename-Embedded Tags** - Tags are stored directly in filenames (e.g., `[tag1 tag2] filename.ext`), no database required, syncs across devices
- **Tag Group Management** - Create tag groups to organize tags by category
- **Colored Tags** - Customize tag background and text colors for easy identification
- **Drag & Drop Tagging** - Drag tags from the sidebar onto file cards to add them
- **Quick Tag Actions** - Click tags on file cards to quickly filter or remove them
- **Tag Library Import/Export** - Import and export your tag library for backup and migration

### 📁 Efficient File Management
- **Multi-Location Management** - Manage multiple folder locations simultaneously with quick switching
- **Grid/List Views** - Freely switch between view modes
- **Adjustable Grid Size** - Resize cards using the slider or zoom buttons
- **Thumbnail Preview** - Automatic thumbnail generation for images and videos
- **Drag & Drop File Operations** - Move or copy files by dragging to target folders
- **Rich Context Menu** - Open in Explorer, rename, move, copy, delete, view properties
- **Create New Folder** - Right-click on blank area to create a new folder

### 🔍 Powerful Search
- **Dual Search Modes** - Switch between current directory and global recursive search
- **Multi-Tag Filtering** - Select multiple tags for cross-filtering
- **Simplified/Traditional Chinese Search** - Automatically match both Chinese variants (enable in settings)
- **Multiple Sorting Options** - Sort by name, size, type, or modified date, ascending or descending

### 🧭 Convenient Navigation
- **Breadcrumb Navigation** - Click any path segment to jump directly
- **Back/Forward/Up** - Full browsing history support, including filter states
- **Navigate to File Location** - Right-click global search results to navigate to the file's directory

### 🎨 Modern UI
- **Classic Theme** - Clean and simple default theme
- **Neon Glass Theme** - Unique frosted glass effect with customization:
  - Background image
  - Theme hue (0°-360°)
  - Opacity and blur for top bar, sidebar, and file explorer

### ⚙️ More Settings
- **Window Size Memory** - Auto-save window size, one-click reset
- **Simplified/Traditional Chinese Search** - Match both Chinese variants when searching
- **Auto-Navigate After Operations** - Automatically navigate to target directory after move/copy
- **Folder Icon Names** - Display folder names inside folder icons
- **Cache Management** - Clear thumbnail cache to free up space
- **Auto Update** - Built-in update checker, one-click upgrade

### ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `↑` `↓` `←` `→` | Navigate between file cards |
| `Enter` | Open file / Enter folder |
| `Backspace` | Go to parent directory |
| `Ctrl + A` | Select all files |
| `Ctrl + C` | Copy selected files |
| `Ctrl + X` | Cut selected files |
| `Ctrl + V` | Paste files |
| `Delete` | Delete selected files |
| `F5` | Refresh file list |
| `Esc` | Deselect |
| `Ctrl + Scroll` | Adjust grid size |

---

## 📦 Installation

### Option 1: Download Installer (Recommended)

1. Visit the [Releases page](https://github.com/FelixChristian011226/TagAnything/releases)
2. Download the latest `TagAnything-Setup-x.x.x.exe`
3. Run the installer and follow the setup wizard

### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/FelixChristian011226/TagAnything.git
cd TagAnything

# Install dependencies
npm install

# Build and start the app
npm run build
npm start

# Or package for distribution
npm run package
```

### System Requirements
- **OS**: Windows 10/11 (64-bit)
- **RAM**: 4GB or above
- **Storage**: 900MB available space

---

## 🚀 Quick Start

### 1️⃣ Add a Location
In the **Location Manager** on the left sidebar, click the **"+"** button to add a folder to manage, or expand the menu in the top-right corner.

### 2️⃣ Browse Files
Click any location in the list to browse files in the file explorer on the right.

### 3️⃣ Manage Tag Library
Click the bottom of the sidebar to switch to the **Tag Manager** page:
- Import/export your tag library for backup
- Click **"Create Tag Group"** to add categories and set default colors
- Use the tag group menu to add tags and customize their background and text colors
- Click a tag to edit or delete it

### 4️⃣ Add Tags to Files
- **Drag & Drop**: Drag a tag from the sidebar onto a file card
- Tags are automatically added as a prefix to the filename

### 5️⃣ Filter by Tags
- **Single Tag Filter**: Click a tag on a file card and select **"Show files with this tag"**
- **Multi-Tag Filter**: Click the filter button in the toolbar to select multiple tags for cross-filtering

### 6️⃣ Search & Sort
- Type keywords in the search box for real-time search
- Click the icon next to the search box to switch between **Current Directory** / **Global Recursive** search
- Click the sort button to choose sorting method and order
- Drag the zoom slider or click the magnifier to adjust card size
- Switch between grid and list views

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork this repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -m 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  <strong>TagAnything</strong> - Organize your digital life with the power of tags 🏷️✨
</p>

<p align="center">
  ⭐ If you find it useful, please give it a Star! ⭐
</p>
