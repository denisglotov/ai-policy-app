# Receipt Policy Scanner (Mobile App)

A minimalist React Native (Expo) mobile application designed to scan receipt QR codes, extract
receipt contents from fetched URLs, run AI categorization via the `ai-policy` engine, and enforce
spending policy restrictions.

<p align="center">
  <img src="./assets/icon.png" alt="Active Launcher Icon" width="160" height="160" />
</p>

## Features

- **QR Code Scanning**: Point camera at physical or digital receipt QR codes to fetch URLs.
- **Manual URL Input & Test Fixtures**: Simulator-friendly fallback to input URLs or one-tap test.
- **Smart HTML & Content Cleaning**: Automatically strips scripts, stylesheets, and markup tags.
- **AI-Powered Item Categorization**: Reuses isomorphic LLM parser from `ai-policy` submodule.
- **Policy Enforcement**:
  - Automatically flags **`unhealthy_drinks`** (energy drinks, sodas, sweet teas).
  - Automatically flags **`alcohol`** (beer, wine, spirits, cocktails).
  - Automatically flags **`tobacco`** (cigarettes, vapes, heated sticks).
- **Approval & Denial Screens**: Detailed modal displaying status, totals, and offending items.
- **Persistent Scan History**: Local AsyncStorage log of previous scans with status badges.
- **In-App Configuration**: Customize API key, OpenRouter / OpenAI endpoint, and model at runtime.
- **CI / CD Ready**: Prettier formatting, ESLint, TypeScript checking, and GitHub Actions.

## Getting Started

### 1. Clone with Submodules

```bash
git clone --recursive https://github.com/denisglotov/mobile-app.git
cd mobile-app
```

If already cloned without submodules:

```bash
git submodule update --init --recursive
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment (Optional)

Copy `.env.example` to `.env` to configure default credentials:

```bash
cp .env.example .env
```

You can also input your API key directly inside the in-app **Settings** tab at runtime.

### 4. Start the Application

```bash
# Start Expo development server
npm start

# Run on Android emulator or connected device
npm run android

# Run on iOS simulator (macOS required)
npm run ios

# Run web preview
npm run web
```

## Code Quality & Verification

```bash
# Check code style with Prettier
npm run format:check

# Auto-format all source code
npm run format

# Run ESLint static analysis
npm run lint

# Check TypeScript types
npm run typecheck

# Execute automated unit test suite
npm run test
```

## GitHub Actions Workflows

- **CI (`.github/workflows/ci.yml`)**:
  Triggers on pull requests and pushes to `main` / `master`. Runs recursive submodule checkout,
  dependency installation, Prettier check, ESLint, TypeScript check, and unit tests.

- **Release (`.github/workflows/release.yml`)**:
  Triggers on pushing a git version tag (`git tag v1.0.0 && git push origin v1.0.0`). Runs code
  validation, builds a standalone Android `.apk` via Expo prebuild and Gradle, and publishes it
  as a downloadable asset on GitHub Releases.
