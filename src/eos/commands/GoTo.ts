import Command, {CommandJson, CommandFlattenResult} from "../Command";
import Tease from "../Tease";

export interface GoToJson {
  target: string;
}

export class GoTo extends Command {
  public page: string;

  constructor(id: string) {
    super();
    this.page = id;
  }

  flatten(tease: Tease): CommandFlattenResult {
    return {stopPage: true};
  }
  
  static createFromJson(command: GoToJson) {
    return new GoTo(command.target);
  }

  asJson(): CommandJson {
    return {goto: {target: this.page}}
  }
}