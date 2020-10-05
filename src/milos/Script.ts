import StatementList from "./StatementList";

export default class Script {
  public readonly root: StatementList;
  public readonly fileName: string;

  constructor(root: StatementList, fileName: string) {
    this.root = root;
    this.fileName = fileName;
  }
}