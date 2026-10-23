# How the skills reach agents

One page, one picture: where a skill is written, what the build produces, and how each kind of
agent receives it. The details of each step are in [architecture.md](architecture.md) and
[platforms.md](platforms.md). How a change becomes a release is in [publishing.md](publishing.md).

## Diagram

```mermaid
flowchart LR
  subgraph write["1. Write"]
    direction TB
    src["src/skills/&lt;name&gt;/<br/>SKILL.md + skill.json"]
    shared["shared/<br/>rules every skill needs"]
    evals["evals/&lt;name&gt;/<br/>test prompts"]
  end

  subgraph build["2. Build and check (yarn verify)"]
    direction TB
    validate["validate<br/>names, sizes, lifecycle"]
    contract["contract<br/>requires_tools exist on the MCP server"]
    safe["public-safety<br/>nothing internal"]
    adapters["adapters<br/>one output per platform"]
    validate --> adapters
    contract --> adapters
    safe --> adapters
  end

  subgraph out["3. Outputs"]
    direction TB
    catalog["catalog.json<br/>names, versions, hashes"]
    plugins["Plugin manifests<br/>Claude Code · Cursor · Gemini CLI · Codex · Grok"]
    zips["Release ZIPs<br/>one per skill + bundles + SHA256SUMS"]
    mcptext["MCP text<br/>instructions · guides · tool notes"]
  end

  subgraph use["4. Agents receive them"]
    direction TB
    cli["Brevo CLI<br/>brevo skill install"]
    host["Agent hosts<br/>install the plugin"]
    upload["claude.ai · ChatGPT<br/>upload a ZIP by hand"]
    server["Brevo MCP server<br/>serves the text to any MCP client"]
  end

  src --> validate
  shared --> validate
  evals --> validate
  adapters --> catalog
  adapters --> plugins
  adapters --> zips
  adapters --> mcptext
  catalog --> cli
  plugins --> host
  zips --> upload
  mcptext --> server
```

## Who gets what

| Agent | Gets | Needs |
|---|---|---|
| Claude Code, Cursor, Gemini CLI, Codex, Grok | the plugin: every skill, plus the MCP server entry | installing the plugin |
| An agent with a shell | the skills installed on disk by the CLI, read from there | `npm i -g @getbrevo/cli`, then `brevo skill install` |
| claude.ai, ChatGPT | one ZIP per skill | an upload by hand; skills that need a shell have none |
| ChatGPT web, Cursor, any MCP client | guidance from the MCP server: server instructions, `get_brevo_guide`, resources, prompts, notes on tool descriptions | connecting the Brevo MCP server |

A skill acts only through the Brevo MCP server's tools; it never calls an API directly and holds
no keys. That is why the contract check sits in the build: a skill that names a tool the server
does not have fails before it is released.
