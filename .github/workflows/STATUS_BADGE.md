# Status Badge for Test Workflow

## Add to README.md

Copy and paste this badge to your project's README.md file:

### Option 1: Markdown (Recommended)
\`\`\`markdown
[![Test Suite](https://github.com/gavincwyant/trainer_tool/actions/workflows/test.yml/badge.svg)](https://github.com/gavincwyant/trainer_tool/actions/workflows/test.yml)
\`\`\`

### Option 2: Badge for specific branch
\`\`\`markdown
[![Test Suite](https://github.com/gavincwyant/trainer_tool/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/gavincwyant/trainer_tool/actions/workflows/test.yml)
\`\`\`

### Option 3: HTML
\`\`\`html
<a href="https://github.com/gavincwyant/trainer_tool/actions/workflows/test.yml">
  <img src="https://github.com/gavincwyant/trainer_tool/actions/workflows/test.yml/badge.svg" alt="Test Suite">
</a>
\`\`\`

## Example README Section

\`\`\`markdown
# TrainTrack

[![Test Suite](https://github.com/gavincwyant/trainer_tool/actions/workflows/test.yml/badge.svg)](https://github.com/gavincwyant/trainer_tool/actions/workflows/test.yml)
[![CI](https://github.com/gavincwyant/trainer_tool/actions/workflows/ci.yml/badge.svg)](https://github.com/gavincwyant/trainer_tool/actions/workflows/ci.yml)

Your project description here...
\`\`\`

## Badge Appearance

- ✅ **Passing**: Green badge with "passing" text
- ❌ **Failing**: Red badge with "failing" text
- 🟡 **Running**: Yellow badge with "running" text
- ⚫ **No status**: Gray badge with "no status" text

## Alternative Badge Services

### Codecov (if you enable it)
\`\`\`markdown
[![codecov](https://codecov.io/gh/gavincwyant/trainer_tool/branch/main/graph/badge.svg)](https://codecov.io/gh/gavincwyant/trainer_tool)
\`\`\`

### shields.io (Custom styling)
\`\`\`markdown
![Test Suite](https://img.shields.io/github/actions/workflow/status/gavincwyant/trainer_tool/test.yml?label=tests&style=flat-square)
\`\`\`
