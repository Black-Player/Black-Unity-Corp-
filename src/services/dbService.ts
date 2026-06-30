import { db } from "../firebase";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  onSnapshot,
} from "firebase/firestore";

// Safe JSON parser for localStorage
const getLocalTable = (table: string): Record<string, any> => {
  try {
    const data = localStorage.getItem(`db_${table}`);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
};

const saveLocalTable = (table: string, data: Record<string, any>) => {
  try {
    localStorage.setItem(`db_${table}`, JSON.stringify(data));
    notifyListeners(table);
  } catch (e) {
    console.error(`Local cache save error for ${table}:`, e);
  }
};

const generateId = () => Math.random().toString(36).substring(2, 15);

// Local PubSub for instantaneous offline UI updates
type SubscriptionCallback = (data: any) => void;
const listeners: Record<string, Set<() => void>> = {};

const subscribeToLocalChanges = (table: string, callback: () => void) => {
  if (!listeners[table]) {
    listeners[table] = new Set();
  }
  listeners[table].add(callback);
  return () => {
    listeners[table]?.delete(callback);
  };
};

const notifyListeners = (table: string) => {
  listeners[table]?.forEach((cb) => {
    try { cb(); } catch (e) {}
  });
};

export const dbService = {
  /**
   * CREATE / INSERT
   */
  async create(table: string, data: any, id?: string): Promise<string> {
    const docId = id || generateId();
    const enrichedData = {
      ...data,
      id: docId,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Instantly write to local cache for instant UI feedback
    const localTable = getLocalTable(table);
    localTable[docId] = enrichedData;
    saveLocalTable(table, localTable);

    // 2. Background attempt to write to Firestore
    try {
      if (db && typeof db.app !== "undefined" || db.type === "firestore" || (db && Object.keys(db).length > 0)) {
        await setDoc(doc(db, table, docId), enrichedData);
      }
    } catch (error: any) {
      console.warn(`[Offline/Sync Bypass] Firestore create skipped for ${table}/${docId}:`, error.message);
    }

    return docId;
  },

  /**
   * UPDATE
   */
  async update(table: string, id: string, data: any): Promise<void> {
    const localTable = getLocalTable(table);
    if (!localTable[id]) {
      localTable[id] = { id };
    }
    
    const enrichedData = {
      ...localTable[id],
      ...data,
      updated_at: new Date().toISOString(),
    };

    // 1. Instantly write to local cache
    localTable[id] = enrichedData;
    saveLocalTable(table, localTable);

    // 2. Background attempt to write to Firestore
    try {
      if (db && typeof db.app !== "undefined" || db.type === "firestore" || (db && Object.keys(db).length > 0)) {
        await updateDoc(doc(db, table, id), {
          ...data,
          updated_at: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.warn(`[Offline/Sync Bypass] Firestore update skipped for ${table}/${id}:`, error.message);
    }
  },

  /**
   * DELETE
   */
  async delete(table: string, id: string): Promise<void> {
    // 1. Instantly remove from local cache
    const localTable = getLocalTable(table);
    delete localTable[id];
    saveLocalTable(table, localTable);

    // 2. Background attempt to write to Firestore
    try {
      if (db && typeof db.app !== "undefined" || db.type === "firestore" || (db && Object.keys(db).length > 0)) {
        await deleteDoc(doc(db, table, id));
      }
    } catch (error: any) {
      console.warn(`[Offline/Sync Bypass] Firestore delete skipped for ${table}/${id}:`, error.message);
    }
  },

  /**
   * READ: Single Document with cloud-first, local-fallback caching
   */
  async get<T = any>(table: string, id: string): Promise<T | null> {
    // 1. Try Firestore
    try {
      if (db && typeof db.app !== "undefined" || db.type === "firestore" || (db && Object.keys(db).length > 0)) {
        const docSnap = await getDoc(doc(db, table, id));
        if (docSnap.exists()) {
          const cloudData = { id: docSnap.id, ...docSnap.data() } as any;
          // Sync to cache
          const localTable = getLocalTable(table);
          localTable[id] = cloudData;
          saveLocalTable(table, localTable);
          return cloudData as T;
        }
      }
    } catch (error: any) {
      console.warn(`[Offline/Permission Fallback] Firestore get failed for ${table}/${id}. Using local cache:`, error.message);
    }

    // 2. Failover to Local Cache
    const localTable = getLocalTable(table);
    return (localTable[id] || null) as T | null;
  },

  /**
   * READ: Collection list with cloud-first, local-fallback caching
   */
  async list<T = any>(table: string, constraints: any[] = []): Promise<T[]> {
    // 1. Try Firestore
    try {
      if (db && typeof db.app !== "undefined" || db.type === "firestore" || (db && Object.keys(db).length > 0)) {
        const q = query(collection(db, table), ...constraints);
        const querySnapshot = await getDocs(q);
        const items = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as any[];

        // Sync items to local cache
        const localTable = getLocalTable(table);
        items.forEach((item) => {
          localTable[item.id] = item;
        });
        saveLocalTable(table, localTable);
        return items as T[];
      }
    } catch (error: any) {
      console.warn(`[Offline/Permission Fallback] Firestore list failed for ${table}. Using local cache:`, error.message);
    }

    // 2. Failover to Local Cache
    const localTable = getLocalTable(table);
    return Object.values(localTable) as T[];
  },

  /**
   * REAL-TIME: Subscription with adaptive fallback to local pub-sub
   */
  subscribe(table: string, id: string, callback: SubscriptionCallback): () => void {
    let cloudUnsubscribe: (() => void) | null = null;
    let isClosed = false;

    // Local update function
    const pushLocalUpdate = () => {
      const localTable = getLocalTable(table);
      callback(localTable[id] || null);
    };

    // 1. Try real-time Firestore
    try {
      if (db && typeof db.app !== "undefined" || db.type === "firestore" || (db && Object.keys(db).length > 0)) {
        cloudUnsubscribe = onSnapshot(
          doc(db, table, id),
          (docSnap) => {
            if (isClosed) return;
            if (docSnap.exists()) {
              const data = { id: docSnap.id, ...docSnap.data() };
              // Cache it
              const localTable = getLocalTable(table);
              localTable[id] = data;
              saveLocalTable(table, localTable);
              callback(data);
            } else {
              callback(null);
            }
          },
          (error) => {
            console.warn(`Firestore subscription failed for ${table}/${id}. Failing over to Local PubSub:`, error.message);
            // Switch to local PubSub monitoring
            if (!isClosed) {
              pushLocalUpdate();
            }
          }
        );
      } else {
        pushLocalUpdate();
      }
    } catch (e: any) {
      console.warn(`Firestore subscribe failed to init for ${table}/${id}:`, e.message);
      pushLocalUpdate();
    }

    // Register to local PubSub to capture direct local modifications instantly
    const localUnsubscribe = subscribeToLocalChanges(table, () => {
      if (!isClosed) pushLocalUpdate();
    });

    // Invoke initial value immediately
    pushLocalUpdate();

    return () => {
      isClosed = true;
      if (cloudUnsubscribe) {
        try { cloudUnsubscribe(); } catch (e) {}
      }
      localUnsubscribe();
    };
  },

  /**
   * REAL-TIME: Collection Subscription with adaptive fallback to local pub-sub
   */
  subscribeCollection(
    table: string,
    constraints: any[],
    callback: (data: any[]) => void
  ): () => void {
    let cloudUnsubscribe: (() => void) | null = null;
    let isClosed = false;

    const pushLocalUpdate = () => {
      const localTable = getLocalTable(table);
      callback(Object.values(localTable));
    };

    // 1. Try Firestore
    try {
      if (db && typeof db.app !== "undefined" || db.type === "firestore" || (db && Object.keys(db).length > 0)) {
        const q = query(collection(db, table), ...constraints);
        cloudUnsubscribe = onSnapshot(
          q,
          (snapshot) => {
            if (isClosed) return;
            const items = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            
            // Sync items to local cache
            const localTable = getLocalTable(table);
            items.forEach((item) => {
              localTable[item.id] = item;
            });
            saveLocalTable(table, localTable);
            callback(items);
          },
          (error) => {
            console.warn(`Firestore collection subscription failed for ${table}. Failing over to Local PubSub:`, error.message);
            if (!isClosed) {
              pushLocalUpdate();
            }
          }
        );
      } else {
        pushLocalUpdate();
      }
    } catch (e: any) {
      console.warn(`Firestore subscribeCollection failed to init for ${table}:`, e.message);
      pushLocalUpdate();
    }

    // Register to local PubSub to capture direct local modifications instantly
    const localUnsubscribe = subscribeToLocalChanges(table, () => {
      if (!isClosed) pushLocalUpdate();
    });

    // Invoke initial values immediately
    pushLocalUpdate();

    return () => {
      isClosed = true;
      if (cloudUnsubscribe) {
        try { cloudUnsubscribe(); } catch (e) {}
      }
      localUnsubscribe();
    };
  },
};
