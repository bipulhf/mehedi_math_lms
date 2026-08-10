import type { JSX } from "react";
import { Circle, Path, Rect, Svg } from "react-native-svg";

import { colors } from "@/src/theme/tokens";

const SIZE = 24;
const STROKE = 1.8;

type IconProps = {
  focused: boolean;
};

function strokeColor(focused: boolean): string {
  return focused ? colors.ink : colors.muted;
}

export function CatalogIcon({ focused }: IconProps): JSX.Element {
  return (
    <Svg height={SIZE} viewBox="0 0 24 24" width={SIZE}>
      <Rect
        fill="none"
        height={7}
        rx={1.5}
        stroke={strokeColor(focused)}
        strokeWidth={STROKE}
        width={7}
        x={3}
        y={3}
      />
      <Rect
        fill="none"
        height={7}
        rx={1.5}
        stroke={strokeColor(focused)}
        strokeWidth={STROKE}
        width={7}
        x={14}
        y={3}
      />
      <Rect
        fill="none"
        height={7}
        rx={1.5}
        stroke={strokeColor(focused)}
        strokeWidth={STROKE}
        width={7}
        x={3}
        y={14}
      />
      <Rect
        fill="none"
        height={7}
        rx={1.5}
        stroke={strokeColor(focused)}
        strokeWidth={STROKE}
        width={7}
        x={14}
        y={14}
      />
    </Svg>
  );
}

export function LearningIcon({ focused }: IconProps): JSX.Element {
  return (
    <Svg height={SIZE} viewBox="0 0 24 24" width={SIZE}>
      <Circle
        cx={12}
        cy={12}
        fill="none"
        r={9}
        stroke={strokeColor(focused)}
        strokeWidth={STROKE}
      />
      <Path
        d="M10 8.5v7l6-3.5z"
        fill={strokeColor(focused)}
        stroke={strokeColor(focused)}
        strokeLinejoin="round"
        strokeWidth={1.2}
      />
    </Svg>
  );
}

export function MessagesIcon({ focused }: IconProps): JSX.Element {
  return (
    <Svg height={SIZE} viewBox="0 0 24 24" width={SIZE}>
      <Path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
        fill="none"
        stroke={strokeColor(focused)}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={STROKE}
      />
    </Svg>
  );
}

export function ProfileIcon({ focused }: IconProps): JSX.Element {
  return (
    <Svg height={SIZE} viewBox="0 0 24 24" width={SIZE}>
      <Path
        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
        fill="none"
        stroke={strokeColor(focused)}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={STROKE}
      />
      <Circle
        cx={12}
        cy={7}
        fill="none"
        r={4}
        stroke={strokeColor(focused)}
        strokeLinecap="round"
        strokeWidth={STROKE}
      />
    </Svg>
  );
}
