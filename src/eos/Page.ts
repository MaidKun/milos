import Tease from "./Tease";
import ScriptBlock, { ScriptBlockJson } from "./ScriptBlock";

export type PageJson = ScriptBlockJson;

export default class Page {
  public readonly tease: Tease;
  public readonly id: string;
  public readonly script = new ScriptBlock;

  constructor(tease: Tease, id: string) {
    this.tease = tease;
    this.id = id;
  }
  
  flatten() {
    this.script.flatten(this.tease);
  }

  asJson(): PageJson {
    return this.script.asJson();
  }
}
