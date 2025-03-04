/* Copyright 2021, Milkdown by Mirone. */
import { schemaCtx, themeToolCtx } from '@milkdown/core';
import type { Fragment, Node, Schema } from '@milkdown/prose';
import { Decoration, DecorationSet, EditorState, Plugin } from '@milkdown/prose';
import { createProsePlugin } from '@milkdown/utils';

import { defaultUploader } from './default-uploader';

export type Uploader = (files: FileList, schema: Schema) => Promise<Fragment | Node | Node[]>;
type Spec = { id: symbol; pos: number };

export const uploadPlugin = createProsePlugin<{ uploader: Uploader }>((options, utils) => {
    const uploader = options?.uploader ?? defaultUploader;
    const schema = utils.ctx.get(schemaCtx);

    const placeholderPlugin = new Plugin({
        state: {
            init() {
                return DecorationSet.empty;
            },
            apply(tr, set) {
                const _set = set.map(tr.mapping, tr.doc);
                const action = tr.getMeta(this);
                if (!action) {
                    return _set;
                }
                if (action.add) {
                    const widget = document.createElement('span');
                    const { icon } = utils.ctx.get(themeToolCtx).slots;
                    widget.appendChild(icon('loading'));
                    const decoration = Decoration.widget(action.add.pos, widget, { id: action.add.id });
                    return _set.add(tr.doc, [decoration]);
                }
                if (action.remove) {
                    return _set.remove(_set.find(null, null, (spec: Spec) => spec.id === action.remove.id));
                }
            },
        },
        props: {
            decorations(state) {
                return this.getState(state);
            },
        },
    });
    const findPlaceholder = (state: EditorState, id: symbol): number => {
        const decorations = placeholderPlugin.getState(state);
        const found = decorations.find(null, null, (spec: Spec) => spec.id === id);
        return found.length ? found[0].from : -1;
    };
    const uploadPlugin = new Plugin({
        props: {
            handleDrop: (view, event) => {
                if (!(event instanceof DragEvent)) {
                    return false;
                }
                const { files } = event.dataTransfer ?? {};
                if (!files || files.length <= 0) {
                    return false;
                }
                const id = Symbol('upload symbol');
                const { tr } = view.state;
                const insertPos =
                    view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? tr.selection.from;
                view.dispatch(tr.setMeta(placeholderPlugin, { add: { id, pos: insertPos } }));

                uploader(files, schema)
                    .then((fragment) => {
                        const pos = findPlaceholder(view.state, id);
                        if (pos < 0) return;

                        view.dispatch(
                            view.state.tr
                                .replaceWith(pos, pos, fragment)
                                .setMeta(placeholderPlugin, { remove: { id } }),
                        );
                        return;
                    })
                    .catch((e) => {
                        console.error(e);
                    });
                return true;
            },
        },
    });

    return {
        id: 'upload',
        plugin: [placeholderPlugin, uploadPlugin],
    };
});
