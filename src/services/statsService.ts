import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  query, 
  where,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface QuestionStats {
  viewCount: number;
  skipCount: number;
  mastery: number;
  updatedAt: any;
  userId: string;
}

enum OperationType {
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

const getStatsId = (questionId: string) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User must be authenticated to access stats');
  return `${questionId}_${userId}`;
};

export const incrementViewCount = async (questionId: string) => {
  if (!auth.currentUser) return;
  const statsId = getStatsId(questionId);
  const statsRef = doc(db, 'stats', statsId);
  
  try {
    const statsDoc = await getDoc(statsRef);
    if (!statsDoc.exists()) {
      await setDoc(statsRef, {
        viewCount: 1,
        skipCount: 0,
        mastery: 0,
        updatedAt: serverTimestamp(),
        userId: auth.currentUser.uid
      });
    } else {
      await updateDoc(statsRef, {
        viewCount: increment(1),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `stats/${statsId}`);
  }
};

export const incrementSkipCount = async (questionId: string) => {
  if (!auth.currentUser) return;
  const statsId = getStatsId(questionId);
  const statsRef = doc(db, 'stats', statsId);
  
  try {
    const statsDoc = await getDoc(statsRef);
    if (!statsDoc.exists()) {
      await setDoc(statsRef, {
        viewCount: 0,
        skipCount: 1,
        mastery: 0,
        updatedAt: serverTimestamp(),
        userId: auth.currentUser.uid
      });
    } else {
      await updateDoc(statsRef, {
        skipCount: increment(1),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `stats/${statsId}`);
  }
};

export const updateMasteryScore = async (questionId: string, score: number) => {
  if (!auth.currentUser) return;
  const statsId = getStatsId(questionId);
  const statsRef = doc(db, 'stats', statsId);
  const sanitizedScore = Math.max(0, Math.min(10, score));
  
  try {
    const statsDoc = await getDoc(statsRef);
    if (!statsDoc.exists()) {
      await setDoc(statsRef, {
        viewCount: 0,
        skipCount: 0,
        mastery: sanitizedScore,
        updatedAt: serverTimestamp(),
        userId: auth.currentUser.uid
      });
    } else {
      await updateDoc(statsRef, {
        mastery: sanitizedScore,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `stats/${statsId}`);
  }
};

export const fetchAllStats = async (): Promise<Record<string, QuestionStats>> => {
  if (!auth.currentUser) return {};
  
  try {
    const q = query(collection(db, 'stats'), where('userId', '==', auth.currentUser.uid));
    const querySnapshot = await getDocs(q);
    const statsMap: Record<string, QuestionStats> = {};
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as QuestionStats;
      // Extract questionId from document ID (questionId_userId)
      const questionId = doc.id.split('_')[0];
      statsMap[questionId] = data;
    });
    
    return statsMap;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'stats');
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
    // Skip logging for other errors, as this is simply a connection test.
  }
}
