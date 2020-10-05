import { Expression } from "./Expression";
import Identifier from "./Identifier";
import {Node} from "./Milos";

export class Parameter extends Node {
  public readonly value: Expression;
  public readonly name?: Identifier;

  constructor(value: Expression, name?: Identifier) {
    super();

    this.value = value;
    this.name = name;
  }
}