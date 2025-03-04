/* Copyright 2021, Milkdown by Mirone. */
import { css } from '@emotion/css';
import { ThemeTool } from '@milkdown/core';
import { Decoration, DecorationSet, EditorState, EditorView, findParentNode, NodeWithPos } from '@milkdown/prose';
import { Utils } from '@milkdown/utils';

import { CursorStatus, Status } from './status';

export type Props = ReturnType<typeof createProps>;

const createEmptyStyle = ({ font, palette }: ThemeTool) => css`
    position: relative;
    &::before {
        position: absolute;
        cursor: text;
        font-family: ${font.typography};
        font-size: 0.875rem;
        color: ${palette('neutral', 0.6)};
        content: attr(data-text);
        height: 100%;
        display: flex;
        align-items: center;
    }
`;

const createSlashStyle = () => css`
    &::before {
        left: 0.5rem;
    }
`;

export const createProps = (
    status: Status,
    utils: Utils,
    placeholder: Record<CursorStatus, string>,
    shouldDisplay: (parent: NodeWithPos, state: EditorState) => boolean,
) => {
    const emptyStyle = utils.getStyle(createEmptyStyle);
    const slashStyle = utils.getStyle(createSlashStyle);

    return {
        handleKeyDown: (_: EditorView, event: Event) => {
            const { cursorStatus, activeActions } = status.get();
            if (cursorStatus !== CursorStatus.Slash || activeActions.length === 0) {
                return false;
            }
            if (!(event instanceof KeyboardEvent)) {
                return false;
            }

            if (!['ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) {
                return false;
            }

            return true;
        },
        decorations: (state: EditorState) => {
            const parent = findParentNode(({ type }) => type.name === 'paragraph')(state.selection);

            if (!parent || !shouldDisplay(parent, state)) {
                status.clearStatus();
                return;
            }

            const isEmpty = parent.node.content.size === 0;
            const isSlash = parent.node.textContent === '/' && state.selection.$from.parentOffset > 0;
            const isSearch = parent.node.textContent.startsWith('/') && state.selection.$from.parentOffset > 1;

            const createDecoration = (text: string, className: (string | undefined)[]) => {
                const pos = parent.pos;
                return DecorationSet.create(state.doc, [
                    Decoration.node(pos, pos + parent.node.nodeSize, {
                        class: className.filter((x) => x).join(' '),
                        'data-text': text,
                    }),
                ]);
            };

            if (isEmpty) {
                status.clearStatus();
                const text = placeholder[CursorStatus.Empty];
                return createDecoration(text, [emptyStyle, 'empty-node']);
            }

            if (isSlash) {
                status.setSlash();
                const text = placeholder[CursorStatus.Slash];
                return createDecoration(text, [emptyStyle, slashStyle, 'empty-node', 'is-slash']);
            }

            if (isSearch) {
                status.setSlash(parent.node.textContent.slice(1));
                return null;
            }

            status.clearStatus();
            return null;
        },
    };
};
