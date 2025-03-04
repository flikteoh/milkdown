/* Copyright 2021, Milkdown by Mirone. */
import { createSlice, Ctx, MilkdownPlugin } from '@milkdown/ctx';
import type { Plugin } from '@milkdown/prose';

import { CommandsReady } from './commands';

export const prosePluginsCtx = createSlice<Plugin[]>([], 'prosePlugins');

type MaybeList<T> = T | T[];

type PluginFactory = ((ctx: Ctx) => MaybeList<Plugin>) | MaybeList<Plugin>;

export const prosePluginFactory =
    (plugin: PluginFactory): MilkdownPlugin =>
    () =>
    async (ctx) => {
        await ctx.wait(CommandsReady);
        const plugins = typeof plugin === 'function' ? [plugin(ctx)] : [plugin];
        ctx.update(prosePluginsCtx, (prev) => prev.concat(plugins.flat()));
    };
