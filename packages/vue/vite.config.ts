/* Copyright 2021, Milkdown by Mirone. */
import vueJsx from '@vitejs/plugin-vue-jsx';
import { defineConfig } from 'vite';

export default defineConfig({
    root: 'app',
    plugins: [vueJsx()],
    esbuild: {
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
    },
});
