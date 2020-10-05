import { Value } from "../milos/Value";
import ScriptBlock from "../eos/ScriptBlock";

export default class ScriptBlockValue extends Value {
  public readonly block: ScriptBlock;

  constructor(block: ScriptBlock) {
    super();
    this.block = block;
  }

  typeName(): string { return "block"; }
  asString(): string { return "<block>"; }
}