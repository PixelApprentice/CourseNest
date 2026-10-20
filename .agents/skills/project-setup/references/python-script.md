# Python Script Project Setup Reference

A guide for setting up a single Python script or lightweight script project with environment isolation and VS Code debugging.

---

## 1. When to Use

Use this setup when the user wants:
- A standalone script or CLI utility
- Automation scripts or data processing tasks
- A lightweight environment without building a distributable wheel/package

---

## 2. Setup Approaches

### Option A: Modern PEP 723 Script with `uv` (Recommended)

PEP 723 allows scripts to declare their own inline dependencies, executed seamlessly via `uv run`:

#### Create `main.py`:
```python
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "requests>=2.31.0",
#     "rich>=13.7.0",
# ]
# ///

import sys
import requests
from rich.console import Console

console = Console()

def main():
    console.print("[bold green]Script initialized successfully![/bold green]")
    # Example logic:
    resp = requests.get("https://httpbin.org/get")
    console.print(f"Response status: {resp.status_code}")

if __name__ == "__main__":
    main()
```

#### Run with `uv`:
```bash
uv run main.py
```

---

### Option B: Standard Virtual Environment (`venv` + `pip`)

#### 1. Create Virtual Environment:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt  # If requirements exist
```

#### 2. Create `main.py`:
```python
import sys
import argparse

def parse_args():
    parser = argparse.ArgumentParser(description="Script description")
    parser.add_argument("--name", default="World", help="Target name")
    return parser.parse_args()

def main():
    args = parse_args()
    print(f"Hello, {args.name}!")

if __name__ == "__main__":
    main()
```

#### 3. Create `.gitignore`:
```gitignore
.venv/
__pycache__/
*.pyc
.env
.pytest_cache/
```

---

## 3. VS Code Workspace Configuration

### `.vscode/settings.json`:
```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/.venv/bin/python",
  "python.analysis.typeCheckingMode": "basic",
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll": "explicit",
      "source.organizeImports": "explicit"
    }
  }
}
```

### `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: Current File",
      "type": "debugpy",
      "request": "launch",
      "program": "${file}",
      "console": "integratedTerminal"
    }
  ]
}
```

### `.vscode/extensions.json`:
```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.debugpy",
    "charliermarsh.ruff"
  ]
}
```

---

## 4. Verification

1. Test execution:
   ```bash
   .venv/bin/python main.py
   ```
2. Verify syntax:
   ```bash
   python3 -m py_compile main.py
   ```
