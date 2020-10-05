import Command, { CommandJson } from "../Command";

export type SayMode = "auto" | "pause" | "instant;"

export interface SayOptions {
  mode: SayMode;
  align?: string;
}

export interface SayJson {
  label: string;
  mode: SayMode;
  align?: string;
}

export class Say extends Command {
  public message: string;
  public readonly options: SayOptions = {
    mode: "auto"
  };

  constructor(message: string, mode?: string, align?: string) {
    super();
    this.message = message;

    if (mode) {
      this.mode = mode;
    }
    if (align) {
      this.align = align;
    }
  } 

  get align() {
    return this.options.align || 'center';
  }

  set align(align: string) {
    switch (align) {
      case 'left':
      case 'right':
        this.options.align = align;
        break;

      default:
        delete this.options.align;
        break;
    }
  }

  get mode() {
    return this.options.mode;
  }

  set mode(mode: string) {
    switch (mode) {
      case "auto":
      case "autoplay":
      case "pause":
      case "instant":
      case "custom":
        this.options.mode = mode as SayMode;
        break;

      default:
        throw new Error(`Invalid message mode: ${mode}`);
    }
  }

  static createFromJson(command: SayJson) {
    return new Say(command.label, command.mode, command.align || 'center');
  }

  asJson(): CommandJson {
    return {say: {
      label: this.message,
      mode: this.options.mode,
      align: this.options.align
    }}
  }
}