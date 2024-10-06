import { IUndoableCommand } from "../api/commands/undoable";

export class UndoRedoManager {

  private static instance: UndoRedoManager;

  private maxSize: number;

  private undoStack: Array<IUndoableCommand>;

  private redoStack: Array<IUndoableCommand>;

  private constructor() {
    this.maxSize = 30;
    this.undoStack = [];
    this.redoStack = [];
  }

  public lastCommand(): IUndoableCommand {
    return this.undoStack.length != 0 ? this.undoStack[this.undoStack.length - 1] : null;
  }

  public isUndoable(): boolean {
    return this.undoStack.length != 0;
  }

  public isRedoable(): boolean {
    return this.redoStack.length != 0;
  }

  public static getInstance(): UndoRedoManager {
    if (this.instance == null) {
      this.instance = new UndoRedoManager();
    }
    return this.instance;
  }

  public add(undoableCommand: IUndoableCommand) {
    if (this.undoStack.length == this.maxSize) {
      this.undoStack.shift();
    }

    this.undoStack.push(undoableCommand);
    this.redoStack.length = 0; // clear redo stack
  }

  public undo() {
    const undoableCommand = this.undoStack.pop();

    if (undoableCommand) {
      undoableCommand.undo();
      this.redoStack.push(undoableCommand);
    }
  }

  public redo() {
    const undoableCommand = this.redoStack.pop();

    if (undoableCommand) {
      undoableCommand.redo();
      this.undoStack.push(undoableCommand);
    }
  }

}
