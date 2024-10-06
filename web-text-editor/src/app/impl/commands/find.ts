import { Editor } from "../../core/impl/editor";
import { IReceiver } from "../../core/interfaces/receiver";
import { ICommand } from "../../api/commands/command";
import { SearchManager } from "../../../assets/pkg/editor_wasm";
import { SearchManagerProxy } from "../SearchManagerProxy";
import { CommentHandler } from "../CommentHandler";

export class Find implements ICommand {

  private editor: Editor;

  private searchManager: SearchManager

  private searchTerm: string;

  private foundIndex: number;

  public constructor(searchTerm: string) {
    this.editor = Editor.getInstance();
    this.searchManager = SearchManagerProxy.importManager();
    this.searchTerm = searchTerm;
  }

  public canExecute(): boolean {
    return true;
  }

  public execute(): boolean {
    this.searchManager.set_content(this.editor.getStringContent());

    this.foundIndex = this.searchManager.find_next(this.searchTerm);

    if (this.foundIndex == null || !this.isValidSearch()) {
      return false;
    }

    this.editor.selectRange(
      {start: this.foundIndex, end: this.foundIndex + this.searchTerm.length}
    );

    this.editor.setLastCommand(this);
    return true;
  }

  public attachReceiver(receiver: IReceiver) {}

  public getFoundIndex(): number {
    return this.foundIndex;
  }

  private isValidSearch(): boolean {
    const textRange = {start: this.foundIndex, end: this.foundIndex + this.searchTerm.length};
    const comments = CommentHandler.getInstance().getOverlappingComments(textRange);

    if (comments.length > 1) {
      return false;
    }

    if (comments.length == 0) {
      return true;
    }
    const comm = comments[0];

    return textRange.start >= comm.getStartIndex() && textRange.end <= comm.getEndIndex();
  }

  public getSearchTerm(): string {
    return this.searchTerm;
  }
}
