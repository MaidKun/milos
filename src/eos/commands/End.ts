import Command, {CommandJson, CommandFlattenResult} from "../Command";
import Tease from "../Tease";

export interface EndJson {
}

export class End extends Command {
  asJson(): CommandJson {
    return {end: {}}
  }

  flatten(tease: Tease): CommandFlattenResult | false {
    return {stopPage: true};
  }
}