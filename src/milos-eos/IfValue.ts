import { Value } from "../milos/Value";
import If from "../eos/commands/If";

export default class IfValue extends Value {
  public readonly value: If;

  constructor(value: If) {
    super();
    this.value = value;
  }

  typeName(): string { return "if"; }
  asString(): string { return "<if>"; }
}