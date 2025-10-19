# TagAnything

A modern file tagging application inspired by TagSpaces, built with Electron and React.

## Features

- 🏷️ **File Tagging**: Add, remove, and search tags for your files
- 📁 **Location Management**: Manage multiple file locations
- 🎨 **Modern UI**: Beautiful Material-UI interface with light/dark theme support
- 🔍 **File Explorer**: Browse files with grid and list views
- 🎯 **Tag Management**: Organize and manage your tags with colors
- ⚡ **Fast Performance**: Built with TypeScript and modern web technologies

## Technology Stack

- **Frontend**: React 18, TypeScript, Material-UI
- **Backend**: Electron, Node.js
- **Build Tools**: Webpack, TypeScript Compiler
- **Styling**: Material-UI Theme System

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/TagAnything.git
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

## Development

### Project Structure

```
TagAnything/
├── src/
│   ├── main/           # Electron main process
│   └── renderer/       # React renderer process
├── dist/               # Build output
├── package.json
└── README.md
```

### Available Scripts

- `npm run build:main` - Build main process
- `npm run build:renderer` - Build renderer process  
- `npm run build` - Build both processes
- `npm start` - Start the Electron application
- `npm run dev` - Development mode with hot reload

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by [TagSpaces](https://github.com/tagspaces/tagspaces)
- Built with [Electron](https://electronjs.org/)
- UI components from [Material-UI](https://mui.com/)