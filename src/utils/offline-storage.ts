import type { Track } from '../context/player-context'

const DB_NAME = 'groovra_offline_db'
const DB_VERSION = 1
const TRACKS_STORE = 'tracks'

export interface OfflineTrackRecord {
  track: Track
  audioBlob: Blob
  downloadedAt: string
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'))
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(TRACKS_STORE)) {
        db.createObjectStore(TRACKS_STORE, { keyPath: 'track.trackId' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export const saveOfflineTrack = async (track: Track, audioBlob: Blob): Promise<void> => {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(TRACKS_STORE, 'readwrite')
      const store = transaction.objectStore(TRACKS_STORE)
      const record: OfflineTrackRecord = {
        track,
        audioBlob,
        downloadedAt: new Date().toISOString()
      }
      const request = store.put(record)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error('[OfflineStorage] Error saving track:', err)
  }
}

export const getOfflineTrackBlob = async (trackId: string): Promise<Blob | null> => {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const transaction = db.transaction(TRACKS_STORE, 'readonly')
      const store = transaction.objectStore(TRACKS_STORE)
      const request = store.get(trackId)
      request.onsuccess = () => {
        const record = request.result as OfflineTrackRecord | undefined
        resolve(record ? record.audioBlob : null)
      }
      request.onerror = () => resolve(null)
    })
  } catch (err) {
    console.error('[OfflineStorage] Error getting track blob:', err)
    return null
  }
}

export const getOfflineTracks = async (): Promise<Track[]> => {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const transaction = db.transaction(TRACKS_STORE, 'readonly')
      const store = transaction.objectStore(TRACKS_STORE)
      const request = store.getAll()
      request.onsuccess = () => {
        const records = (request.result || []) as OfflineTrackRecord[]
        const tracks = records.map(r => r.track)
        resolve(tracks)
      }
      request.onerror = () => resolve([])
    })
  } catch (err) {
    console.error('[OfflineStorage] Error getting offline tracks:', err)
    return []
  }
}

export const removeOfflineTrack = async (trackId: string): Promise<void> => {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(TRACKS_STORE, 'readwrite')
      const store = transaction.objectStore(TRACKS_STORE)
      const request = store.delete(trackId)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error('[OfflineStorage] Error deleting track:', err)
  }
}

export const isTrackOffline = async (trackId: string): Promise<boolean> => {
  const blob = await getOfflineTrackBlob(trackId)
  return blob !== null
}
