import { IEditorState } from "../interfaces/EditorState";

export class GuestState implements IEditorState {
  canLoadDocument(): boolean {
    return false;
  }
  canSave(): boolean {
    return false;
  }
  canCreateDocument(): boolean {
    return false;
  }
  loadDocument(): void {}

  saveDocument(): void {}

  createDocument(): void {}

  getFilesMessage(): string {
    return "Login to get started";
  }

}
