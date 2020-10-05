import Page, { PageJson } from "./Page";

export interface TeaseModulesJson {
  notification?: {};
  storage?: {};
  audio?: {};
}

export interface TeaseFile {
  id: number;
  hash: string;
  size: number;
  type: string;
  width: number;
  height: number;
}

export interface TeaseJson {
  pages: {[id: string]: PageJson};
  init: string;
  galleries: {};
  files: {[id: string]: TeaseFile};
  modules: TeaseModulesJson;
  editor: {
    recentImages: []
  };
}

export default class Tease {
  public readonly pages: {[id: string]: Page} = {};
  public readonly files: {[id: string]: TeaseFile} = {};
  public readonly libJs: string[] = [];
  public readonly init: string[] = [];

  page(id: string) {
    if (!this.pages.hasOwnProperty(id)) {
      this.pages[id] = new Page(this, id);
    }

    return this.pages[id];
  }

  prependInitScript(row: string) {
    this.init.unshift(row);
  }

  appendInitScript(row: string) {
    this.init.push(row);
  }

  appendLibScript(row: string) {
    this.libJs.push(row);
  }

  flatten() {
    for (let id of Object.keys(this.pages)) {
      this.pages[id].flatten();
    }
  }

  static createFromJson(json: TeaseJson): Tease {
    const tease = new Tease();

    for (const pageId of Object.keys(json.pages || {})) {
      const page = tease.page(pageId);
      page.script.addManyFromJson(json.pages[pageId]);
    }

    return tease;
  }

  asJson(): TeaseJson {
    const pages: {[id: string]: PageJson} = {};

    for (const id of Object.keys(this.pages)) {
      pages[id] = this.pages[id].asJson();
    }

    return {
      pages: pages,
      init: this.clearJs(this.libJs.concat(this.init).join("\n")),
      files: this.files,
      modules: { 
        audio: {},
        storage: {},
        notification: {}
      },
      galleries: {},
      editor: {
        recentImages: []
      }
    }
  }

  private clearJs(text: string): string {
    //return text.replace(/(\n|\s)+/g, ' ').replace(/;\s+/g, ';');
    return text;
  }
}
