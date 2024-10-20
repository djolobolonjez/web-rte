import { ICommand } from "../../api/commands/command";
import { IReceiver } from "../../core/interfaces/receiver";
import { UndoRedoManager } from "../UndoRedoManager";

export class Undo implements ICommand {

  private manager: UndoRedoManager;

  public constructor() {
    this.manager = UndoRedoManager.getInstance();
  }
  getConstructorName(): string {
    return "Undo";
  }

  public attachReceiver(receiver: IReceiver) {}

  public execute(): boolean {
    this.manager.undo();
    return true;
  }

  public canExecute(): boolean {
    return this.manager.isUndoable();
  }
}
