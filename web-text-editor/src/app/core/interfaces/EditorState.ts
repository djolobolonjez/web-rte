export interface IEditorState {

  canLoadDocument(): boolean;

  canSave(): boolean;

  canCreateDocument(): boolean;

  loadDocument(): void;

  saveDocument(): void;

  createDocument(): void;

  getFilesMessage(): string;
}
