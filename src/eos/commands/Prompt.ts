import Command, { CommandJson } from "../Command";

export interface PromptJson {
  variable: string;
}

export class Prompt extends Command {
  public variable: string;

  constructor(variable: string) {
    super();
    this.variable = variable;
  }

  asJson(): CommandJson {
    return {prompt: {
      variable: this.variable
    }}
  }
}