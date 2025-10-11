/**
 * ScrollableSelector Component
 *
 * This component renders a horizontally scrollable list of items using React Native's FlatList.
 * It allows for selecting an item from the list, and provides callbacks for when the selection changes.
 *
 * Props:
 * - data: An array of items to be displayed in the selector.
 * - ref: Optional ref object for the FlatList.
 * - viewabilityConfig: Optional configuration for viewability of items.
 * - onSelectionChange: Optional callback function that is called when the selection changes.
 * - onRenderItem: Function to render each item.
 *
 * Example usage:
 * ```
 * <ScrollableSelector
 *   data={[{ key: '1' }, { key: '2' }, { key: '3' }]}
 *   onRenderItem={(item, isSelected) => (
 *     <Text style={{ color: isSelected ? 'blue' : 'black' }}>{item.key}</Text>
 *   )}
 *   onSelectionChange={(key) => console.log('Selected:', key)}
 * />
 * ```
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ViewabilityConfig } from 'react-native';

interface Item {
  key: string;
}

/**
 * Props for the ScrollableSelector component.
 */
interface ScrollableSelectorProps {
  /**
   * The data to be displayed in the selector.
   */
  data: Item[];

  /**
   * Optional ref object for the FlatList.
   */
  ref?: React.RefObject<FlatList>;

  /**
   * Optional key for object to be selected. If not provided, the first item will be selected by default.
   */
  selectedKey?: string;

  /**
   * Optional configuration for viewability of items.
   */
  viewabilityConfig?: ViewabilityConfig;

  /**
   * Optional callback function that is called when the selection changes.
   * @param key - The key of the newly selected item.
   */
  onSelectionChange?: (key: string) => void;

  /**
   * Function to render each item.
   * @param item - The item to be rendered.
   * @param isSelected - Whether the item is currently selected.
   * @returns A JSX element representing the rendered item.
   */
  onRenderItem: (item: any, isSelected: boolean) => JSX.Element;
}

const ScrollableSelector: React.FC<ScrollableSelectorProps> = (props) => {
  const [selected, setSelected] = useState(
    props.selectedKey ?? props.data[0]?.key,
  );
  const selectedRef = useRef(selected);
  const viewabilityConfig = props.viewabilityConfig ?? {
    minimumViewTime: 200,
    itemVisiblePercentThreshold: 10,
  };
  const keys = props.data.map((item) => item.key);
  const flRef = useRef<FlatList>(null);

  useEffect(() => {
    const index = keys.indexOf(selected);
    const viewPosition = 0.5;
    if (flRef?.current && index >= 0) {
      flRef.current.scrollToIndex({ index, viewPosition });
    }
  }, [flRef.current, selected]);

  const changeSelected = useCallback(
    (key: string) => {
      setSelected(key);
      selectedRef.current = key;
      if (props.onSelectionChange) props.onSelectionChange(key);
    },
    [props.onSelectionChange],
  );

  useEffect(() => {
    if (props.selectedKey !== selected)
      changeSelected(props.selectedKey ?? props.data[0]?.key);
  }, [props.selectedKey]);

  const viewableItemsChanged = useRef(
    (info: { changed: any[]; viewableItems: any[] }) => {},
  );
  useEffect(() => {
    viewableItemsChanged.current = (info: {
      changed: any[];
      viewableItems: any[];
    }) => {
      const viewableKeys = info.viewableItems.map((v) => v.item.key);
      let key = null,
        selectedKeyEncountered = false;
      for (const item of keys) {
        selectedKeyEncountered = !selectedKeyEncountered
          ? item === selectedRef.current
          : selectedKeyEncountered;
        if (viewableKeys.includes(item)) key = item;
        if (selectedKeyEncountered && key !== null) break;
      }
      if (!!key && selectedRef.current !== key) changeSelected(key);
    };
  }, [keys, selected]);

  const renderItem = useCallback(
    ({ item }: { item: Item }): JSX.Element => {
      const isSelected = item.key === selected;
      const renderedItem = props.onRenderItem ? (
        <Pressable onPress={() => changeSelected(item.key)}>
          {props.onRenderItem(item, isSelected)}
        </Pressable>
      ) : (
        <></>
      );
      return renderedItem;
    },
    [props.onRenderItem, selected],
  );

  const onViewableItemsChanged = (info: {
    changed: any[];
    viewableItems: any[];
  }) => viewableItemsChanged.current(info);
  const viewabilityConfigCallbackPairs = useRef([
    { viewabilityConfig, onViewableItemsChanged },
  ]).current;

  useEffect(() => {
    if (!!props.data[0]?.key && !selected) changeSelected(props.data[0]?.key);
  }, [changeSelected]);

  return (
    <FlatList
      {...props}
      initialNumToRender={keys.length}
      keyExtractor={(item: Item) => item.key}
      ref={flRef}
      renderItem={renderItem}
      horizontal
      showsHorizontalScrollIndicator={false}
      viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
    />
  );
};

export default ScrollableSelector;
