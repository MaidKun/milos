import Command, {CommandJson, CommandFlattenResult} from "../Command";

export interface EnableJson {
  target: string;
}

export class Enable extends Command {
  public page: string;

  constructor(id: string) {
    super();
    this.page = id;
  }

  asJson(): CommandJson {
    return {enable: {target: this.page}}
  }
}