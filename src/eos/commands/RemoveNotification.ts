import Command, {CommandJson, CommandFlattenResult} from "../Command";
import ScriptBlock, { ScriptBlockJson } from "../ScriptBlock";

export interface RemoveNotificationJson {
  id: string;
}

export class RemoveNotification extends Command {
  public id: string;

  constructor(id: string) {
    super();

    this.id = id;
  }

  asJson(): CommandJson {
    const result: RemoveNotificationJson = {
      id: this.id,
    };

    return {"notification.remove": result};
  }
}