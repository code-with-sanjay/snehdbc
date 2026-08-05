/**
 * offline-pack/offline-storage.js
 * High-performance storage using OPFS with fallback to IndexedDB.
 * Supports resumable writes and reading for workers.
 */
export class OfflineStorage {
  constructor(modelConfig) {
    this.config = modelConfig;
    this.obfuscationByte = 0x6E;
    this.useOPFS = true;
    this.db = null;
    this.dbName = 'sneh_offline_db';
    this.storeName = 'model_files';
    this._initDB();
  }

  async _initDB() {
    // Try OPFS first; if fails, use IndexedDB
    try {
      // Check if OPFS is supported
      if (!navigator.storage || !navigator.storage.getDirectory) {
        throw new Error('OPFS not supported');
      }
      await navigator.storage.getDirectory();
      this.useOPFS = true;
    } catch (e) {
      console.warn('[OfflineStorage] OPFS unavailable, falling back to IndexedDB.');
      this.useOPFS = false;
      await this._initIndexedDB();
    }
  }

  async _initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (ev) => {
        const db = ev.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
      request.onsuccess = (ev) => {
        this.db = ev.target.result;
        resolve();
      };
      request.onerror = (ev) => reject(ev.target.error);
    });
  }

  getSafeFileName(file) {
    return `${this.config.activeModelId || "smollm"}_${file.replace(/\//g, "_")}`;
  }

  async getWritableHandle(fileName) {
    if (this.useOPFS) {
      const root = await navigator.storage.getDirectory();
      const safeName = this.getSafeFileName(fileName);
      const fileHandle = await root.getFileHandle(safeName, { create: true });
      return await fileHandle.createWritable();
    } else {
      // For IndexedDB, we return an object that mimics a writable stream
      // We'll handle writes differently.
      return {
        write: async (chunk) => {
          // store in IDB as array of chunks
          const id = this.getSafeFileName(fileName);
          const tx = this.db.transaction(this.storeName, 'readwrite');
          const store = tx.objectStore(this.storeName);
          const existing = await new Promise((res) => {
            const req = store.get(id);
            req.onsuccess = () => res(req.result);
            req.onerror = () => res(null);
          });
          const data = existing ? existing.data : [];
          data.push(chunk);
          await new Promise((res, rej) => {
            const req = store.put({ id, data });
            req.onsuccess = res;
            req.onerror = rej;
          });
        },
        close: async () => {
          // no-op
        }
      };
    }
  }

  // Write a chunk with obfuscation
  obfuscateChunk(uint8Array) {
    const arr = new Uint8Array(uint8Array);
    for (let i = 0; i < arr.length; i++) {
      arr[i] = arr[i] ^ this.obfuscationByte;
    }
    return arr;
  }

  // Read a file as ArrayBuffer (for worker)
  async readFile(fileName) {
    const safeName = this.getSafeFileName(fileName);
    if (this.useOPFS) {
      try {
        const root = await navigator.storage.getDirectory();
        const fileHandle = await root.getFileHandle(safeName);
        const fileObj = await fileHandle.getFile();
        const buffer = await fileObj.arrayBuffer();
        // De-obfuscate
        const view = new Uint8Array(buffer);
        for (let i = 0; i < view.length; i++) {
          view[i] = view[i] ^ this.obfuscationByte;
        }
        return view.buffer;
      } catch (e) {
        return null;
      }
    } else {
      // IndexedDB
      const tx = this.db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const result = await new Promise((res) => {
        const req = store.get(safeName);
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(null);
      });
      if (!result) return null;
      // Concatenate all chunks
      const chunks = result.data;
      const totalLen = chunks.reduce((acc, c) => acc + c.byteLength, 0);
      const merged = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }
      // De-obfuscate
      for (let i = 0; i < merged.length; i++) {
        merged[i] = merged[i] ^ this.obfuscationByte;
      }
      return merged.buffer;
    }
  }

  async fileExistsOnDisk(file) {
    const safeName = this.getSafeFileName(file);
    if (this.useOPFS) {
      try {
        const root = await navigator.storage.getDirectory();
        await root.getFileHandle(safeName);
        return true;
      } catch { return false; }
    } else {
      const tx = this.db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const result = await new Promise((res) => {
        const req = store.get(safeName);
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(null);
      });
      return !!result;
    }
  }

  async verifyLocalInstall() {
    try {
      for (const file of this.config.files) {
        const exists = await this.fileExistsOnDisk(file);
        if (!exists) return false;
        // Check size for weights
        if (file === this.config.weightsPath) {
          const data = await this.readFile(file);
          if (!data || data.byteLength < this.config.minWeightsSize) return false;
        }
      }
      return true;
    } catch { return false; }
  }

  async purgeAll() {
    if (this.useOPFS) {
      try {
        const root = await navigator.storage.getDirectory();
        for (const file of this.config.files) {
          const safeName = this.getSafeFileName(file);
          await root.removeEntry(safeName);
        }
      } catch {}
    } else {
      // delete all from IDB
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      for (const file of this.config.files) {
        const safeName = this.getSafeFileName(file);
        store.delete(safeName);
      }
    }
  }

  // For resumable downloads: get the size of an existing partial file
  async getFileSize(fileName) {
    const safeName = this.getSafeFileName(fileName);
    if (this.useOPFS) {
      try {
        const root = await navigator.storage.getDirectory();
        const handle = await root.getFileHandle(safeName);
        const file = await handle.getFile();
        return file.size;
      } catch { return 0; }
    } else {
      const data = await this.readFile(fileName);
      return data ? data.byteLength : 0;
    }
  }
}