import Command, { CommandJson } from "../Command";

export interface ImageJson {
  locator: string;
}

export class Image extends Command {
  public locator: string;

  constructor(locator: string) {
    super();
    this.locator = locator;
  }

  static fromFile(fileName: string): Image {
    return new Image(`file:${fileName}`);
  }

  static createFromJson(command: ImageJson) {
    return new Image(command.locator);
  }

  asJson(): CommandJson {
    return {image: {
      locator: this.locator
    }}
  }
}