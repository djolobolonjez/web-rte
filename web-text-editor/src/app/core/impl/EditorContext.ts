import { IEditorState } from "../interfaces/EditorState";
import { Editor } from "./editor";

export class EditorContext {

  private state: IEditorState;

  private editor: Editor;

  constructor() {
    this.editor = Editor.getInstance();

    if (sessionStorage.getItem('username')) {

    }
    else {

    }
  }
}
