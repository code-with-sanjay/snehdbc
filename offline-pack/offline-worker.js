/**
 * offline-pack/offline-worker.js
 * Sandbox worker that uses Transformers.js. Files are fetched via postMessage from main thread.
 */
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@2.17.0';

env.allowLocalModels = true;
env.useCustomCache = true;

// Local file cache (key: fileName, value: ArrayBuffer)
const fileCache = new Map();

// Store pending promises for file requests
const pendingRequests = new Map();

// Listen for file data from main thread
self.onmessage = async function(e) {
  const { type, data } = e.data;
  if (type === "FILE_DATA") {
    const { fileName, data: fileData } = e.data;
    fileCache.set(fileName, fileData);
    // Resolve any pending promise
    if (pendingRequests.has(fileName)) {
      pendingRequests.get(fileName)(fileData);
      pendingRequests.delete(fileName);
    }
  } else if (type === "FILE_ERROR") {
    const { fileName } = e.data;
    if (pendingRequests.has(fileName)) {
      pendingRequests.get(fileName)(null);
      pendingRequests.delete(fileName);
    }
  } else if (type === "INITIALIZE") {
    await initPipeline(data);
  } else if (type === "INFER") {
    await runInference(data);
  }
};

async function requestFile(fileName) {
  if (fileCache.has(fileName)) return fileCache.get(fileName);
  // Send request to main thread
  self.postMessage({ type: "REQUEST_FILE", fileName });
  // Wait for response
  return new Promise((resolve) => {
    pendingRequests.set(fileName, resolve);
  });
}

// Custom cache that uses the file request mechanism
class WorkerCustomCache {
  async match(request) {
    let url = typeof request === "string" ? request : request.url;
    // Extract file name from URL
    const parts = url.split('/');
    let fileName = parts[parts.length - 1];
    // Sometimes the path includes 'onnx/model.onnx' etc.
    // We'll pass the full path relative to model root.
    // Let's get the path after the model ID.
    const modelId = "HuggingFaceTB/SmolLM-135M-Instruct";
    const idx = url.indexOf(modelId);
    if (idx !== -1) {
      const suffix = url.substring(idx + modelId.length + 1); // +1 for slash
      fileName = suffix.split('?')[0];
    } else {
      // fallback: use last segment
      fileName = url.split('/').pop().split('?')[0];
    }
    // Use registry to map request to stored file
    const storedFile = self.modelConfig.resolveRequestPath(fileName);
    if (!storedFile) return null;

    const buffer = await requestFile(storedFile);
    if (!buffer) return null;
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": fileName.endsWith('.json') ? 'application/json' : 'application/octet-stream',
        "Content-Length": buffer.byteLength
      }
    });
  }

  async put() { /* no-op */ }
}

let modelPipeline = null;
let selfModelConfig = null;

async function initPipeline(data) {
  selfModelConfig = data.modelConfig;
  env.customCache = new WorkerCustomCache();

  try {
    if (data.useWebGPU) {
      self.postMessage({ type: "PROGRESS", text: "Trying WebGPU..." });
      modelPipeline = await pipeline(
        selfModelConfig.pipelineType,
        selfModelConfig.hfIdentifier,
        { device: "webgpu" }
      );
      self.postMessage({ type: "INITIALIZED", device: "webgpu" });
      return;
    }
  } catch (e) {
    console.warn("[Worker] WebGPU failed, falling back to WASM.", e);
    self.postMessage({ type: "PROGRESS", text: "Using WebAssembly fallback." });
  }

  // WASM fallback
  modelPipeline = await pipeline(
    selfModelConfig.pipelineType,
    selfModelConfig.hfIdentifier,
    { device: "wasm" }
  );
  self.postMessage({ type: "INITIALIZED", device: "wasm" });
}

async function runInference(data) {
  if (!modelPipeline) {
    self.postMessage({ type: "ERROR", text: "Pipeline not ready." });
    return;
  }
  try {
    const result = await modelPipeline(data.prompt, {
      max_new_tokens: data.config.maxTokens || 128,
      temperature: data.config.temperature || 0.6,
      top_k: 40,
      do_sample: true,
      callback_function: (beams) => {
        const token = beams[0].output_token_text || "";
        if (token) self.postMessage({ type: "TOKEN", token });
      }
    });
    self.postMessage({ type: "COMPLETED" });
  } catch (err) {
    self.postMessage({ type: "ERROR", text: err.message });
  }
}