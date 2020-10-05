import {Statement} from "./Statement";
import {Node} from "./Milos";

export default class StatementList extends Node {
  public readonly statements: Statement[];

  constructor(statements: Statement[]) {
    super()
    this.statements = statements;
  }

  prepend(other: Statement) {
    this.statements.unshift(other);
  }
}
