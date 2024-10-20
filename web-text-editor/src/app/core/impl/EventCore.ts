import { Renderer2 } from "@angular/core";
import { Editor } from "./editor";

export class EventCore {
  private static initialized: boolean = false;

  public static initializeCoreEvents() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    Editor.getInstance().listenDOMEvents();
  }
}
