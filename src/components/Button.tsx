import React from 'react';
import { Pressable } from 'react-native';
import { Text, View } from 'react-native-picasso';
import { useThemeColor } from '@/hooks/useColors';


interface Props {
  className?: string;
  disabled?: boolean;
  leftIcon?: JSX.Element;
  rightIcon?: JSX.Element;
  textClass?: string;
  textStyle?: any;
  title: string;
  uppercase?: boolean;
  onPress?: () => void;
}

const Button: React.FC<Props> = (props: Props) => {
  const { className, disabled, leftIcon, rightIcon, uppercase = true} = props;
  const bgClass = `flex-row alignitems-center justifycontent-center bg-secondary radius-sm py-sm px-sm ${className ?? ''}`;
  const textClass = `color-primary size-md ${props.textClass ?? ''}`;
  const textStyle: any = { lineHeight: 28, ...(props.textStyle ?? {}) };
  const color = useThemeColor('textColors.primary');

  if (disabled) {
    textStyle.color = `${color}61`;
  }

  if (uppercase) {
    textStyle.textTransform = 'uppercase';
    textStyle.fontWeight = 'bold';
  }

  return (
    <Pressable
      disabled={!!props.disabled}
      onPress={() => {
        if (props.onPress && !props.disabled) props.onPress();
      }}
    >
      <View
        className={ bgClass }
        focusable={true}
      >
        { leftIcon }
        <Text
          className={ textClass }
          style={ {...textStyle} }
        >
          { props.title }
        </Text>
        { rightIcon }
      </View>
    </Pressable>
  );
}

export default Button;
