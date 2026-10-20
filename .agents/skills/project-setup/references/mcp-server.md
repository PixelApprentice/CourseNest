# Model Context Protocol (MCP) Server Setup Reference

A comprehensive guide for scaffolding production-ready MCP (Model Context Protocol) servers in **TypeScript** (recommended default) or **Python**, fully configured for Antigravity, Claude Desktop, and VS Code.

---

## 1. Choosing the Language & Architecture

- **TypeScript (Default)**: Best for Node.js environments, wide ecosystem of web APIs, type-safe schema definitions with `zod`.
- **Python**: Best for data science, AI/ML pipelines, scripting, using official `FastMCP` API.

---

## 2. TypeScript MCP Server Setup (Recommended)

### A. Initialize Package and Dependencies
Run:
```bash
npm init -y
npm pkg set type="module"
npm pkg set scripts.build="tsc"
npm pkg set scripts.start="node dist/index.js"
npm pkg set scripts.dev="tsx src/index.ts"
npm pkg set scripts.inspect="npx @modelcontextprotocol/inspector node dist/index.js"

npm install @modelcontextprotocol/sdk zod
npm install -D typescript @types/node tsx
```

### B. Create `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}
```

### C. Create `src/index.ts`
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Initialize MCP Server
const server = new McpServer({
  name: "my-mcp-server",
  version: "1.0.0",
});

// Register a Sample Tool
server.tool(
  "calculate_bmi",
  "Calculate Body Mass Index (BMI) given weight in kg and height in meters",
  {
    weightKg: z.number().positive().describe("Weight in kilograms"),
    heightMeters: z.number().positive().describe("Height in meters"),
  },
  async ({ weightKg, heightMeters }) => {
    const bmi = weightKg / (heightMeters * heightMeters);
    const category =
      bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal weight" : bmi < 30 ? "Overweight" : "Obese";

    return {
      content: [
        {
          type: "text",
          text: `BMI is ${bmi.toFixed(2)} (${category})`,
        },
      ],
    };
  }
);

// Register a Sample Dynamic Resource
server.resource(
  "system-info",
  "system://info",
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify({
          status: "online",
          platform: process.platform,
          nodeVersion: process.version,
          timestamp: new Date().toISOString(),
        }, null, 2),
      },
    ],
  })
);

// Connect via Stdio Transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
```

### D. Compile and Verify
```bash
npm run build
```

---

## 3. Python MCP Server Setup (FastMCP)

### A. Initialize with `uv` or Standard Virtualenv
Using `uv`:
```bash
uv init --name my-mcp-server
uv add "mcp[cli]"
```
Or standard Python:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install "mcp[cli]"
```

### B. Create `server.py`
```python
from mcp.server.fastmcp import FastMCP

# Initialize FastMCP Server
mcp = FastMCP("my-mcp-server")

# Define a Tool
@mcp.tool()
def calculate_bmi(weight_kg: float, height_meters: float) -> str:
    """Calculate Body Mass Index (BMI) given weight in kg and height in meters."""
    if height_meters <= 0:
        raise ValueError("Height must be greater than zero.")
    bmi = weight_kg / (height_meters ** 2)
    category = "Underweight" if bmi < 18.5 else "Normal weight" if bmi < 25 else "Overweight" if bmi < 30 else "Obese"
    return f"BMI is {bmi:.2f} ({category})"

# Define a Resource
@mcp.resource("system://info")
def get_system_info() -> str:
    """Return basic server info."""
    import platform, datetime
    return f"System: {platform.system()} {platform.release()} at {datetime.datetime.utcnow()}"

if __name__ == "__main__":
    mcp.run()
```

---

## 4. MCP Configuration Files

### A. VS Code MCP Config (`.vscode/mcp.json`)
Create `.vscode/mcp.json` in the project root:
```json
{
  "servers": {
    "my-mcp-server": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/dist/index.js"]
    }
  }
}
```
*(For Python, replace command with `uv` and args with `["run", "server.py"]` or `${workspaceFolder}/.venv/bin/python`).*

### B. Antigravity Configuration (`mcp_config.json`)
Register in Antigravity or Claude Desktop:
```json
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/my-mcp-server/dist/index.js"]
    }
  }
}
```

### C. VS Code Debugging (`.vscode/launch.json`)
Create `.vscode/launch.json` for F5 debugging:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug MCP Server (TS)",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["tsx", "${workspaceFolder}/src/index.ts"],
      "console": "internalConsole"
    }
  ]
}
```

---

## 5. Testing with MCP Inspector

Test tools and resources visually:
```bash
# For TypeScript:
npx @modelcontextprotocol/inspector node dist/index.js

# For Python:
mcp dev server.py
```
