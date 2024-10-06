import { SearchManager } from "../../../assets/pkg/editor_wasm";
import { IUndoableCommand } from "../../api/commands/undoable";
import { Editor } from "../../core/impl/editor";
import { IReceiver } from "../../core/interfaces/receiver";
import { TextRange } from "../../types/comment.box";
import { CommentContainer } from "../../types/CommentContainer";
import { CommentHandler } from "../CommentHandler";
import { SearchManagerProxy } from "../SearchManagerProxy";
import { UndoRedoManager } from "../UndoRedoManager";

export class ReplaceAll implements IUndoableCommand {

  private editor: Editor;

  private searchManager: SearchManager;

  private undoManager: UndoRedoManager;

  private commentHandler: CommentHandler;

  private old: string;

  private replacement: string;

  private commentsOldPositions: Map<CommentContainer, TextRange>;

  private replacedIndices: number[];

  public constructor(old: string, replacement: string) {
    this.searchManager = SearchManagerProxy.importManager();
    this.editor = Editor.getInstance();
    this.undoManager = UndoRedoManager.getInstance();
    this.commentHandler = CommentHandler.getInstance();
    this.old = old;
    this.replacement = replacement;
    this.replacedIndices = [];
  }

  public canExecute(): boolean {
    return true;
  }

  public replace() {
    this.replacedIndices = Array.from(this.searchManager.find_all(this.old));

    this.searchManager.set_content(this.editor.getRawContent());

    const updatedContent = this.searchManager.replace_all(this.old, this.replacement);
    this.editor.setRawContent(updatedContent);
  }

  public execute(): boolean {
    this.shiftComments();
    this.replace();
    this.undoManager.add(this);
    this.editor.setLastCommand(this);

    return true;
  }

  public undo(): void {
    this.commentsOldPositions.forEach((value, key) => {
      key.setStartIndex(value.start);
      key.setEndIndex(value.end);
    });

    this.commentHandler.printComments();
    this.replacedIndices.forEach(index => {
      this.editor.replaceSelectedContent({start: index, end: index + this.replacement.length}, this.old);
    });

    this.searchManager.set_content(this.editor.getRawContent());
  }

  public redo(): void {
    this.shiftComments();
    this.replace();
    this.commentHandler.printComments();
  }

  private shiftComments(): void {
    this.searchManager.set_content(this.editor.getStringContent());

    const shiftAmount = this.replacement.length - this.old.length;
    let index = this.searchManager.find_next(this.old);
    const start = index, len = this.old.length;

    this.commentsOldPositions = this.commentHandler.shiftComments(shiftAmount, start, start + len);
    let i = 1;

    while ((index = this.searchManager.find_next(this.old)) != start) {
      index += (i * shiftAmount);
      i += 1;
      this.commentHandler.shiftComments(shiftAmount, index, index + len);
    }

    this.searchManager.clear();
  }

  public attachReceiver(receiver: IReceiver) {}
}
