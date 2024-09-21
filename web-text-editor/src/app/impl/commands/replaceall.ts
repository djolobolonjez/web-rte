import { SearchManager } from "../../../assets/pkg/editor_wasm";
import { IUndoableCommand } from "../../api/commands/undoable";
import { Editor } from "../../core/impl/editor";
import { IReceiver } from "../../core/interfaces/receiver";
import { SearchManagerProxy } from "../SearchManagerProxy";
import { UndoRedoManager } from "../UndoRedoManager";

export class ReplaceAll implements IUndoableCommand {

  private editor: Editor;

  private searchManager: SearchManager;

  private undoManager: UndoRedoManager;

  private old: string;

  private replacement: string;

  public constructor(old: string, replacement: string) {
    this.searchManager = SearchManagerProxy.importManager();
    this.editor = Editor.getInstance();
    this.undoManager = UndoRedoManager.getInstance();
    this.old = old;
    this.replacement = replacement;
  }

  public canExecute(): boolean {
    return true;
  }

  public replace() {
    this.searchManager.set_content(this.editor.getRawContent());

    const updatedContent = this.searchManager.replace_all(this.old, this.replacement);
    this.editor.updateContent(updatedContent);
  }

  public execute(): boolean {
    this.replace();
    this.undoManager.add(this);
    this.editor.setLastCommand(this);

    return true;
  }

  public swapContent() {
    [this.old, this.replacement] = [this.replacement, this.old];
    this.replace();
  }

  public undo(): void {
    this.swapContent();
  }

  public redo(): void {
    this.swapContent();
  }

  public attachReceiver(receiver: IReceiver) {}
}
