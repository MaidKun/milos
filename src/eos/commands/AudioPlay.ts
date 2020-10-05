import Command, {CommandJson, CommandFlattenResult} from "../Command";

export interface AudioPlayJson {
  id: string;
  locator: string;
  loops: number;
}

export class AudioPlay extends Command {
  public id: string;
  public locator: string;
  public loops: number;

  constructor(id: string, locator: string, loops: number=0) {
    super();
    this.id = id;
    this.locator = locator;
    this.loops = loops;
  }

  asJson(): CommandJson {
    return {'audio.play': {
      id: this.id,
      locator: this.locator,
      loops: this.loops
    }}
  }
}