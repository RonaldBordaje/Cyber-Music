/**
 * IndexedDB helper for Cyber Music
 * Stores audio files as ArrayBuffers + metadata for persistent offline playback.
 * 
 * Database: CyberMusicDB
 * Object Stores:
 *   - tracks: { id, title, artist, duration, mimeType, arrayBuffer, order }
 *   - settings: { key, value } – stores playlist order, current track, etc.
 */

export interface TrackRecord {
  id: string;
  title: string;
  artist: string;
  duration: number;
  mimeType: string;
  arrayBuffer: ArrayBuffer;
  order: number;
  fileName: string;
}

export interface TrackMeta {
  id: string;
  title: string;
  artist: string;
  duration: number;
  mimeType: string;
  order: number;
  fileName: string;
  blobUrl?: string;
}

const DB_NAME = 'CyberMusicDB';
const DB_VERSION = 1;
const TRACKS_STORE = 'tracks';
const SETTINGS_STORE = 'settings';

let dbInstance: IDBDatabase | null = null;

/** Open (or create) the IndexedDB database */
function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(TRACKS_STORE)) {
        db.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      // Handle unexpected close
      dbInstance.onclose = () => { dbInstance = null; };
      resolve(dbInstance);
    };

    request.onerror = () => reject(request.error);
  });
}

/** Save a track (ArrayBuffer + metadata) to IndexedDB */
export async function saveTrack(track: TrackRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRACKS_STORE, 'readwrite');
    const store = tx.objectStore(TRACKS_STORE);
    store.put(track);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Load all tracks from IndexedDB, sorted by order */
export async function loadAllTracks(): Promise<TrackRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRACKS_STORE, 'readonly');
    const store = tx.objectStore(TRACKS_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const tracks = request.result as TrackRecord[];
      tracks.sort((a, b) => a.order - b.order);
      resolve(tracks);
    };
    request.onerror = () => reject(request.error);
  });
}

/** Remove a single track by ID */
export async function removeTrack(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRACKS_STORE, 'readwrite');
    const store = tx.objectStore(TRACKS_STORE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Clear all tracks */
export async function clearAllTracks(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRACKS_STORE, 'readwrite');
    const store = tx.objectStore(TRACKS_STORE);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Update track order in bulk */
export async function updateTrackOrders(updates: { id: string; order: number }[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRACKS_STORE, 'readwrite');
    const store = tx.objectStore(TRACKS_STORE);
    
    let completed = 0;
    updates.forEach(({ id, order }) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result;
        if (record) {
          record.order = order;
          store.put(record);
        }
        completed++;
        if (completed === updates.length) {
          // All updates queued, tx will complete
        }
      };
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Save a setting */
export async function saveSetting(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SETTINGS_STORE, 'readwrite');
    const store = tx.objectStore(SETTINGS_STORE);
    store.put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Load a setting */
export async function loadSetting(key: string): Promise<unknown> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SETTINGS_STORE, 'readonly');
    const store = tx.objectStore(SETTINGS_STORE);
    const request = store.get(key);
    request.onsuccess = () => {
      resolve(request.result?.value ?? null);
    };
    request.onerror = () => reject(request.error);
  });
}

/** Generate a unique ID */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

/** Parse title and artist from filename
 *  Supports formats: "Artist - Title.mp3", "Title.mp3"
 */
export function parseFilename(filename: string): { title: string; artist: string } {
  // Remove extension
  const name = filename.replace(/\.[^/.]+$/, '');
  
  // Try "Artist - Title" format
  const dashIndex = name.indexOf(' - ');
  if (dashIndex > 0) {
    return {
      artist: name.substring(0, dashIndex).trim(),
      title: name.substring(dashIndex + 3).trim(),
    };
  }

  // Try "Artist – Title" (em dash)
  const emDashIndex = name.indexOf(' – ');
  if (emDashIndex > 0) {
    return {
      artist: name.substring(0, emDashIndex).trim(),
      title: name.substring(emDashIndex + 3).trim(),
    };
  }

  return { title: name.trim(), artist: 'Unknown Artist' };
}

/** Convert ArrayBuffer to Blob URL */
export function arrayBufferToBlobUrl(buffer: ArrayBuffer, mimeType: string): string {
  const blob = new Blob([buffer], { type: mimeType });
  return URL.createObjectURL(blob);
}

/** Read File as ArrayBuffer */
export function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/** Get audio duration from ArrayBuffer */
export function getAudioDuration(buffer: ArrayBuffer, mimeType: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    audio.preload = 'metadata';
    
    const cleanup = () => {
      URL.revokeObjectURL(url);
      audio.removeAttribute('src');
      audio.load();
    };

    audio.onloadedmetadata = () => {
      const dur = audio.duration;
      cleanup();
      resolve(isFinite(dur) ? dur : 0);
    };

    audio.onerror = () => {
      cleanup();
      reject(new Error('Failed to load audio metadata'));
    };

    audio.src = url;
  });
}
