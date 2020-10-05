import Command, {CommandJson, CommandFlattenResult} from "../Command";

export interface DisableJson {
  target: string;
}

export class Disable extends Command {
  public page: string;

  constructor(id: string) {
    super();
    this.page = id;
  }

  asJson(): CommandJson {
    return {disable: {target: this.page}}
  }
}