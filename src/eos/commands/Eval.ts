import Command, { CommandJson } from "../Command";

export interface EvalJson {
  script: string;
}

export class Eval extends Command {
  public script: string;

  constructor(script: string) {
    super();
    this.script = script;
  } 

  static createFromJson(command: EvalJson) {
    return new Eval(command.script);
  }

  asJson(): CommandJson {
    return {eval: {
      script: this.script
    }}
  }
}