# Python Package Setup Reference

A guide for scaffolding distributable, modern Python packages adhering to PEP 621, PEP 517/518 standards, and the recommended `src/` layout.

---

## 1. When to Use

Use this setup when creating:
- Distributable libraries or packages to be published to PyPI or shared internally
- Modular applications with unit tests, type hinting, and build systems
- Structured Python codebases requiring packaging metadata

---

## 2. Recommended Project Layout (`src/` layout)

```
my-package/
├── pyproject.toml
├── README.md
├── LICENSE
├── .gitignore
├── src/
│   └── my_package/
│       ├── __init__.py
│       └── core.py
├── tests/
│   ├── __init__.py
│   └── test_core.py
└── .vscode/
    ├── settings.json
    ├── launch.json
    └── extensions.json
```

---

## 3. Scaffolding Workflow

### Option A: Using `uv` (Fastest & Modern)
```bash
# Initialize a library package:
uv init --lib my-package
cd my-package

# Add dependencies:
uv add --dev pytest pytest-cov ruff
```

---

### Option B: Standard Template Setup

#### 1. Create `pyproject.toml`:
```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "my-package"
version = "0.1.0"
description = "A short description of my package"
readme = "README.md"
requires-python = ">=3.10"
license = { text = "MIT" }
authors = [
    { name = "Author Name", email = "author@example.com" }
]
dependencies = []

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-cov>=4.0.0",
    "ruff>=0.3.0",
]

[tool.hatch.build.targets.wheel]
packages = ["src/my_package"]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["src"]

[tool.ruff]
line-length = 100
target-version = "py310"
```

#### 2. Create Initial Source Files:
- `src/my_package/__init__.py`:
```python
"""Top-level package for my-package."""

__version__ = "0.1.0"

from my_package.core import greet

__all__ = ["greet"]
```

- `src/my_package/core.py`:
```python
def greet(name: str) -> str:
    """Return a greeting message."""
    if not name:
        raise ValueError("Name cannot be empty")
    return f"Hello, {name}!"
```

- `tests/test_core.py`:
```python
import pytest
from my_package.core import greet

def test_greet():
    assert greet("Developer") == "Hello, Developer!"

def test_greet_empty():
    with pytest.raises(ValueError):
        greet("")
```

#### 3. Setup Virtual Environment & Install Editable:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -e ".[dev]"
```

---

## 4. VS Code Workspace Configuration

### `.vscode/settings.json`:
```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/.venv/bin/python",
  "python.testing.pytestEnabled": true,
  "python.testing.pytestArgs": ["tests"],
  "python.analysis.typeCheckingMode": "standard",
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff",
    "editor.formatOnSave": true
  }
}
```

### `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: Debug Tests",
      "type": "debugpy",
      "request": "launch",
      "program": "${workspaceFolder}/.venv/bin/pytest",
      "args": ["-v"],
      "console": "integratedTerminal"
    }
  ]
}
```

---

## 5. Verification

1. **Run Tests**:
   ```bash
   pytest
   ```
2. **Run Linter**:
   ```bash
   ruff check .
   ```
3. **Build Wheel**:
   ```bash
   python3 -m pip install build && python3 -m build
   # Or with uv:
   # uv build
   ```
