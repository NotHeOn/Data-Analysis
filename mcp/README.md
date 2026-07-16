# GSC MCP Server

An MCP (Model Context Protocol) server that exposes Google Search Console data to AI assistants like Claude.

Once running, Claude can query your GSC sites, compare date ranges, and run saved analysis plans — just by asking in natural language.

---

## Prerequisites

- **Node.js 20.6 or later** (the `--env-file` flag requires it; Node 22+ recommended)
- The **main GSC app must already be set up** and your Google account authorized.
  This server reads token files from `../client_credentials/` — those are created when you log in through the main app.

---

## Setup

### 1. Install dependencies

Open a terminal, navigate to the `mcp/` folder, and run:

```bash
cd mcp
npm install
```

### 2. (Optional) Adjust settings

Edit `mcp/.env` to change default values:

```env
MCP_PORT=3301               # port this server listens on
DEFAULT_RESULT_LIMIT=50     # default rows returned per call
MAX_RESULT_LIMIT=200        # hard ceiling on rows returned
```

You can leave the defaults as-is.

### 3. Start the server

```bash
npm start
```

You should see:

```
GSC MCP server listening on http://localhost:3301/mcp
  DEFAULT_RESULT_LIMIT=50  MAX_RESULT_LIMIT=200
```

Keep this terminal open while using Claude — the server must stay running.

---

## Connect to Claude

### Claude Desktop

1. Open (or create) the config file:
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

2. Add the following block inside `"mcpServers"`:

```json
{
  "mcpServers": {
    "gsc": {
      "type": "http",
      "url": "http://localhost:3301/mcp"
    }
  }
}
```

3. Restart Claude Desktop. You should see "gsc" appear in the MCP tools panel.

### Claude Code (CLI)

Run this once to register the server:

```bash
claude mcp add gsc http://localhost:3301/mcp --type http
```

Verify it was added:

```bash
claude mcp list
```

---

## Available Tools

| Tool | What it does |
|------|-------------|
| `list_sites` | Shows all your GSC sites and their aliases |
| `query_performance` | Queries clicks/impressions/CTR/position for a site and date range |
| `compare_periods` | Compares the current period to the equal-length prior period, with deltas |
| `list_analysis_plans` | Lists your saved analysis plan configurations |
| `run_analysis_plan` | Runs a full saved plan (multiple groups) in one call |

---

## Example Prompts

```
List all my GSC sites.

Show me the top 20 queries for sc-domain:example.com last week by clicks.

Compare this week vs last week for sc-domain:example.com, filter to queries
with at least 50 impressions, sorted by click drop.

Run my "default" analysis plan on sc-domain:example.com for 2026-07-01 to 2026-07-13.
```

---

## Important: GSC Data Delay

GSC "Final" data (the default `dataState=final`) has a **~3 day processing delay** in the Asia/Shanghai timezone (UTC+8).

This means:
- If today is **2026-07-16**, Final data is only reliable through **2026-07-13**
- Always use an `endDate` at least 3 days in the past for accurate results
- Claude knows this rule and will apply it automatically

To include yesterday's data (less accurate, may be revised by Google later), ask Claude to use `dataState=all`.

---

## Troubleshooting

### "Token has been expired or revoked" / 401 / 403 errors

Your Google OAuth2 token has expired. To fix:
1. Stop the MCP server (`Ctrl+C`)
2. In the project root, run `npm run dev` and open the app in your browser
3. Complete the Google sign-in / re-authorization flow
4. Restart the MCP server (`npm start` in the `mcp/` folder)

### "Cannot find module '../src/services/compare.js'"

The MCP server must be run from inside the `mcp/` directory. Make sure you `cd mcp` before running `npm start`.

### Port already in use

Another process is using port 3301. Either:
- Stop the other process, or
- Change `MCP_PORT` in `mcp/.env` and update your Claude config URL to match

### Results are cut off / truncated

When Claude returns truncated results, look for the `_meta.hint` in the response — it will suggest how to narrow your query (e.g. add a `clicks >= 10` filter). You can also ask Claude to increase `resultLimit` up to the configured maximum (default: 200).

---

## How the System Prompt Works

This server passes operational guidelines to Claude automatically via the MCP `initialize` response (`instructions` field). Claude receives rules like the data delay policy and auth error handling as part of the connection setup — you don't need to tell Claude these things manually.

You can also ask Claude to "show me the GSC usage guide" to see the full guide this server exposes as an MCP prompt.
