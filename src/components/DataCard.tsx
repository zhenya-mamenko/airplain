import React, { useState, createContext, useContext, forwardRef } from 'react';
import {
  KeyboardAvoidingView,
  KeyboardTypeOptions,
  Pressable,
  Switch as _Switch,
} from 'react-native';
import { View, Text, TextInput } from 'react-native-picasso';
import { useThemeColor } from '@/hooks/useColors';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Select as _Select } from '@/components/Select';

export const DataCardContext = createContext(
  ({ field, value }: { field: string; value: any }) => {},
);

export interface DataCardProps {
  caption: string | JSX.Element;
  children: any;
  className?: string;
  dataClassName?: string;
  rightBlock?: JSX.Element;
  onLayout?: (event: any) => void;
  onSave?: (values: any) => void;
}

export const DataCard = forwardRef(
  (
    {
      caption,
      children,
      className,
      dataClassName,
      rightBlock,
      onLayout,
      onSave,
    }: DataCardProps,
    ref,
  ) => {
    const colorGray = useThemeColor('textColors.gray');
    const allowEditing = children.length === 2;

    const [editing, setEditing] = useState(false);
    const [state, setState] = useState({});

    const dispatch = ({ field, value }: { field: string; value: any }) => {
      setState((oldState) => ({ ...oldState, [field]: value }));
    };

    const press = () => {
      if (editing && onSave) onSave(state);
      setEditing(!editing);
    };

    return (
      <DataCardContext.Provider value={dispatch}>
        <View
          className={`radius-md b-1 bordercolor-outline bg-background flex-column elevated mb-md ${className ?? ''}`}
          onLayout={onLayout}
        >
          <View className="radiustr-md radiustl-md px-md py-sm bb-1 bordercolor-outlineVariant bg-secondaryContainer flex-row justifycontent-between alignitems-center">
            <View className="flex-row justifycontent-start alignitems-center">
              {typeof caption === 'string' ? (
                <Text className="size-smm weight-bold mt-xs color-secondaryContainer">
                  {caption.toLocaleUpperCase()}
                </Text>
              ) : (
                caption
              )}
            </View>
            <View className="flex-row alignitems-center">
              {rightBlock}
              {allowEditing && (
                <Pressable hitSlop={5} onPress={() => press()}>
                  <FontAwesome5
                    color={colorGray}
                    name={editing ? 'check' : 'edit'}
                    size={16}
                  />
                </Pressable>
              )}
            </View>
          </View>
          <View
            className={
              !!dataClassName
                ? dataClassName
                : 'px-md pb-sm radiusbr-md radiusbl-md bg-background'
            }
          >
            {allowEditing ? (!editing ? children[0] : children[1]) : children}
          </View>
        </View>
      </DataCardContext.Provider>
    );
  },
);

export interface ValueProps {
  caption: string;
  lines?: number;
  selectable?: boolean;
  value: string | number | JSX.Element;
  width?: string;
}

export const Value = React.memo(
  ({
    caption,
    value,
    lines = 1,
    width = '100%',
    selectable = true,
  }: ValueProps) => {
    return (
      <View
        className="flex-column"
        // @ts-ignore
        style={{ ...(!!width ? { width } : {}) }}
      >
        {caption.length !== 0 && (
          <Text
            className="size-md color-primaryContainer"
            ellipsizeMode="tail"
            numberOfLines={1}
            style={{ fontVariant: ['small-caps'] }}
          >
            {caption.toLocaleLowerCase()}
          </Text>
        )}
        {typeof value === 'string' || typeof value === 'number' ? (
          <Text
            className="size-md weight-bold color-surface mt-xs"
            ellipsizeMode="tail"
            numberOfLines={lines}
            selectable={selectable}
          >
            {value}
          </Text>
        ) : (
          value
        )}
      </View>
    );
  },
);

export interface InputProps {
  caption: string;
  field: string;
  keyboardType?: KeyboardTypeOptions;
  lines?: number;
  value: string;
  width?: string;
}

export const Input = React.memo(
  ({
    caption,
    field,
    keyboardType,
    lines = 1,
    value,
    width = '100%',
  }: InputProps) => {
    const dispatch = useContext(DataCardContext);
    const [text, setText] = useState(value);

    const handleChange = (value: string) => {
      dispatch({ field, value });
      setText(value);
    };

    return (
      <View
        className="flex-column"
        // @ts-ignore
        style={{ ...(!!width ? { width } : {}) }}
      >
        {caption.length !== 0 && (
          <Text
            className="size-md color-primaryContainer mb-sm"
            ellipsizeMode="tail"
            numberOfLines={1}
            style={{ fontVariant: ['small-caps'] }}
          >
            {caption.toLocaleLowerCase()}
          </Text>
        )}
        <TextInput
          className={`color-surface bg-background b-1 bordercolor-outline radius-sm size-md px-smm py-xs ${width === '100%' ? '' : 'mr-md'}`}
          key={field}
          keyboardType={keyboardType}
          numberOfLines={lines}
          multiline={lines !== 1}
          style={{ textAlignVertical: 'top' }}
          submitBehavior="newline"
          value={text}
          onChangeText={(v: string) => handleChange(v)}
        />
      </View>
    );
  },
);

export interface SelectProps {
  caption: string;
  field: string;
  value: string;
  data: Array<{ id: string; value: string }>;
  width?: string;
}

export const Select = React.memo(
  ({ caption, field, value, data, width }: SelectProps) => {
    const dispatch = useContext(DataCardContext);
    const [id, setId] = useState(value);

    const handleChange = (item: { id: string; value: string }) => {
      dispatch({ field, value: item.id });
      setId(item.id);
    };

    const colorSurface = useThemeColor('textColors.surface');

    return (
      <View
        className="flex-column"
        // @ts-ignore
        style={{ ...(!!width ? { width } : {}) }}
      >
        <Text
          className="size-md color-primaryContainer mb-sm"
          ellipsizeMode="tail"
          numberOfLines={1}
          style={{ fontVariant: ['small-caps'] }}
        >
          {caption.toLocaleLowerCase()}
        </Text>
        <KeyboardAvoidingView behavior="height">
          <_Select
            className="color-surface bg-background b-1 bordercolor-outline radius-sm size-md px-xs"
            key={field}
            data={data}
            labelField="value"
            placeholder=""
            selectedTextStyle={{
              paddingVertical: 4,
              paddingLeft: 8,
              paddingRight: 0,
              color: colorSurface,
            }}
            value={id}
            valueField="id"
            onChange={handleChange}
          />
        </KeyboardAvoidingView>
      </View>
    );
  },
);

export interface SwitchProps {
  caption: string;
  field: string;
  value: boolean;
  valuesCaptions?: { true: string; false: string };
  width?: string;
}

export const Switch = React.memo(
  ({ caption, field, value, valuesCaptions, width = '100%' }: SwitchProps) => {
    const dispatch = useContext(DataCardContext);
    const [isEnabled, setIsEnabled] = useState(value);
    const colorSurfaceVariant = useThemeColor('colors.surfaceVariant');
    const colorPrimary = useThemeColor('colors.primary');
    const colorGray = useThemeColor('textColors.gray');

    const handleChange = (value: boolean) => {
      dispatch({ field, value });
      setIsEnabled(value);
    };

    return (
      <View
        className="flex-column"
        // @ts-ignore
        style={{ ...(!!width ? { width } : {}) }}
      >
        {caption.length !== 0 && (
          <Text
            className="size-md color-primaryContainer mb-sm"
            ellipsizeMode="tail"
            numberOfLines={1}
            style={{ fontVariant: ['small-caps'] }}
          >
            {caption.toLocaleLowerCase()}
          </Text>
        )}
        <View className="flex-row alignitems-center justifycontent-start">
          <_Switch
            key={field}
            trackColor={{
              false: colorSurfaceVariant,
              true: colorSurfaceVariant,
            }}
            thumbColor={isEnabled ? colorPrimary : colorGray}
            value={isEnabled}
            onValueChange={(v: boolean) => handleChange(v)}
          />
          {valuesCaptions && (
            <Text className="size-md color-primaryContainer ml-xs">
              {valuesCaptions[isEnabled.toString() as 'true' | 'false']}
            </Text>
          )}
        </View>
      </View>
    );
  },
);
