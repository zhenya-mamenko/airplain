import React from 'react';
import { Text, View } from 'react-native-picasso';

interface Props {
  borderColor: string;
  title: string;
};

const Separator: React.FC<Props> = React.memo(({ title, borderColor } : Props) => {
  return (
    <View
      className='flex-row justifycontent-start alignitems-center pt-mdl pb-smm'
    >
      { title !== '' &&
        <View
          className='bg-surfaceVariant pr-sm'
          style={{ position: 'absolute', top: 10, zIndex: 1 }}
        >
          <Text
            className='size-sm color-primaryContainer'
            style={{ opacity: 0.6, fontVariant: ['small-caps'] }}
          >
            { title }
          </Text>
        </View>
      }
      <View style={{
        height: 1, width: '100%',
        borderColor,
        borderWidth: 0.6, borderStyle:'dotted',
        zIndex: 0,
        opacity: 0.5
        }}
      />
    </View>
  );
});

export default Separator;
