export async function LoadWasm() {
  try {
    const wasmModule = await import('../../../assets/pkg/editor_wasm.js');

    // Initialize the Wasm module by loading the .wasm file
    const wasm = await wasmModule.default({
      module_or_path: 'assets/pkg/editor_wasm_bg.wasm'
    });

  } catch (err) {
    throw new Error("Failed to load Wasm module");
  }
}
