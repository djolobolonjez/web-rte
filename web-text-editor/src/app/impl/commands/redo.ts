import { ICommand } from "../../api/commands/command";
import { IReceiver } from "../../core/interfaces/receiver";
import { UndoRedoManager } from "../UndoRedoManager";

export class Redo implements ICommand {

  private manager: UndoRedoManager;

  public constructor() {
    this.manager = UndoRedoManager.getInstance();
  }

  public attachReceiver(receiver: IReceiver) {}

  public execute(): boolean {
    this.manager.redo();
    return true;
  }

  public canExecute(): boolean {
    return this.manager.isRedoable();
  }
}
