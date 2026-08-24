import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { defineConfig } from '@rsbuild/core';
import unpluginGem from 'unplugin-gem/rspack';

const require = createRequire(import.meta.url);

const { version } = require('../../package.json');

const examples = fs
  .readdirSync('src', { withFileTypes: true })
  .filter((example) => example.isDirectory() && example.name !== 'elements')
  .map((dir) => dir.name);

export default defineConfig((config) => {
  const isBuild = config.command === 'build';
  return {
    server: {
      // 各 example 的客户端子路由需回落到对应 HTML
      historyApiFallback: {
        rewrites: examples.map((name) => ({
          from: new RegExp(`^/${name}(/|$)`),
          to: `/${name}.html`,
        })),
      },
    },
    html: {
      template: './src/template.html',
    },
    source: {
      entry: Object.fromEntries(examples.map((name) => [name, `./src/${name}`])),
      define: {
        'process.env.VERSION': JSON.stringify(version),
        'process.env.EXAMPLES': JSON.stringify(
          examples.map((example) => {
            try {
              return { name: example, ...require(`./src/${example}/manifest.json`), path: example };
            } catch {
              return { path: example, name: example };
            }
          }),
        ),
      },
    },
    resolve: {
      alias: {
        src: './src',
      },
    },
    tools: {
      rspack: {
        target: ['web', 'es2024'],
        plugins: [
          unpluginGem({
            include: path.resolve(__dirname, 'src'),
            autoImport: {
              extends: 'gem',
              elements: {
                src: {
                  'gem-examples-*': '/elements/*',
                },
              },
            },
            autoImportDts: true,
            hmr: !isBuild,
          }),
        ],
      },
    },
  };
});
