# TagAnything

A modern, powerful file tagging and organization application inspired by TagSpaces, built with Electron and React. TagAnything helps you organize your files with tags, making it easy to find and manage your documents, images, and other files across multiple locations.

## ✨ Features

### 🏷️ **Smart File Tagging**
- Add, remove, and manage tags directly in filenames
- Support for both embedded tags and library-based tag management
- Automatic tag parsing from existing filenames
- Color-coded tag system for better visual organization

### 📁 **Multi-Location File Management**
- Manage multiple file locations simultaneously
- Quick location switching with breadcrumb navigation
- Support for nested folder structures
- Real-time file system monitoring

### 🎨 **Modern User Interface**
- Beautiful Material-UI design with light/dark theme support
- Responsive grid and list view modes
- Customizable zoom levels for optimal viewing
- Intuitive drag-and-drop file operations

### 🔍 **Advanced File Explorer**
- High-performance file browsing with thumbnail support
- Video thumbnail generation for media files
- Multiple sorting options (name, date, type, size)
- Advanced filtering by tags and file types
- Search functionality across all locations

### 🎯 **Tag Management System**
- Centralized tag library with color coding
- Tag groups for better organization
- Bulk tag operations
- Tag usage statistics and management

### ⚡ **Performance & Reliability**
- Fast file operations with progress tracking
- Efficient caching system
- Auto-save functionality
- Robust error handling and recovery

### 🛠️ **File Operations**
- Copy, move, and rename files
- Batch file operations
- File operation history
- Undo/redo support

## 🚀 Getting Started

### System Requirements
- Windows 10/11 (64-bit)
- 4GB RAM minimum
- 100MB free disk space

### Installation

#### Option 1: Download Release (Recommended)
1. Go to the [Releases](https://github.com/FelixChristian011226/TagAnything/releases) page
2. Download the latest `TagAnything-Setup-x.x.x.exe`
3. Run the installer and follow the setup wizard
4. Launch TagAnything from the Start Menu or Desktop

#### Option 2: Build from Source
1. Clone the repository:
```bash
git clone https://github.com/FelixChristian011226/TagAnything.git
cd TagAnything
```

2. Install dependencies:
```bash
npm install
```

3. Build the application:
```bash
npm run build
```

4. Start the application:
```bash
npm start
```

## 📖 Usage Guide

### First Time Setup
1. **Add a Location**: Click the "+" button to add your first file location
2. **Browse Files**: Navigate through your files using the file explorer
3. **Add Tags**: Right-click on files to add tags or use the tag panel
4. **Organize**: Use the tag manager to organize and color-code your tags

### Tagging Files
- **Inline Tags**: Tags are embedded directly in filenames (e.g., `document[tag1][tag2].pdf`)
- **Library Mode**: Tags are stored separately and linked to files
- **Bulk Operations**: Select multiple files to apply tags in batch

### Navigation
- **Breadcrumbs**: Click on folder names in the breadcrumb bar to navigate
- **Back/Forward**: Use navigation buttons or keyboard shortcuts
- **Quick Access**: Pin frequently used locations for quick access

## 🛠️ Development

### Technology Stack
- **Frontend**: React 18, TypeScript, Material-UI v5
- **Backend**: Electron 28, Node.js
- **Build Tools**: Webpack 5, TypeScript Compiler
- **Media Processing**: FFmpeg for video thumbnails
- **Storage**: electron-store for settings and cache

### Project Structure
```
TagAnything/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.ts     # Main application logic
│   │   ├── preload.ts  # Preload scripts
│   │   └── util.ts     # Utility functions
│   ├── renderer/       # React renderer process
│   │   ├── App.tsx     # Main application component
│   │   ├── components/ # React components
│   │   ├── utils/      # Utility functions
│   │   └── types.ts    # TypeScript definitions
│   └── shared/         # Shared utilities
├── build/              # Build assets
├── release/            # Distribution packages
└── dist/               # Build output
```

### Available Scripts
- `npm run dev` - Development mode with hot reload
- `npm run build:main` - Build main process
- `npm run build:renderer` - Build renderer process  
- `npm run build` - Build both processes
- `npm start` - Start the Electron application
- `npm run package` - Create distribution packages
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

### Development Setup
1. Install Node.js (v16 or higher)
2. Clone the repository and install dependencies
3. Run `npm run dev` for development mode
4. The application will start with hot reload enabled

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Contribution Guidelines
- Follow the existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [TagSpaces](https://github.com/tagspaces/tagspaces) - The original file tagging solution
- Built with [Electron](https://electronjs.org/) - Cross-platform desktop app framework
- UI components from [Material-UI](https://mui.com/) - React component library
- Media processing powered by [FFmpeg](https://ffmpeg.org/)

## 📞 Support

If you encounter any issues or have questions:
- Check the [Issues](https://github.com/FelixChristian011226/TagAnything/issues) page
- Create a new issue with detailed information
- Join our community discussions

---

**TagAnything** - Organize your files with the power of tags! 🏷️✨