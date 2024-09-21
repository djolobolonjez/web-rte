import { IUndoableCommand } from "../../api/commands/undoable";
import { Editor } from "../../core/impl/editor";
import { IReceiver } from "../../core/interfaces/receiver";
import { TextRange } from "../../types/comment.box";
import { UndoRedoManager } from "../UndoRedoManager";

export class InlineStyle implements IUndoableCommand {

  private editor: Editor;

  private memento: TextRange | undefined;

  private tag: string;

  private undoManager: UndoRedoManager;

  public constructor(tag: string) {
    this.editor = Editor.getInstance();
    this.tag = tag;
    this.undoManager = UndoRedoManager.getInstance();
  }

  private isValidTag(): boolean {
    const allowedTags: Array<string> = ['bold', 'italic', 'underline'];
    return allowedTags.includes(this.tag);
  }

  public attachReceiver(receiver: IReceiver) {}

  public canExecute(): boolean {
    return this.isValidTag();
  }

  public execute(): boolean {

    if (!this.canExecute())
      return false;

    if (document.queryCommandState(this.tag)) {
      this.undo();
      return true;
    }

    let selectedRange = this.editor.getPreviousRange();
    if (selectedRange.end > selectedRange.start) {
      this.memento = selectedRange;
    }

    document.execCommand(this.tag, false, '');

    this.undoManager.add(this);
    this.editor.onCommandSuccess();

    return true;
  }

  private toggleStyle(): void {
    if (this.memento) {
      this.editor.selectRange(this.memento);
    }

    document.execCommand(this.tag, false, '');
  }

  public undo(): void {
    this.toggleStyle();
  }

  public redo(): void {
    this.toggleStyle();
  }
}
