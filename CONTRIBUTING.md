# Contributing to TENANCY

Thank you for your interest in contributing to TENANCY! We welcome contributions from the community.

## 🤝 How to Contribute

There are many ways to contribute to TENANCY:

- 🐛 **Bug Reports**: Help us find and fix issues
- 💡 **Feature Requests**: Suggest new functionality
- 📖 **Documentation**: Improve docs and tutorials
- 💻 **Code Contributions**: Add features or fix bugs
- 🎨 **UI/UX**: Design improvements
- ⚡ **Performance**: Optimize code

## 🛠 Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- MetaMask wallet

### Quick Start

```bash
# Clone the repository
git clone https://github.com/Moses-main/Tenancy.git
cd Tenancy

# Install dependencies
npm install

# Start development
npm run dev
```

## 🔀 Branching Strategy

We use a simple branching strategy:

- `main` - Production-ready code
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

## 📝 Making Changes

### 1. Create a Branch

```bash
# Create and switch to a new branch
git checkout -b feature/amazing-feature
# or
git checkout -b bugfix/annoying-issue
```

### 2. Make Your Changes

- Follow the code style guidelines
- Add tests for new functionality
- Update documentation as needed

### 3. Commit Your Changes

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add new feature"
git commit -m "fix: resolve issue with yield"
git commit -m "docs: update README"
```

### Commit Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting) |
| `refactor` | Code refactoring |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |

### 4. Push and Create PR

```bash
# Push your branch
git push -u origin feature/amazing-feature

# Create a Pull Request on GitHub
```

## 📋 Pull Request Guidelines

### PR Requirements

- [ ] Tests pass (`forge test` for contracts, build for frontend)
- [ ] Code follows style guidelines
- [ ] Documentation updated if needed
- [ ] PR description explains the changes

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactoring

## Testing
Describe testing performed

## Screenshots (if UI changes)
Add screenshots here
```

## 📏 Code Style

### Solidity

- Use Solhint for linting
- Follow OpenZeppelin conventions
- Add NatSpec comments for public functions

### TypeScript/React

- Use ESLint + Prettier
- Follow existing component patterns
- Use TypeScript for type safety

### General

- Use meaningful variable names
- Keep functions small and focused
- Comment complex logic

## 🧪 Testing

### Smart Contracts

```bash
cd contracts
forge test
forge coverage
```

### Frontend

```bash
npm run build
npm run lint
```

## 📖 Documentation

- Update README.md for user-facing changes
- Add code comments for complex logic
- Update API documentation if endpoints change

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- GitHub contributors page
- Release notes

## ❓ Questions?

- Open an issue for bugs or feature requests
- Use discussions for questions
- Check existing documentation first

---

*Thank you for contributing to TENANCY!*
