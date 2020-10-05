import Command, { CommandJson } from "../Command";
import ScriptBlock, { ScriptBlockJson } from "../ScriptBlock";

export interface ChoiceOptionJson {
  label: string;
  commands: ScriptBlockJson;
  color?: string;
  visible?: string;
}

export interface ChoiceJson {
  options: ChoiceOptionJson[];
}

export interface ChoiceOption {
  label: string;
  color?: string;
  visible?: string;
  script: ScriptBlock;
}

export default class Choice extends Command {
  public readonly options: ChoiceOption[] = [];

  add(label: string, color?: string, visible?: string): ScriptBlock {
    const option = {
      label,
      color,
      visible,
      script: new ScriptBlock()
    }
    this.options.push(option);
    return option.script;
  }

  static createFromJson(command: ChoiceJson) {
    const choice = new Choice();
    for (const option of command.options || []) {
      choice.add(option.label).addManyFromJson(option.commands || []);
    }

    return choice;
  }

  asJson(): CommandJson {
    return {
      choice: {
        options: this.options.map(o => ({
          label: o.label,
          color: o.color,
          visible: o.visible,
          commands: o.script.asJson()
        }))
      }
    }
  }
}