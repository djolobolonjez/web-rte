import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
//import { greet } from '../assets/pkg/editor_wasm';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'web-text-editor';

  async ngOnInit() {
   /* try {
      const wasmModule = await import('../assets/pkg/editor_wasm.js');
      
      // Initialize the Wasm module by loading the .wasm file
      const wasm = await wasmModule.default({
        module_or_path: 'assets/pkg/editor_wasm_bg.wasm'
      });
      
      // Now, call the Rust function 'greet' exposed via wasm-bindgen
      // Expected output: "Hello, Angular!"
    } catch (err) {
      console.error("Failed to load Wasm module", err);
    }*/
  }
}
