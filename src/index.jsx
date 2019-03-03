// @flow
/* eslint-disable react/prop-types */
/* eslint-disable react/no-multi-comp */

import React from 'react';
// Reduce bundle size. Tree shaking issue https://github.com/missive/emoji-mart/issues/229#issuecomment-448080501
import Picker from 'emoji-mart/dist/components/picker/nimble-picker';
import Emoji from 'emoji-mart/dist/components/emoji/nimble-emoji';
import { EditorState } from 'draft-js';

import attachImmutableEntitiesToEmojis from './modifiers/attachImmutableEntitiesToEmojis';
import addEmoji from './modifiers/addEmoji';
import emoji from './strategies/emoji';
import getEmojiDataFromNative from './utils/getEmojiDataFromNative';
import type { DataSet } from './utils/getEmojiDataFromNative';

type Store = {
  getEditorState: ?() => EditorState,
  setEditorState: ?(EditorState) => void
};

type Config = {
  onChange: ?(EditorState) => EditorState,
  set: string,
  emojiSize: number,
  data: DataSet
};

export default function ({
  onChange,
  data,
  set,
  emojiSize = 16,
}: Config = {}) {
  const getEmoji = getEmojiDataFromNative(data, set);
  const addEmojiModifier = addEmoji.bind(null, getEmoji);

  const store: Store = {
    getEditorState: undefined,
    setEditorState: undefined,
  };

  const EmojiComponent = React.memo<Object, string | Emoji>(({ decoratedText, children }) => {
    const foundedEmoji = getEmoji(decoratedText);

    if (foundedEmoji) {
      return (
        <Emoji
          emoji={foundedEmoji}
          size={emojiSize}
          data={data}
          set={set}
        >
          {children}
        </Emoji>
      );
    }

    return decoratedText;
  });

  const handleEmoji = (emojiSymbol) => {
    const newEditorState = addEmojiModifier(store.getEditorState(), emojiSymbol.native);

    store.setEditorState(newEditorState);
  };

  const PickerComponent = React.forwardRef<Object, Picker>((props, ref) => (
    <Picker
      ref={ref}
      set={set}
      data={data}
      onSelect={handleEmoji}
      {...props}
    />
  ));

  const decorators = [
    {
      strategy: emoji,
      component: EmojiComponent,
    },
  ];

  return {
    Emoji: EmojiComponent,
    Picker: PickerComponent,
    decorators,
    initialize: ({ getEditorState, setEditorState }: Store) => {
      store.getEditorState = getEditorState;
      store.setEditorState = setEditorState;
    },
    willUnmount: () => {
      store.getEditorState = undefined;
      store.setEditorState = undefined;
    },
    modifiers: {
      addEmoji: addEmojiModifier,
    },
    onChange: (editorState: EditorState) => {
      let newEditorState = attachImmutableEntitiesToEmojis(editorState);

      if (!newEditorState.getCurrentContent().equals(editorState.getCurrentContent())) {
        // Forcing the current selection ensures that it will be at it's right place.
        // This solves the issue where inserting an Emoji on OSX with Apple's Emoji
        // selector led to the right selection the data, but wrong position in
        // the contenteditable.
        newEditorState = EditorState.forceSelection(
          newEditorState,
          newEditorState.getSelection(),
        );
      }

      if (onChange) {
        return onChange(newEditorState);
      }

      return newEditorState;
    },
  };
}
