# AccessiBooks

A Next.js application built with TypeScript. Your Online Accessible Library.

## Tech Stack

- **Framework**: Next.js 15.5.4 (App Router)
- **Language**: TypeScript
- **Package Manager**: npm
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **Git Hooks**: Husky with lint-staged

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (included with Node.js)

### Installation

```bash
npm install
```

If `npm` is not recognized (Node not in PATH), run from the project root:

```powershell
.\scripts\install.ps1
.\scripts\dev.ps1
```

Or use the generic wrapper: `.\scripts\npm.ps1 install`, `.\scripts\npm.ps1 run dev`, etc.

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3002](http://localhost:3002) in your browser to see the result.

### Build

Build the application for production:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Scripts

- `npm run dev` - Start development server with Turbopack (port 3002)
- `npm run build` - Build for production (includes type-check and lint)
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run type-check` - Run TypeScript type checking
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Project Structure

```text
├── app/              # Next.js App Router pages and layouts
├── components/       # Reusable React components
├── lib/              # Utility functions and helpers
├── public/           # Static assets
└── ...
```

## Code Quality

This project uses:

- **ESLint** for code linting with strict TypeScript rules
- **Prettier** for code formatting
- **Husky** for git hooks (pre-commit and pre-push)
- **lint-staged** for running linters on staged files

Pre-commit hooks will automatically format and lint your code before commits.

## License

ISC
