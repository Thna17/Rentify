import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Paths = Record<string, string[]>;

const workspaceRoot = resolve(__dirname, '..');
const tsconfig = JSON.parse(
  readFileSync(resolve(workspaceRoot, 'tsconfig.base.json'), 'utf8')
);
const paths: Paths = tsconfig.compilerOptions.paths;

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Vite aliases derived from tsconfig.base.json without requiring Nx's native
 * project-graph resolver. Keep tsconfig paths as the single source of truth.
 */
export const viteWorkspaceAliases = Object.entries(paths).map(
  ([name, targets]) => {
    const target = targets[0];
    const hasWildcard = name.includes('*');
    const find = new RegExp(
      `^${escapeRegex(name).replace('\\*', '(.*)')}$`
    );

    return {
      find,
      replacement: resolve(workspaceRoot, target.replace('*', hasWildcard ? '$1' : '')),
    };
  }
);
