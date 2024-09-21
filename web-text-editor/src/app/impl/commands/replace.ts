import { SearchManager } from "../../../assets/pkg/editor_wasm";
import { IUndoableCommand } from "../../api/commands/undoable";
import { Editor } from "../../core/impl/editor";
import { IReceiver } from "../../core/interfaces/receiver";
import { SearchManagerProxy } from "../SearchManagerProxy";
import { UndoRedoManager } from "../UndoRedoManager";
import { Find } from "./find";

export class Replace implements IUndoableCommand {
  private editor: Editor;

  private searchManager: SearchManager;

  private undoManager: UndoRedoManager;

  private old: string;

  private replacement: string;

  private startIndex: number;

  public constructor(old: string, replacement: string) {
    this.searchManager = SearchManagerProxy.importManager();
    this.editor = Editor.getInstance();
    this.undoManager = UndoRedoManager.getInstance();
    this.old = old;
    this.replacement = replacement;
  }

  private replaceTerm(searchTerm: string, replacementTerm: string): boolean {
    const lastCommand = this.editor.getLastCommand();
    if (lastCommand && lastCommand instanceof Find) {
      const findCommand = lastCommand as Find;
      if (searchTerm != findCommand.getSearchTerm()) {
        this.editor.setLastCommand(null);
        return false;
      }
      this.startIndex = findCommand.getFoundIndex();
    }
    else {
      const findCommand = new Find(searchTerm);
      findCommand.execute();
      return false;
    }

    const shiftAmount = replacementTerm.length - searchTerm.length;
    this.searchManager.shift_after_index(this.startIndex, shiftAmount, shiftAmount < 0);
    this.editor.replaceSelectedContent({start: this.startIndex, end: this.startIndex + searchTerm.length}, replacementTerm);
    return true;
  }


  public undo(): void {
    this.editor.replaceSelectedContent({start: this.startIndex, end: this.startIndex + this.replacement.length}, this.old);
    this.searchManager.insert_in_order(this.startIndex);
  }

  public redo(): void {
    this.editor.replaceSelectedContent({start: this.startIndex, end: this.startIndex + this.old.length}, this.replacement);
    this.searchManager.remove_element(this.startIndex);
  }

  public execute(): boolean {
    if (this.replacement.length == 0 || this.replacement == this.old) {
      return false;
    }

    if (!this.replaceTerm(this.old, this.replacement)) {
      return false;
    }
    this.editor.setLastCommand(this);
    this.searchManager.remove_last();

    this.undoManager.add(this);

    return true;
  }

  public canExecute(): boolean {
    return true;
  }

  public attachReceiver(receiver: IReceiver) {}
}
