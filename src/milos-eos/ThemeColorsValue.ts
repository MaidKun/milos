import { Value } from "../milos/Value";

export interface ThemeColor {
  normal: string;
  dark: string;
}

export type ThemeColorMode = 'normal' | 'dark';

export default class ThemeColorsValue extends Value {
  private colors: {[id: string]: ThemeColor} = {}

  typeName(): string {
    return "maze_themecolors";
  }

  asString(): string {
    return "<ThemeColors>";
  }

  has(id: string) {
    return this.colors.hasOwnProperty(id);
  }

  get(id: string) {
    if (this.colors.hasOwnProperty(id)) {
      return this.colors[id];
    }

    console.error(`Error: Unknown theme color: ${id}`);
    return {
      normal: '#FFFFFF',
      dark: '#FFFFFF'
    }
  }

  set(id: string, normal: string, dark: string) {
    this.colors[id] = {normal, dark};
  }
}