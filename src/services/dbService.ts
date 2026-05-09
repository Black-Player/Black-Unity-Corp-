import { db, auth } from '../firebase';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  doc as firestoreDoc,
  collection as firestoreCollection,
  addDoc as firestoreAddDoc,
  Timestamp
} from 'firebase/firestore';

/**
 * Zion Unified Data Service
 * Primary: Firebase Firestore
 * Backup/Mirror: Supabase Postgres
 */
export const dbService = {
  /**
   * CREATE / INSERT
   */
  async create(table: string, data: any, id?: string) {
    try {
      const timestamp = serverTimestamp();
      const enrichedData = {
        ...data,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: timestamp
      };

      // 1. Primary Write: Firebase
      if (id) {
        await setDoc(doc(db, table, id), enrichedData);
      } else {
        const docRef = await firestoreAddDoc(firestoreCollection(db, table), enrichedData);
        id = docRef.id;
      }

      // 2. Mirror Write: Supabase (Silent Backup)
      try {
        const { error } = await supabase
          .from(table)
          .insert([{ ...data, id: id || undefined }]);
        
        if (error) console.error(`[Mirror Fail] Supabase synchronization failed for ${table}:`, error);
      } catch (mirrorErr) {
        console.error(`[Mirror Fail] Supabase sync exception:`, mirrorErr);
      }

      return id;
    } catch (error) {
      console.error(`[Primary Fail] Firebase creation failed for ${table}:`, error);
      throw error;
    }
  },

  /**
   * UPDATE
   */
  async update(table: string, id: string, data: any) {
    try {
      const timestamp = serverTimestamp();
      const enrichedData = {
        ...data,
        updated_at: timestamp
      };

      // 1. Primary Write: Firebase
      await updateDoc(doc(db, table, id), enrichedData);

      // 2. Mirror Write: Supabase
      try {
        const { error } = await supabase
          .from(table)
          .update(data)
          .eq('id', id);
        
        if (error) console.error(`[Mirror Fail] Supabase sync failed for ${table}/${id}:`, error);
      } catch (mirrorErr) {
        console.error(`[Mirror Fail] Supabase sync exception:`, mirrorErr);
      }
    } catch (error) {
      console.error(`[Primary Fail] Firebase update failed for ${table}/${id}:`, error);
      throw error;
    }
  },

  /**
   * DELETE
   */
  async delete(table: string, id: string) {
    try {
      // 1. Primary: Firebase
      await deleteDoc(doc(db, table, id));

      // 2. Mirror: Supabase
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('id', id);
        
        if (error) console.error(`[Mirror Fail] Supabase delete failed for ${table}/${id}:`, error);
      } catch (mirrorErr) {
        console.error(`[Mirror Fail] Supabase sync exception:`, mirrorErr);
      }
    } catch (error) {
      console.error(`[Primary Fail] Firebase delete failed for ${table}/${id}:`, error);
      throw error;
    }
  },

  /**
   * READ: Single Document
   */
  async get(table: string, id: string) {
    try {
      const docSnap = await getDoc(doc(db, table, id));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
       // Optional: Fallback to Supabase on read failure
       console.warn(`[Primary Read Fail] Falling back to Supabase for ${table}/${id}`);
       const { data, error: supError } = await supabase
         .from(table)
         .select('*')
         .eq('id', id)
         .maybeSingle();
       
       if (supError) throw supError;
       return data;
    }
  },

  /**
   * READ: Query
   */
  async list(table: string, constraints: any[] = []) {
    try {
      const q = query(firestoreCollection(db, table), ...constraints);
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(`[Primary List Fail] Firebase read failed for ${table}:`, error);
      throw error;
    }
  },

  /**
   * REAL-TIME: Subscription
   */
  subscribe(table: string, id: string, callback: (data: any) => void) {
    return onSnapshot(doc(db, table, id), (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() });
      } else {
        callback(null);
      }
    });
  },

  subscribeCollection(table: string, constraints: any[], callback: (data: any[]) => void) {
    const q = query(firestoreCollection(db, table), ...constraints);
    return onSnapshot(q, (snapshot) => {
       const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
       callback(items);
    });
  }
};
