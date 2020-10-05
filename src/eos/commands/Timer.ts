import Command, { CommandJson } from "../Command";
import ScriptBlock, { ScriptBlockJson } from "../ScriptBlock";

export type TimerStyle = "hidden" | "secret" | "normal";

export interface TimerOptions {
  style: TimerStyle;
  isAsync: boolean;
}

export interface TimerJson {
  duration: string;
  style: TimerStyle;
  isAsync: boolean;
  commands?: ScriptBlockJson;
}

export default class Timer extends Command {
  public duration: string;
  public readonly options: TimerOptions;
  public readonly after = new ScriptBlock();

  constructor(duration: string, style: string = "normal", async: boolean = false) {
    super();
    this.duration = duration;
    this.options = {
      style: "normal",
      isAsync: async
    }

    this.style = style;
  }

  set style(value: string) {
    switch (value) {
      case "hidden":
      case "secret":
      case "normal":
        this.options.style = value as TimerStyle;
        break;

      default:
        throw new Error(`Unsupported timer style: ${value}`);
    }
  }

  static createFromJson(command: TimerJson) {
    const timer = new Timer(command.duration, command.style, command.isAsync);
    timer.after.addManyFromJson(command.commands || []);
    return timer;
  }

  asJson(): CommandJson {
    return {
      timer: {
        duration: this.duration,
        style: this.options.style,
        isAsync: this.options.isAsync,
        commands: this.after.asJson()
      }
    }
  }
}
