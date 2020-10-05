import Command, { CommandJson } from "../Command";
import ScriptBlock, { ScriptBlockJson } from "../ScriptBlock";

export interface IfJson {
  condition: string;
  commands: ScriptBlockJson;
  elseCommands: ScriptBlockJson;
}

export default class If extends Command {
  public condition: string;
  public readonly commands: ScriptBlock;
  public readonly otherwise: ScriptBlock;

  constructor(condition: string) {
    super();

    this.condition = condition;
    this.commands = new ScriptBlock();
    this.otherwise = new ScriptBlock();
  }
  
  static createFromJson(command: IfJson) {
    const result = new If(command.condition);
    result.commands.addManyFromJson(command.commands || []);
    result.otherwise.addManyFromJson(command.elseCommands || []);
    return result;
  }

  asJson(): CommandJson {
    return {
      if: {
        condition: this.condition,
        commands: this.commands.asJson(),
        elseCommands: this.otherwise.asJson()
      }
    }
  }
}