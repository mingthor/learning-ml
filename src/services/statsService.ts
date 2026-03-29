import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  collection, 
  getDocs,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface QuestionStats {
  viewCount: number;
  skipCount: number;
  mastery: number;
  updatedAt: any;
}

export const incrementViewCount = async (questionId: string) => {
  const path = `question_stats/${questionId}`;
  try {
    const docRef = doc(db, path);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      await setDoc(docRef, {
        viewCount: 1,
        skipCount: 0,
        mastery: 0,
        updatedAt: serverTimestamp()
      });
    } else {
      await updateDoc(docRef, {
        viewCount: increment(1),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const incrementSkipCount = async (questionId: string) => {
  const path = `question_stats/${questionId}`;
  try {
    const docRef = doc(db, path);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      await setDoc(docRef, {
        viewCount: 0,
        skipCount: 1,
        mastery: 0,
        updatedAt: serverTimestamp()
      });
    } else {
      await updateDoc(docRef, {
        skipCount: increment(1),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const updateMasteryScore = async (questionId: string, score: number) => {
  const path = `question_stats/${questionId}`;
  try {
    const docRef = doc(db, path);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      await setDoc(docRef, {
        viewCount: 0,
        skipCount: 0,
        mastery: Math.max(0, Math.min(10, score)),
        updatedAt: serverTimestamp()
      });
    } else {
      await updateDoc(docRef, {
        mastery: Math.max(0, Math.min(10, score)),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const fetchAllStats = async (): Promise<Record<string, QuestionStats>> => {
  const path = 'question_stats';
  try {
    const querySnapshot = await getDocs(collection(db, path));
    const stats: Record<string, QuestionStats> = {};
    querySnapshot.forEach((doc) => {
      stats[doc.id] = doc.data() as QuestionStats;
    });
    return stats;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return {};
  }
};

export const testConnection = async () => {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
