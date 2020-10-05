import { Value } from "../milos/Value";
import Tease from "../eos/Tease";

export default class TeaseValue extends Value {
  public readonly tease: Tease;

  constructor(tease: Tease) {
    super();
    this.tease = tease;
  }

  typeName(): string { return "tease"; }
  asString(): string { return "<tease>"; }
}
