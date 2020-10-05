import Command, { CommandJson, CommandFlattenResult } from "../Command";
import Tease from "../Tease";

export class Label extends Command {
  public name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }
  
  flatten(tease: Tease): CommandFlattenResult | false {
    const newPage = tease.page(this.name);
    newPage.script.clear();
    return {newPage, removeSelf: true};
  }

  asJson(): CommandJson {
    throw new Error('Labels can not be converted to EOS script');
  }
}