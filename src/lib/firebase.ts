import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  getDoc,
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import { SavedMenu, Ingredient } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Khởi tạo ứng dụng Firebase
const app = initializeApp(firebaseConfig);

// Khởi tạo Firestore với database ID từ tệp cấu hình
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);

// === TIỆN ÍCH XỬ LÝ LỖI FIRESTORE CHUẨN HOÁ ===

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Kiểm tra kết nối Firestore lúc khởi động ứng dụng
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// === TIỆN ÍCH QUẢN LÝ THỰC ĐƠN ĐÃ LƯU ===

const MENUS_COLLECTION = 'saved_menus';

/**
 * Lưu thực đơn vào Google Firestore
 */
export async function saveMenuToFirebase(menu: SavedMenu): Promise<void> {
  const path = `${MENUS_COLLECTION}/${menu.id}`;
  try {
    const docRef = doc(db, MENUS_COLLECTION, menu.id);
    await setDoc(docRef, menu);
    console.log(`Lưu thực đơn ${menu.id} thành công lên Firestore`);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Xóa thực đơn khỏi Google Firestore
 */
export async function deleteMenuFromFirebase(menuId: string): Promise<void> {
  const path = `${MENUS_COLLECTION}/${menuId}`;
  try {
    const docRef = doc(db, MENUS_COLLECTION, menuId);
    await deleteDoc(docRef);
    console.log(`Xóa thực đơn ${menuId} thành công khỏi Firestore`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Tải toàn bộ thực đơn đã lưu từ Google Firestore
 */
export async function getMenusFromFirebase(): Promise<SavedMenu[]> {
  try {
    const querySnapshot = await getDocs(collection(db, MENUS_COLLECTION));
    const menus: SavedMenu[] = [];
    querySnapshot.forEach((doc) => {
      menus.push(doc.data() as SavedMenu);
    });
    // Sắp xếp thực đơn mới nhất lên trên nếu có updatedAt
    return menus.sort((a, b) => {
      return b.id.localeCompare(a.id);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, MENUS_COLLECTION);
  }
}

// === TIỆN ÍCH QUẢN LÝ CƠ SỞ DỮ LIỆU THỰC PHẨM ===

const INGREDIENTS_DOC = 'app_data/ingredients_catalog';

/**
 * Lưu toàn bộ danh mục thực phẩm tùy biến lên Google Firestore
 */
export async function saveIngredientsToFirebase(ingredients: Ingredient[]): Promise<void> {
  try {
    const docRef = doc(db, INGREDIENTS_DOC);
    await setDoc(docRef, { list: ingredients });
    console.log('Đồng bộ danh mục thực phẩm lên Firestore thành công');
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, INGREDIENTS_DOC);
  }
}

/**
 * Tải danh mục thực phẩm từ Google Firestore
 */
export async function getIngredientsFromFirebase(): Promise<Ingredient[] | null> {
  try {
    const docRef = doc(db, INGREDIENTS_DOC);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && Array.isArray(data.list)) {
        return data.list as Ingredient[];
      }
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, INGREDIENTS_DOC);
  }
}

