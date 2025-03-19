import Svg, { Path } from 'react-native-svg';


export const SvgArrow = (props: any) => (
  <Svg
    viewBox='0 0 48 24'
    {...props}
  >
    <Path
      d='M4 12h40m0 0-4-4m4 4-4 4'
      stroke={ props.color }
      strokeWidth={1.3}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </Svg>
);

export const SvgArrowLong = (props: any) => (
  <Svg
    viewBox='0 0 60 24'
    {...props}
  >
    <Path
      d='M4 12h52m0 0-4-4m4 4-4 4'
      stroke={ props.color }
      strokeWidth={1.3}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </Svg>
);

export const SvgCross = (props: any) => (
  <Svg
    viewBox='0 0 24 24'
    {...props}
  >
    <Path
      d='m16 8-8 8m0-8 8 8'
      stroke={ props.color }
      strokeWidth={1.3}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </Svg>
);

export const SvgLine = (props: any) => (
  <Svg
    viewBox='0 0 48 24'
    {...props}
  >
    <Path
      d='M4 12h40'
      stroke={ props.color }
      strokeWidth={1.3}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </Svg>
);

export const SvgPlane = (props: any) => (
  <Svg
    viewBox='0 0 24 24' {...props}
  >
    <Path
      d='M11.92 19.58 15.84 14H20a2 2 0 0 0 0-4h-4.16l-3.92-5.58a1 1 0 0 0-.81-.42h-.93a1 1 0 0 0-1 1.16L10 10H6.38l-1.7-1.71A1.05 1.05 0 0 0 4 8H3a1 1 0 0 0-.89 1.45L3.38 12l-1.27 2.55A1 1 0 0 0 3 16h1a1.05 1.05 0 0 0 .71-.29L6.38 14H10l-.81 4.84a1 1 0 0 0 1 1.16h.93a1 1 0 0 0 .8-.42'
      fill={ props.color }
    />
  </Svg>
);
