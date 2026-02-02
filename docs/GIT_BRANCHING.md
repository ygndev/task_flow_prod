# Git Branching Strategy

This document outlines the Git branching strategy and conventions for the TaskFlow monorepo.

## 🌳 Branch Structure

### Main Branches

#### `main`
- **Purpose**: Production-ready code
- **Protection**: Always stable and deployable
- **Merge**: Only from `develop` via pull requests
- **Deployment**: Automatically deployed to production

#### `develop`
- **Purpose**: Integration branch for features
- **Protection**: Should always be in a working state
- **Merge**: Feature branches merge here
- **Deployment**: Deployed to staging environment

### Supporting Branches

#### Feature Branches
- **Naming**: `feature/<feature-name>` or `feature/<ticket-number>-<feature-name>`
- **Purpose**: Develop new features
- **Branch from**: `develop`
- **Merge to**: `develop`
- **Examples**:
  - `feature/user-authentication`
  - `feature/123-task-crud`
  - `feature/api-rate-limiting`

#### Bugfix Branches
- **Naming**: `bugfix/<bug-description>` or `bugfix/<ticket-number>-<bug-description>`
- **Purpose**: Fix bugs in development
- **Branch from**: `develop`
- **Merge to**: `develop`
- **Examples**:
  - `bugfix/login-validation-error`
  - `bugfix/456-api-timeout`

#### Hotfix Branches
- **Naming**: `hotfix/<issue-description>` or `hotfix/<ticket-number>-<issue-description>`
- **Purpose**: Fix critical production issues
- **Branch from**: `main`
- **Merge to**: `main` and `develop`
- **Examples**:
  - `hotfix/security-patch`
  - `hotfix/789-database-connection`

#### Release Branches
- **Naming**: `release/<version>` or `release/v<version>`
- **Purpose**: Prepare for a new production release
- **Branch from**: `develop`
- **Merge to**: `main` and `develop`
- **Examples**:
  - `release/1.0.0`
  - `release/v2.1.0`

## 🔄 Workflow

### Starting a New Feature

1. Ensure you're on `develop` and up to date:
```bash
git checkout develop
git pull origin develop
```

2. Create a new feature branch:
```bash
git checkout -b feature/my-new-feature
```

3. Make your changes and commit:
```bash
git add .
git commit -m "feat: add user authentication"
```

4. Push the branch:
```bash
git push origin feature/my-new-feature
```

5. Create a Pull Request to `develop`

### Completing a Feature

1. Ensure all tests pass
2. Ensure code is linted and formatted
3. Create Pull Request to `develop`
4. After review and approval, merge the PR
5. Delete the feature branch (usually done automatically)

### Hotfix Workflow

1. Create hotfix branch from `main`:
```bash
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug
```

2. Fix the issue and commit:
```bash
git add .
git commit -m "fix: resolve critical security issue"
```

3. Push and create PR to `main`
4. After merging to `main`, merge back to `develop`:
```bash
git checkout develop
git merge main
git push origin develop
```

### Release Workflow

1. Create release branch from `develop`:
```bash
git checkout develop
git pull origin develop
git checkout -b release/1.0.0
```

2. Update version numbers, changelog, etc.
3. Test thoroughly
4. Create PR to `main`
5. After merging to `main`, tag the release:
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

6. Merge back to `develop`

## 📝 Commit Message Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples
```
feat(api): add user authentication endpoint
fix(web): resolve login form validation error
docs: update README with setup instructions
refactor(api): improve repository pattern implementation
```

## 🚫 Branch Naming Rules

### Do's ✅
- Use lowercase letters
- Use hyphens to separate words
- Be descriptive
- Include ticket numbers if applicable
- Keep names concise but clear

### Don'ts ❌
- Don't use spaces (use hyphens)
- Don't use special characters except hyphens
- Don't use uppercase letters
- Don't create branches directly from `main` (except hotfixes)
- Don't merge directly to `main` (except hotfixes)

## 🔒 Branch Protection Rules

### `main` Branch
- Require pull request reviews
- Require status checks to pass
- Require branches to be up to date
- No direct pushes allowed

### `develop` Branch
- Require pull request reviews
- Require status checks to pass
- Allow force pushes (with caution)

## 📋 Pull Request Guidelines

1. **Title**: Use conventional commit format
2. **Description**: 
   - What changes were made
   - Why the changes were needed
   - How to test the changes
   - Screenshots (if applicable)
3. **Labels**: Add appropriate labels (feature, bugfix, etc.)
4. **Reviewers**: Request at least one reviewer
5. **Checks**: Ensure all CI/CD checks pass

## 🔍 Branch Cleanup

- Delete merged feature/bugfix branches after merge
- Keep release branches until the release is stable
- Archive old hotfix branches after verification

## 📚 Additional Resources

- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
