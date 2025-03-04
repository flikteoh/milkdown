/* Copyright 2021, Milkdown by Mirone. */

import { Decoration, DecorationSet, Plugin, PluginKey } from '@milkdown/prose';
import { createProsePlugin } from '@milkdown/utils';
import { CellSelection } from 'prosemirror-tables';

import { getCellsInColumn, getCellsInRow } from '../utils';
import { createActions } from './actions';
import { calculatePosition } from './calc-pos';
import { ToolTipPos } from './constant';
import { calculateItem } from './helper';
import { injectStyle } from './style';
import { createWidget } from './widget';

export const key = 'MILKDOWN_PLUGIN_TABLE';

export const operatorPlugin = createProsePlugin((_, utils) => {
    const items = createActions(utils);
    const tooltip = document.createElement('div');
    const style = utils.getStyle(injectStyle);
    if (style) {
        tooltip.classList.add(style);
    }
    tooltip.classList.add('table-tooltip', 'hide');

    const plugin = new Plugin({
        key: new PluginKey('MILKDOWN_TABLE_OP'),
        props: {
            decorations: (state) => {
                const decorations: Decoration[] = [];
                const leftCells = getCellsInColumn(0)(state.selection);
                if (!leftCells) return null;
                const topCells = getCellsInRow(0)(state.selection);
                if (!topCells) return null;

                const [topLeft] = leftCells;

                decorations.push(createWidget(utils.ctx, topLeft, ToolTipPos.Point));
                leftCells.forEach((cell, i) => {
                    decorations.push(createWidget(utils.ctx, cell, ToolTipPos.Left, i));
                });
                topCells.forEach((cell, i) => {
                    decorations.push(createWidget(utils.ctx, cell, ToolTipPos.Top, i));
                });

                return DecorationSet.create(state.doc, decorations);
            },
        },
        view: (editorView) => {
            Object.values(items).forEach(({ $ }) => tooltip.appendChild($));
            editorView.dom.parentNode?.appendChild(tooltip);

            const listener = (e: Event) => {
                if (!editorView) return;
                e.stopPropagation();
                e.preventDefault();
                Object.values(items).forEach(({ $, command }) => {
                    if ($.contains(e.target as Element)) {
                        command(e, editorView)(editorView.state, editorView.dispatch, editorView);
                    }
                });
            };

            const hide = () => {
                tooltip.classList.add('hide');
            };

            tooltip.addEventListener('mousedown', listener);

            return {
                update: (view, prevState) => {
                    const state = view.state;

                    if (prevState?.doc.eq(state.doc) && prevState.selection.eq(state.selection)) return;

                    const isCellSelection = state.selection instanceof CellSelection;

                    if (!isCellSelection || !view.editable) {
                        hide();
                        return;
                    }

                    calculateItem(items, view);
                    if (Object.values(items).every(({ $ }) => $.classList.contains('hide'))) {
                        hide();
                        return;
                    }
                    tooltip.classList.remove('hide');
                    calculatePosition(view, tooltip);
                },
                destroy: () => {
                    tooltip.removeEventListener('mousedown', listener);
                    tooltip.remove();
                },
            };
        },
    });
    return {
        id: 'table-operator',
        plugin,
    };
});
