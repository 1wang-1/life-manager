import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePath(maybePath, defaultPath) {
  const raw = maybePath ?? defaultPath;
  if (!raw) return raw;
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

function toCamelCase(kebabOrSnake) {
  return kebabOrSnake.replace(/[-_]+([a-zA-Z0-9])/g, (_, c) => String(c).toUpperCase());
}

function parseCssVariables(cssText) {
  const vars = new Map();
  const re = /--([a-zA-Z0-9-_]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(cssText)) !== null) {
    const name = m[1].trim();
    const value = m[2].trim();
    vars.set(name, value);
  }
  return vars;
}

function parsePxNumber(value) {
  const m = /^(-?\d+(?:\.\d+)?)px$/i.exec(String(value).trim());
  if (!m) return null;
  return Number(m[1]);
}

function parseNumberish(value) {
  const n = Number(String(value).trim());
  if (Number.isFinite(n)) return n;
  return null;
}

function applyTokenUpdates(design, cssVars) {
  const next = typeof structuredClone === 'function' ? structuredClone(design) : JSON.parse(JSON.stringify(design));
  next.tokens ??= {};
  next.tokens.color ??= {};
  next.tokens.typography ??= {};
  next.tokens.spacing ??= {};
  next.tokens.radii ??= {};
  next.tokens.shadows ??= {};

  for (const [name, value] of cssVars.entries()) {
    if (name.startsWith('color-')) {
      const key = toCamelCase(name.slice('color-'.length));
      next.tokens.color[key] = value;
      continue;
    }

    if (name.startsWith('font-')) {
      const rest = name.slice('font-'.length);
      const parts = rest.split('-');
      if (parts.length >= 2) {
        const group = parts[0];
        const prop = parts.slice(1).join('-');
        const groupKey = toCamelCase(group);
        next.tokens.typography[groupKey] ??= {};
        if (prop === 'size') {
          const n = parsePxNumber(value) ?? parseNumberish(value);
          if (n !== null) next.tokens.typography[groupKey].size = n;
        } else if (prop === 'height' || prop === 'line' || prop === 'line-height') {
          const n = parsePxNumber(value) ?? parseNumberish(value);
          if (n !== null) next.tokens.typography[groupKey].line = n;
        } else if (prop === 'weight') {
          const n = parseNumberish(value);
          if (n !== null) next.tokens.typography[groupKey].weight = n;
        }
      }
      continue;
    }

    if (name.startsWith('space-')) {
      const idx = name.slice('space-'.length);
      const n = parsePxNumber(value);
      if (n !== null) {
        next.tokens.spacing.scale ??= [];
        next.tokens.spacing.scale.push({ idx, px: n });
      }
      continue;
    }

    if (name.startsWith('radius-')) {
      const key = toCamelCase(name.slice('radius-'.length));
      const n = parsePxNumber(value) ?? parseNumberish(value);
      if (n !== null) next.tokens.radii[key] = n;
      continue;
    }

    if (name.startsWith('shadow-')) {
      const key = toCamelCase(name.slice('shadow-'.length));
      next.tokens.shadows[key] = value;
      continue;
    }
  }

  if (Array.isArray(next.tokens.spacing.scale) && next.tokens.spacing.scale.length > 0) {
    const byIdx = new Map();
    for (const entry of next.tokens.spacing.scale) {
      if (entry && typeof entry === 'object' && 'idx' in entry && 'px' in entry) {
        const n = Number(entry.px);
        if (Number.isFinite(n)) byIdx.set(String(entry.idx), n);
      }
    }
    const ordered = Array.from(byIdx.entries())
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, px]) => px);

    next.tokens.spacing.scale = ordered;
    if (!('unit' in next.tokens.spacing) && ordered.length > 0) next.tokens.spacing.unit = ordered[0];
  }

  return next;
}

function toolText(text) {
  return { content: [{ type: 'text', text: String(text) }] };
}

const server = new Server(
  { name: 'pencil-design-server', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'pencil_read_design',
        description: 'Read the current Pencil design JSON file as text.',
        inputSchema: {
          type: 'object',
          properties: {
            designPath: { type: 'string', description: 'Optional path to a design json file.' }
          },
          additionalProperties: false
        }
      },
      {
        name: 'pencil_write_design',
        description: 'Overwrite the Pencil design JSON file with provided JSON text.',
        inputSchema: {
          type: 'object',
          properties: {
            designPath: { type: 'string', description: 'Optional path to a design json file.' },
            jsonText: { type: 'string', description: 'Full JSON content to write.' }
          },
          required: ['jsonText'],
          additionalProperties: false
        }
      },
      {
        name: 'pencil_update_tokens_from_css',
        description: 'Update tokens inside the design file by reading CSS variables from tokens.css.',
        inputSchema: {
          type: 'object',
          properties: {
            designPath: { type: 'string', description: 'Optional path to a design json file.' },
            cssPath: { type: 'string', description: 'Optional path to a css file containing :root variables.' }
          },
          additionalProperties: false
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const defaultDesignPath = resolvePath(process.env.PENCIL_DESIGN_PATH, path.resolve(process.cwd(), 'pencil.design.json'));
  const defaultCssPath = resolvePath(process.env.PENCIL_TOKENS_CSS_PATH, path.resolve(process.cwd(), 'src', 'renderer', 'src', 'styles', 'tokens.css'));

  if (request.params.name === 'pencil_read_design') {
    const designPath = resolvePath(request.params.arguments?.designPath, defaultDesignPath);
    const text = await fs.readFile(designPath, 'utf8');
    return toolText(text);
  }

  if (request.params.name === 'pencil_write_design') {
    const designPath = resolvePath(request.params.arguments?.designPath, defaultDesignPath);
    const jsonText = String(request.params.arguments?.jsonText ?? '');
    const parsed = JSON.parse(jsonText);
    const pretty = JSON.stringify(parsed, null, 2) + '\n';
    await fs.writeFile(designPath, pretty, 'utf8');
    return toolText(`OK: wrote ${designPath}`);
  }

  if (request.params.name === 'pencil_update_tokens_from_css') {
    const designPath = resolvePath(request.params.arguments?.designPath, defaultDesignPath);
    const cssPath = resolvePath(request.params.arguments?.cssPath, defaultCssPath);
    const [designText, cssText] = await Promise.all([
      fs.readFile(designPath, 'utf8'),
      fs.readFile(cssPath, 'utf8')
    ]);

    const design = JSON.parse(designText);
    const cssVars = parseCssVariables(cssText);
    const updated = applyTokenUpdates(design, cssVars);
    await fs.writeFile(designPath, JSON.stringify(updated, null, 2) + '\n', 'utf8');
    return toolText(`OK: updated tokens from ${cssPath} into ${designPath}`);
  }

  return toolText(`Unknown tool: ${request.params.name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);

process.on('unhandledRejection', (err) => {
  try {
    process.stderr.write(String(err?.stack ?? err) + '\n');
  } catch {
    process.stderr.write('Unhandled rejection\n');
  }
});
