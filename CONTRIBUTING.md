# Contributing to AquaSense

Thank you for your interest in contributing to **AquaSense 2.0**, the smart water quality monitoring platform! We welcome contributions from developers, designers, data scientists, and water quality experts.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Documentation](#documentation)
- [Questions & Support](#questions--support)

---

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful, constructive, and professional in all interactions.

**By contributing, you agree to:**
- Treat all contributors with respect
- Provide constructive feedback
- Focus on the code, not the person
- Report harassment or unethical behavior to the maintainers

---

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.0 or higher
- **npm** or **pnpm** (pnpm is preferred)
- **Git** for version control
- **Anthropic API key** ([get one here](https://console.anthropic.com)) — required for AI features

### Fork & Clone

1. **Fork the repository** on GitHub
2. **Clone your fork locally:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/Aqua-Sense.git
   cd Aqua-Sense
   ```
3. **Add upstream remote** to sync with the main repo:
   ```bash
   git remote add upstream https://github.com/ClashLex/Aqua-Sense.git
   ```

---

## Development Setup

### 1. Install Dependencies

```bash
npm install
# or if using pnpm
pnpm install
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```bash
echo "VITE_ANTHROPIC_API_KEY=your_api_key_here" > .env
```

Replace `your_api_key_here` with your actual Anthropic API key.

### 3. Start Development Server

```bash
npm run dev
# or
pnpm run dev
```

The app will be available at `http://localhost:5173` (or the Vite-assigned port).

### 4. Build for Production

```bash
npm run build
# or
pnpm run build
```

---

## How to Contribute

### Pick an Area to Contribute

AquaSense has several areas where contributions are welcome:

#### **Frontend/UI**
- Improve dashboard layout and responsiveness
- Enhance animations and user interactions (Framer Motion)
- Build new metric cards or visualization components
- Fix accessibility issues
- Optimize rendering performance

#### **AI & Anomaly Detection**
- Improve alert classification accuracy
- Refine anomaly detection thresholds
- Enhance predictive analytics (linear regression models)
- Integrate additional ML models
- Add new water quality metrics

#### **Data & Analytics**
- Improve chart interactivity with Recharts
- Add new time-range filters
- Enhance the anomaly heatmap
- Build new analytics visualizations
- Optimize data sampling and aggregation

#### **Claude AI Assistant**
- Improve system prompts for better responses
- Add domain-specific knowledge to the assistant
- Enhance chat UI/UX
- Add context awareness features
- Support multilingual responses

#### **Documentation & Testing**
- Improve inline code comments
- Add JSDoc documentation
- Write unit tests for utility functions
- Add integration tests for components
- Create setup guides for different platforms

#### **IoT Integration (Future)**
- Plan hardware sensor integration
- Design API endpoints for sensor data ingestion
- Build MQTT connection handler
- Implement edge computing features

---

## Reporting Bugs

Found a bug? Here's how to report it:

### Before Submitting

1. **Search existing issues** to check if the bug is already reported
2. **Test with the latest code** from the `main` branch
3. **Isolate the problem** — determine exact steps to reproduce

### Submit a Bug Report

Create a GitHub issue with the following information:

**Title:** Brief, descriptive title  
**Description:**
- What did you expect to happen?
- What actually happened?
- Step-by-step reproduction steps
- Environment: OS, Node version, browser (if frontend)

**Example:**
```
Title: Water quality score not updating in real-time

Steps to reproduce:
1. Open the dashboard
2. Wait 5 seconds
3. Observe the water quality score

Expected: Score updates every 5 seconds
Actual: Score only updates when page is refreshed

Environment: Windows 11, Node 18.16, Chrome 125
```

---

## Suggesting Features

Have an idea to improve AquaSense?

### Before Submitting

1. **Check existing issues** — your feature may already be planned
2. **Consider the project scope** — does it fit AquaSense's mission?
3. **Gather context** — understand the current codebase

### Submit a Feature Request

Create a GitHub issue titled: `[Feature] Your Feature Idea`

**Include:**
- Clear description of the feature
- Why it's useful for water quality monitoring
- Mockups or wireframes (if applicable)
- Potential implementation approach

**Example:**
```
Title: [Feature] Add SMS alert notifications

Description:
Allow users to receive SMS alerts for critical water anomalies.
This is especially useful when the dashboard is not actively monitored.

Use Case: Facility manager receives SMS alert when TDS exceeds danger threshold

Implementation: 
- Add SMS provider integration (Twilio, AWS SNS)
- Add phone number field to settings
- Create alert routing logic
```

---

## Pull Request Process

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or for bug fixes
git checkout -b fix/bug-description
```

Use meaningful branch names:
- ✅ `feature/ai-assistant-improvements`
- ✅ `fix/anomaly-alert-delay`
- ❌ `feature/fix-stuff`

### 2. Make Your Changes

- Keep commits atomic and logical
- Write clear commit messages (see [Commit Guidelines](#commit-message-guidelines))
- Update documentation and JSDoc comments as needed
- Add tests for new functionality

### 3. Test Your Changes

```bash
# Verify the app builds and runs
npm run dev

# Build for production to catch errors
npm run build

# Test in your target environment (browser, mobile, etc.)
```

### 4. Keep Your Branch Updated

```bash
git fetch upstream
git rebase upstream/main
```

### 5. Push and Create a Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a PR on GitHub with:

**Title:** Clear, descriptive title (will appear in changelog)

**Description:**
```markdown
## Description
Brief explanation of what this PR does.

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Documentation update
- [ ] Performance improvement

## Related Issue
Closes #<issue-number>

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing Performed
- Tested on [browser/environment]
- Verified [specific feature]

## Checklist
- [ ] Code follows project style
- [ ] Tested on main branch
- [ ] Updated documentation
- [ ] No breaking changes (or documented)
```

### 6. Review Process

- Maintainers will review your PR within 3-7 days
- Address feedback and push updates
- Once approved, your PR will be merged 🎉

---

## Coding Standards

### TypeScript/JavaScript

- Use **TypeScript** for type safety
- Follow **ESLint** and **Prettier** rules
- Use meaningful variable names: `const waterQualityScore` not `const wqs`
- Add JSDoc comments for functions:

```typescript
/**
 * Calculate overall water quality score based on metrics
 * @param {Object} metrics - Water quality metrics
 * @param {number} metrics.ph - pH level
 * @param {number} metrics.turbidity - Turbidity in NTU
 * @returns {number} Overall score 0-100
 */
function calculateWaterQualityScore(metrics) {
  // implementation
}
```

### React Components

- Use **functional components** with hooks
- Component files: `PascalCase.jsx`
- Utility files: `camelCase.js`
- Keep components focused and modular
- Props should be documented:

```typescript
interface MetricCardProps {
  /** Metric name (e.g., "pH", "Turbidity") */
  name: string;
  /** Current metric value */
  value: number;
  /** Safe range threshold */
  safeRange: [number, number];
}
```

### CSS/Tailwind

- Use Tailwind CSS classes for styling
- Avoid inline styles; use utility classes
- Responsive design: mobile-first approach
- Use consistent spacing: `p-4`, `m-2`, etc.

### File Organization

```
src/
├── components/     # Reusable React components
├── pages/          # Page-level components
├── hooks/          # Custom React hooks
├── utils/          # Utility functions
├── types/          # TypeScript type definitions
└── styles/         # Global styles
```

---

## Commit Message Guidelines

Write clear, descriptive commit messages:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without feature/bug changes
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Dependencies, build tools, etc.

### Scope

- `dashboard`: Dashboard page
- `analytics`: Analytics page
- `alerts`: Alert system
- `assistant`: AI assistant
- `api`: API integration
- `ui`: UI components
- `utils`: Utility functions

### Examples

```
feat(dashboard): add real-time metric updates

Add automatic metric refresh every 5 seconds using WebSocket
connection to sensor data stream.

Closes #42
```

```
fix(alerts): prevent duplicate anomaly alerts

Implement 3-consecutive-reading threshold to reduce false positives
in anomaly detection.
```

```
docs: update API key setup instructions
```

---

## Documentation

### When to Update Docs

- Adding a new feature → document it
- Changing how something works → update existing docs
- Creating a utility function → add JSDoc
- Fixing a confusing component → improve comments

### What to Document

- **README.md**: Major features, setup, architecture
- **Component JSDoc**: Props, return values, usage examples
- **Utility functions**: Input parameters, return values, side effects
- **Complex logic**: Explain the "why" in comments

### Example JSDoc for Component

```typescript
/**
 * MetricCard Component
 * 
 * Displays a single water quality metric with status indicator
 * and animated transitions.
 * 
 * @component
 * @example
 * <MetricCard
 *   name="pH Level"
 *   value={7.2}
 *   unit="pH"
 *   status="safe"
 * />
 */
function MetricCard({ name, value, unit, status }) {
  // implementation
}
```

---

## Questions & Support

### Getting Help

- **GitHub Discussions**: Ask questions about development
- **GitHub Issues**: Report bugs or suggest features
- **Email**: Contact the maintainers directly

### Useful Resources

- [AquaSense Live Demo](https://aqua-sense-builder--ansilmuhammed91.replit.app/)
- [README Architecture Guide](./README.md#-original-system-architecture-iot-layer)
- [Anthropic API Docs](https://docs.anthropic.com)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Recharts](https://recharts.org)

---

## Contribution Recognition

We recognize and appreciate all contributions! Contributors will be:

- Listed in a **CONTRIBUTORS.md** file (coming soon)
- Mentioned in release notes for significant contributions
- Given credit in relevant documentation

---

## License

By contributing to AquaSense, you agree that your contributions will be licensed under the [MIT License](./LICENSE).

---

## Final Notes

- **Be patient**: Maintainers are volunteers; reviews may take time
- **Be respectful**: Everyone is learning and growing
- **Be collaborative**: Great projects are built by great teams
- **Have fun**: We're solving real water quality problems! 💧

Thank you for making AquaSense better! 🚀

---

**Happy contributing!**

*Questions? Open an issue or reach out to [@ClashLex](https://github.com/ClashLex)*
