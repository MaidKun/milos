import Command, {CommandJson, CommandFlattenResult} from "../Command";

export class AudioStop extends Command {
  public id: string;

  constructor(id: string) {
    super();
    this.id = id;
  }

  asJson(): CommandJson {
    return {eval: {
      script: `Sound.get(${JSON.stringify(this.id)}).stop()`
    }}
  }
}