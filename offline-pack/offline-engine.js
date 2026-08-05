/**
 * offline-pack/offline-engine.js
 * Orchestrator with full state machine, resumable downloads, and worker file sharing.
 */
import { ModelRegistry } from "./offline-registry.js";
import { OfflineStorage } from "./offline-storage.js";

export const EngineStates = {
  IDLE: "IDLE",
  CHECKING_DEVICE: "CHECKING_DEVICE",
  CHECKING_STORAGE: "CHECKING_STORAGE",
  DOWNLOADING: "DOWNLOADING",
  WAITING_FOR_NETWORK: "WAITING_FOR_NETWORK",
  VERIFYING: "VERIFYING",
  INSTALLING: "INSTALLING",
  READY: "READY",
  REPAIR_NEEDED: "REPAIR_NEEDED",
  FAILED: "FAILED"
};

export class OfflineEngine {
  constructor() {
    this.config = ModelRegistry.getActiveModel();
    this.storage = new OfflineStorage(this.config);
    this.worker = null;
    this.onStatusChange = null;
    this.onProgress = null;
    this.onToken = null;
    this.state = EngineStates.IDLE;
    this.abortController = null;
    this.isDownloading = false;
    this.fileRequests = new Map(); // for worker file requests
    this._workerReady = false;
  }

  transition(newState, detail = "") {
    this.state = newState;
    localStorage.setItem("sneh_offline_state", newState);
    if (this.onStatusChange) this.onStatusChange(newState, detail);
    console.log(`[Offline Engine] ${newState} – ${detail}`);
  }

  async checkHardwareTelemetry() {
    const ram = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    let status = "OPTIMAL", msg = "";
    if (ram < 3) {
      status = "WARNING";
      msg = `Low memory (${ram}GB). Offline AI may be slow.`;
    }
    if (typeof WebAssembly === "undefined") {
      status = "CRITICAL";
      msg = "WebAssembly not supported.";
    }
    return { ram, cores, status, msg };
  }

  async verifyStorageQuota() {
    if (navigator.storage && navigator.storage.estimate) {
      const { quota, usage } = await navigator.storage.estimate();
      const free = quota - usage;
      const required = 250 * 1024 * 1024; // 250MB
      if (free < required) {
        throw new Error(`Insufficient space. Need 250MB, have ${(free/1024/1024).toFixed(1)}MB.`);
      }
    }
  }

  async verifyInstallation() {
    return await this.storage.verifyLocalInstall();
  }

  async checkInstallationHealth() {
    const savedState = localStorage.getItem("sneh_offline_state");
    if (!savedState) {
      this.transition(EngineStates.IDLE);
      return EngineStates.IDLE;
    }
    if (savedState === EngineStates.DOWNLOADING || savedState === EngineStates.WAITING_FOR_NETWORK) {
      const partial = localStorage.getItem("sneh_offline_partial") === "true";
      if (partial) {
        this.transition(EngineStates.WAITING_FOR_NETWORK, "Download paused. Resume when online.");
        return EngineStates.WAITING_FOR_NETWORK;
      }
    }
    const intact = await this.verifyInstallation();
    if (savedState === EngineStates.READY && !intact) {
      this.transition(EngineStates.REPAIR_NEEDED, "Corrupt installation.");
      return EngineStates.REPAIR_NEEDED;
    }
    this.transition(savedState, "Restored state.");
    return savedState;
  }

  // ---- DOWNLOAD WITH RESUME ----
  async installModel() {
    if (this.isDownloading) return;
    this.isDownloading = true;
    this.abortController = new AbortController();

    this.transition(EngineStates.CHECKING_STORAGE, "Checking storage...");
    try {
      await this.verifyStorageQuota();

      // Check if any partial download exists
      const partialFile = localStorage.getItem("sneh_offline_partial_file");
      let startOffset = 0;
      if (partialFile) {
        const size = await this.storage.getFileSize(partialFile);
        if (size > 0) {
          startOffset = size;
          this.transition(EngineStates.DOWNLOADING, `Resuming ${partialFile} from ${startOffset} bytes.`);
        } else {
          localStorage.removeItem("sneh_offline_partial_file");
        }
      }

      const allFiles = this.config.files;
      let downloadedCount = 0;
      const totalBytes = Object.values(this.config.sizes).reduce((a,b) => a+b, 0);
      let cumulativeBytes = 0;

      for (let i = 0; i < allFiles.length; i++) {
        const file = allFiles[i];
        // Check if already fully downloaded
        const exists = await this.storage.fileExistsOnDisk(file);
        if (exists) {
          // verify size
          const sz = await this.storage.getFileSize(file);
          if (sz >= (this.config.sizes[file] || 0)) {
            cumulativeBytes += sz;
            downloadedCount++;
            continue;
          }
        }

        // Partial or new file
        const currentSize = await this.storage.getFileSize(file);
        const expectedSize = this.config.sizes[file] || 0;
        if (currentSize >= expectedSize) {
          cumulativeBytes += currentSize;
          continue;
        }

        const fileUrl = `${this.config.baseUrl}${file}`;
        const headers = {};
        if (currentSize > 0) {
          headers["Range"] = `bytes=${currentSize}-`;
        }
        this.transition(EngineStates.DOWNLOADING, `Downloading ${file} (${Math.round(currentSize/1024/1024)}MB / ${Math.round(expectedSize/1024/1024)}MB)`);

        const response = await fetch(fileUrl, {
          headers,
          signal: this.abortController.signal
        });

        if (!response.ok && response.status !== 206) {
          throw new Error(`HTTP ${response.status} for ${file}`);
        }

        const reader = response.body.getReader();
        const writable = await this.storage.getWritableHandle(file);
        let downloaded = currentSize;

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const obfuscated = this.storage.obfuscateChunk(value);
            await writable.write(obfuscated);
            downloaded += value.byteLength;
            cumulativeBytes += value.byteLength;

            // Save progress
            localStorage.setItem("sneh_offline_partial_file", file);
            localStorage.setItem("sneh_offline_partial", "true");

            const progress = Math.min(100, Math.round((cumulativeBytes / totalBytes) * 100));
            if (this.onProgress) this.onProgress(progress);
          }
          await writable.close();
          localStorage.removeItem("sneh_offline_partial_file");
          localStorage.removeItem("sneh_offline_partial");
          downloadedCount++;
        } catch (writeErr) {
          try { await writable.close(); } catch {}
          if (writeErr.name === "AbortError") {
            this.transition(EngineStates.WAITING_FOR_NETWORK, "Download paused.");
            this.isDownloading = false;
            return;
          }
          throw writeErr;
        }
      }

      // Verification
      this.transition(EngineStates.VERIFYING, "Verifying installation...");
      const valid = await this.verifyInstallation();
      if (!valid) {
        await this.storage.purgeAll();
        throw new Error("Verification failed. Files corrupt.");
      }

      this.isDownloading = false;
      this.transition(EngineStates.READY, "Offline AI ready.");
      localStorage.setItem("sneh_offline_state", EngineStates.READY);
      // notify UI to enable toggle
      document.dispatchEvent(new CustomEvent('sneh:offline-ready'));

    } catch (err) {
      this.isDownloading = false;
      if (err.name === "AbortError") {
        this.transition(EngineStates.WAITING_FOR_NETWORK, "Paused by user.");
      } else {
        this.transition(EngineStates.FAILED, err.message);
        await this.storage.purgeAll();
        localStorage.removeItem("sneh_offline_partial_file");
        localStorage.removeItem("sneh_offline_partial");
      }
      throw err;
    }
  }

  cancelDownload() {
    if (this.isDownloading && this.abortController) {
      this.abortController.abort();
      this.isDownloading = false;
    }
  }

  // ---- WORKER MANAGEMENT ----
  async bootWorker() {
    if (this.worker && this._workerReady) return;

    this.transition(EngineStates.INSTALLING, "Initializing worker...");
    // Worker path: assuming offline-worker.js is in same folder
    this.worker = new Worker(new URL("./offline-worker.js", import.meta.url), { type: "module" });

    // Handle messages from worker
    this.worker.onmessage = async (e) => {
      const data = e.data;
      if (data.type === "REQUEST_FILE") {
        // Worker requests a file
        const fileName = data.fileName;
        const buffer = await this.storage.readFile(fileName);
        if (buffer) {
          // Transfer the ArrayBuffer to worker
          this.worker.postMessage({
            type: "FILE_DATA",
            fileName,
            data: buffer
          }, [buffer]);
        } else {
          this.worker.postMessage({
            type: "FILE_ERROR",
            fileName,
            error: "File not found"
          });
        }
      } else if (data.type === "INITIALIZED") {
        this._workerReady = true;
        this.transition(EngineStates.READY, `Worker active (${data.device})`);
        if (this.onStatusChange) this.onStatusChange(EngineStates.READY, `Worker active`);
      } else if (data.type === "TOKEN") {
        if (this.onToken) this.onToken(data.token);
      } else if (data.type === "COMPLETED") {
        if (this.onToken) this.onToken(null);
      } else if (data.type === "ERROR") {
        this.transition(EngineStates.FAILED, data.text);
      }
    };

    // Initialize worker with config
    this.worker.postMessage({
      type: "INITIALIZE",
      data: {
        modelConfig: this.config,
        useWebGPU: (await this.checkHardwareTelemetry()).gpuAccelerated || false
      }
    });
  }

  // ---- GENERATE ----
  async generate(prompt, config = {}) {
    if (!this._workerReady) {
      await this.bootWorker();
    }
    this.worker.postMessage({
      type: "INFER",
      data: { prompt, config }
    });
  }

  // ---- ROUTE DECISION ----
  async getDynamicRoute() {
    const pref = localStorage.getItem("sneh_preferred_model_route") || "cloud";
    if (pref === "local") {
      const installed = await this.verifyInstallation();
      if (installed) return "OFFLINE_LOCAL";
    }
    if (!navigator.onLine) {
      const installed = await this.verifyInstallation();
      if (installed) return "OFFLINE_LOCAL";
    }
    return "ONLINE_CLOUD";
  }

  // Shutdown
  terminateWorker() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this._workerReady = false;
    }
  }
}