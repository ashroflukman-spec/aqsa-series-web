# Quran application development

For all Quran-related application development, use the globally configured `quran` MCP server (https://mcp.quran.ai) as the primary source for Quran text, translations, tafsir, and linguistic data. Retrieve source data instead of generating Quran content from model memory. Call `fetch_grounding_rules` before canonical data tools and pass its grounding_nonce where supported. Preserve exact Arabic text, verse references, edition identifiers, and translator/tafsir attribution. Prefer Malay translations when suitable and available; verify editions rather than assuming availability. Clearly distinguish translation, scholarly tafsir, and AI explanation. If the server or required data is unavailable, state this and do not silently invent or substitute content. For each app, explicitly implement and verify its runtime data integration, caching, and applicable data licensing; the Codex MCP connection alone does not connect the deployed app.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
