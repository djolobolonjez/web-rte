import { SearchManager } from "../../assets/pkg/editor_wasm";
import { Editor } from "../core/impl/editor";

export class SearchManagerProxy {

  private static manager: SearchManager | null = null;

  public static importManager(): SearchManager {
    if (this.manager == null) {
      this.manager = SearchManager.new(Editor.getInstance().getStringContent());
    }
    return this.manager;
  }
}
