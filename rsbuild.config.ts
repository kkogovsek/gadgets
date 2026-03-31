import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [pluginReact()],
  tools: {
    rspack: {
      module: {
        rules: [
          {
            resourceQuery: /url$/,
            type: 'asset/resource',
          },
          {
            resourceQuery: /raw$/,
            type: 'asset/source',
          },
        ],
      },
    },
  },
  html: {
    title: 'Gadgets',
    meta: {
      description: 'A collection of simple utility tools',
    },
  },
});
