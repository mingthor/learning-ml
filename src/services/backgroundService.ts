import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export const fetchQuestionBackground = async (questionId: string): Promise<string | null> => {
  if (!auth.currentUser) return null;
  
  try {
    const backgroundRef = doc(db, 'backgrounds', questionId);
    const backgroundDoc = await getDoc(backgroundRef);
    
    if (backgroundDoc.exists()) {
      return backgroundDoc.data().content;
    }
    return null;
  } catch (error) {
    console.error('Error fetching question background:', error);
    return null;
  }
};

export const saveQuestionBackground = async (questionId: string, content: string) => {
  if (!auth.currentUser) return;
  
  try {
    const backgroundRef = doc(db, 'backgrounds', questionId);
    await setDoc(backgroundRef, {
      content,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error saving question background:', error);
  }
};
