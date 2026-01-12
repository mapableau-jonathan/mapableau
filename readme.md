# OptimiseMe

A Next.js application built with TypeScript.

## Tech Stack

- **Framework**: Next.js 15.5.4 (App Router)
- **Language**: TypeScript
- **Package Manager**: pnpm
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **Git Hooks**: Husky with lint-staged

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm (v10.12.1 or higher)

### Installation

```bash
pnpm install
```

### Development

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

### Build

Build the application for production:

```bash
pnpm build
```

Start the production server:

```bash
pnpm start
```

## Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production (includes type-check and lint)
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint errors automatically
- `pnpm type-check` - Run TypeScript type checking
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting

## Project Structure

```
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
