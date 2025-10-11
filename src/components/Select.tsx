import React, { useCallback } from 'react';
import { Text, View, createPicassoComponent } from 'react-native-picasso';
import {
  Dropdown,
  MultiSelect as _MultiSelect,
} from 'react-native-element-dropdown';
import { buildStyleSheet } from 'react-native-picasso/build/util/style-helpers';
import { ThemeContext } from 'react-native-picasso/build/core/theming';
import { Theme } from 'react-native-picasso/build/styles/defaultTheme';
import { useThemeColor } from '@/hooks/useColors';
import { Pressable } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const DropdownWrapper = createPicassoComponent(Dropdown);
const MultiSelectWrapper = createPicassoComponent(_MultiSelect);

export type SelectProps = React.ComponentProps<typeof DropdownWrapper> & {
  showValue?: boolean;
  valueFixedWidth?: number;
  dropdownRef?: any;
};

export const Select: React.FC<SelectProps> = ({
  showValue,
  valueFixedWidth,
  dropdownRef,
  ...props
}: SelectProps) => {
  const renderItem = useCallback(
    (item: any, selected?: boolean): JSX.Element => {
      return (
        <View
          className={`flex-row alignitems-end justifycontent-start bg-${selected ? 'surfaceVariant' : 'background'} py-sm pl-xs`}
        >
          {showValue && (
            <Text
              className={`weight-bold size-md color-surface ${!valueFixedWidth ? 'mr-sm' : ''}`}
              style={{ ...(valueFixedWidth ? { width: valueFixedWidth } : {}) }}
            >
              {item[props.valueField]}
            </Text>
          )}
          <Text className="size-md color-surface">
            {item[props.labelField]}
          </Text>
        </View>
      );
    },
    [showValue, valueFixedWidth, props.labelField, props.valueField],
  );

  const iconColor = useThemeColor('textColors.surface');

  return (
    <ThemeContext.Consumer>
      {(theme: Theme) => {
        const selectedTextStyle = buildStyleSheet(
          'size-md color-surface m-smm',
          theme,
          'text',
        );
        const containerStyle = buildStyleSheet(
          'bg-background b-1 bordercolor-outline radius-sm p-sm mt-xs',
          theme,
          'view',
        );
        const inputSearchStyle = buildStyleSheet(
          'size-md color-surface size-md bordercolor-outline radius-sm',
          theme,
          'text',
        );
        return (
          <DropdownWrapper
            autoScroll={false}
            className={`my-xs ${props.className ?? ''}`}
            containerStyle={containerStyle}
            iconColor={iconColor}
            iconStyle={{ marginRight: 6 }}
            inputSearchStyle={[inputSearchStyle, props.inputSearchStyle]}
            keyboardAvoiding={false}
            placeholderStyle={[selectedTextStyle, props.placeholderStyle]}
            ref={dropdownRef}
            renderItem={props.renderItem ?? renderItem}
            selectedTextStyle={[selectedTextStyle, props.selectedTextStyle]}
            style={[{ width: '100%' }, props.style]}
            {...props}
          />
        );
      }}
    </ThemeContext.Consumer>
  );
};

export const MultiSelect: React.FC<SelectProps> = ({
  showValue,
  valueFixedWidth,
  dropdownRef,
  ...props
}: SelectProps) => {
  const iconColor = useThemeColor('textColors.surface');

  const renderItem = useCallback(
    (item: any, selected?: boolean): JSX.Element => {
      return (
        <View
          className={`flex-row alignitems-end justifycontent-start bg-${selected ? 'surfaceVariant' : 'background'} py-sm pl-xs`}
        >
          {showValue && (
            <Text
              className={`weight-bold size-md color-surface ${!valueFixedWidth ? 'mr-sm' : ''}`}
              style={{ ...(valueFixedWidth ? { width: valueFixedWidth } : {}) }}
            >
              {item[props.valueField]}
            </Text>
          )}
          <Text className="size-md color-surface">
            {item[props.labelField]}
          </Text>
        </View>
      );
    },
    [showValue, valueFixedWidth, props.labelField, props.valueField],
  );

  const renderSelectedItem = useCallback(
    (item: any, unSelect?: (item: any) => void) => (
      <Pressable onPress={() => unSelect && unSelect(item)}>
        <View className="flex-row px-sm py-xs alignitems-center bg-background b-1 bordercolor-outline radius-sm mr-xs mt-xs">
          <Text className="size-md color-surface mr-sm">
            {item[props.valueField]}
          </Text>
          <MaterialCommunityIcons
            name="window-close"
            size={16}
            color={iconColor}
          />
        </View>
      </Pressable>
    ),
    [props.labelField, props.valueField],
  );

  return (
    <ThemeContext.Consumer>
      {(theme: Theme) => {
        const selectedTextStyle = buildStyleSheet(
          'size-md color-surface m-smm',
          theme,
          'text',
        );
        const containerStyle = buildStyleSheet(
          'bg-background b-1 bordercolor-outline radius-sm p-sm mt-xs',
          theme,
          'view',
        );
        const inputSearchStyle = buildStyleSheet(
          'size-md color-surface size-md bordercolor-outline radius-sm',
          theme,
          'text',
        );
        return (
          <MultiSelectWrapper
            className={`my-xs ${props.className ?? ''}`}
            containerStyle={containerStyle}
            iconColor={iconColor}
            iconStyle={{ marginRight: 6 }}
            inputSearchStyle={[inputSearchStyle, props.inputSearchStyle]}
            keyboardAvoiding={false}
            placeholderStyle={[selectedTextStyle, props.placeholderStyle]}
            ref={dropdownRef}
            renderItem={props.renderItem ?? renderItem}
            renderSelectedItem={renderSelectedItem}
            selectedTextStyle={[selectedTextStyle, props.selectedTextStyle]}
            style={[{ width: '100%' }, props.style]}
            {...props}
          />
        );
      }}
    </ThemeContext.Consumer>
  );
};
