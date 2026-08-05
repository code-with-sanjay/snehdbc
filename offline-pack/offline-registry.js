/**
 * offline-pack/offline-registry.js
 * Central registry with proper file mapping for Transformers.js.
 */
export const ModelRegistry = {
  activeModelId: "smollm-135m-instruct",

  models: {
    "smollm-135m-instruct": {
      name: "SmolLM-135M Instruct",
      // Use the exact HF commit that contains the ONNX files
      baseUrl: "https://huggingface.co/HuggingFaceTB/SmolLM-135M-Instruct/resolve/e6349440b2d852975ecafdfa9f2c8d4ada788a18/",
      // Files as they exist on the HF repo (must match exactly)
      files: [
        "config.json",
        "generation_config.json",
        "merges.txt",
        "special_tokens_map.json",
        "tokenizer.json",
        "tokenizer_config.json",
        "vocab.json",
        "onnx/model_q4f16.onnx"
      ],
      // Map of remote file -> local storage name (for Transformers.js requests)
      // Transformers.js may request 'onnx/model.onnx' instead of 'onnx/model_q4f16.onnx'
      // We map it to the actual file.
      requestMap: {
        "onnx/model.onnx": "onnx/model_q4f16.onnx",   // alias
        "model.onnx": "onnx/model_q4f16.onnx"         // fallback
      },
      // Exact uncompressed sizes (for verification)
      sizes: {
        "config.json": 723,
        "generation_config.json": 250,
        "merges.txt": 466159,
        "special_tokens_map.json": 565,
        "tokenizer.json": 2102140,
        "tokenizer_config.json": 3592,
        "vocab.json": 801211,
        "onnx/model_q4f16.onnx": 117109240
      },
      weightsPath: "onnx/model_q4f16.onnx",
      hfIdentifier: "HuggingFaceTB/SmolLM-135M-Instruct",
      pipelineType: "text-generation",
      // Minimum size for the weights file (100MB)
      minWeightsSize: 100 * 1024 * 1024
    }
  },

  getActiveModel() {
    const model = this.models[this.activeModelId];
    if (!model) throw new Error(`Model [${this.activeModelId}] not registered.`);
    return {
      activeModelId: this.activeModelId,
      ...model,
      // Add a method to resolve a request path to a stored file
      resolveRequestPath(requestPath) {
        // Remove query/hash
        const clean = requestPath.split('?')[0].split('#')[0];
        // If it's in the map, return the mapped file; else return as is if it exists in files
        if (this.requestMap && this.requestMap[clean]) {
          return this.requestMap[clean];
        }
        // Check if the clean path is one of our stored files (relative)
        const relative = clean.replace(/^\//, '');
        if (this.files.includes(relative)) return relative;
        // If it ends with a known file name, try to match
        for (const file of this.files) {
          if (clean.endsWith(file)) return file;
        }
        return null; // not found
      }
    };
  }
};