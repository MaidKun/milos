import { Value } from "../milos/Value";
import Page from "../eos/Page";

export default class PageValue extends Value {
  public readonly page: Page;

  constructor(page: Page) {
    super();
    this.page = page;
  }

  typeName(): string { return "page"; }
  asString(): string { return "<page>"; }
}