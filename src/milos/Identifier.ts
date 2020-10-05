import {Node} from './Milos';

export default class Identifier extends Node {
  public readonly name: string;

  protected child?: Identifier;

  constructor(name: string) {
    super();
    this.name = name;
  }

  appendString(name: string) {
    return new Identifier(this.name + name);
  }

  setChild(child: Identifier) {
    this.child = child;
  }

  hasChild() {
    return !!this.child;
  }

  getChild() {
    if (!this.child) {
      throw new Error('Identifier does not have a child');
    }

    return this.child!;
  }

  asString(): string {
    return this.name + (this.child ? `.${this.child.asString()}` : '');
  }
}