import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [pluginReact()],
  html: {
    title: 'Gadgets',
    meta: {
      description: 'A collection of simple utility tools',
    },
  },
});
