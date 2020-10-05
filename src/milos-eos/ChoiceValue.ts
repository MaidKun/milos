import { Value } from "../milos/Value";
import Choice from "../eos/commands/Choice";

export default class ChoiceValue extends Value {
  public readonly choice: Choice;

  constructor(choice: Choice) {
    super();
    this.choice = choice;
  }

  typeName(): string { return "choice"; }
  asString(): string { return "<choice>"; }
}