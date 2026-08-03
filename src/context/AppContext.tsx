import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, getDoc, runTransaction } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  EQUIPMENT_ID_PREFIX,
  SCHEDULE_ID_PREFIX,
  jobIdPrefix,
} from '../constants';
import { AppUser, Equipment, Job, Schedule } from '../types';

/**
 * Finds the next free number in a sequence like EQ-0001, EQ-0002, ...
 * Only used as a starting point; uniqueness is enforced transactionally below.
 */
function nextSequenceStart(prefix: string, existing: { id: string }[]): number {
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`);
  let highest = 0;
  for (const item of existing) {
    const match = pattern.exec(item.id);
    if (match) {
      highest = Math.max(highest, Number(match[1]));
    }
  }
  return highest + 1;
}

/**
 * Claims the first unused sequential ID and writes the document under it.
 *
 * Records are keyed by human-readable IDs, so the write has to be conditional on
 * the ID still being free — a plain setDoc would silently overwrite an existing
 * maintenance record if two engineers filed a job at the same moment.
 */
async function createWithUniqueId<T extends object>(
  collectionName: string,
  prefix: string,
  startNumber: number,
  payload: T,
): Promise<string> {
  const maxAttempts = 50;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const id = `${prefix}${String(startNumber + attempt).padStart(4, '0')}`;
    const ref = doc(db, collectionName, id);

    const claimed = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) return false;
      tx.set(ref, { ...payload, id, createdAt: new Date().toISOString() });
      return true;
    });

    if (claimed) return id;
  }

  throw new Error(
    `Could not allocate a free "${prefix}" identifier after ${maxAttempts} attempts.`,
  );
}

interface AppContextType {
  currentUser: AppUser | null;
  loading: boolean;
  equipment: Equipment[];
  jobs: Job[];
  schedules: Schedule[];
  authError: string | null;
  setAuthError: (err: string | null) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  
  // Data actions. The add* methods allocate the record ID and return it.
  addEquipment: (eq: Omit<Equipment, 'id' | 'createdAt'>) => Promise<string>;
  updateEquipmentStatus: (id: string, status: Equipment['status']) => Promise<void>;
  addJob: (job: Omit<Job, 'id' | 'createdAt'>) => Promise<string>;
  addSchedule: (sch: Omit<Schedule, 'id' | 'createdAt'>) => Promise<string>;
  updateScheduleStatus: (id: string, status: Schedule['status']) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);

  // Setup Firebase Auth lookup and whitelist enforcement
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        const email = firebaseUser.email?.toLowerCase() || '';
        try {
          if (email === BOOTSTRAP_ADMIN_EMAIL) {
            // Auto bootstrap the chief admin
            const defaultAdmin: AppUser = {
              uid: firebaseUser.uid,
              email: email,
              name: firebaseUser.displayName || 'Chief Admin',
              role: 'admin',
              designation: 'Clinical Engineering Director',
              department: 'Biomedical Engineering Dept',
              createdAt: new Date().toISOString(),
              active: true
            };
            await setDoc(doc(db, 'users', email), defaultAdmin, { merge: true });
            setCurrentUser(defaultAdmin);
            setAuthError(null);
          } else {
            // Check if registered in Firestore 'users' collection
            const userRef = doc(db, 'users', email);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const data = userSnap.data() as AppUser;
              
              // Verify activation state
              if (data.active === false) {
                await signOut(auth);
                setCurrentUser(null);
                setAuthError(`Access Denied: This account (${email}) has been deactivated. Please contact an Admin or HOD.`);
                setLoading(false);
                return;
              }

              // If uid field is not set yet, update it with active uid
              if (!data.uid || data.uid !== firebaseUser.uid) {
                await setDoc(userRef, { ...data, uid: firebaseUser.uid }, { merge: true });
              }
              setCurrentUser({
                ...data,
                uid: firebaseUser.uid
              });
              setAuthError(null);
            } else {
              // Not registered! Block access and force logout
              await signOut(auth);
              setCurrentUser(null);
              setAuthError(`Access Denied: The account (${email}) is not registered in BEMMS. Please contact an Admin or HOD to register your access.`);
            }
          }
        } catch (err: any) {
          console.error('Auth verification failed: ', err);
          await signOut(auth);
          setCurrentUser(null);

          // The rules deny reads of /users to callers without an active
          // profile, so an unregistered or deactivated account surfaces here as
          // permission-denied rather than as a missing document.
          if (err?.code === 'permission-denied') {
            setAuthError(
              `Access Denied: The account (${email}) is not registered in BEMMS, or has been deactivated. Please contact an Admin or HOD.`
            );
          } else {
            setAuthError(`Auth verification failed: ${err.message || err}`);
          }
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Handle Snapshot listeners if authenticated
  useEffect(() => {
    if (currentUser) {
      setLoading(true);
      
      // Equipment listener
      const unsubEquip = onSnapshot(collection(db, 'equipment'), (snap) => {
        const list: Equipment[] = [];
        snap.forEach((doc) => {
          list.push({ ...doc.data() as Equipment, id: doc.id });
        });
        setEquipment(list);
      }, (err) => {
        console.warn('Equipment sync error:', err);
        setEquipment([]);
      });

      // Jobs/Logbook listener
      const unsubJobs = onSnapshot(collection(db, 'jobs'), (snap) => {
        const list: Job[] = [];
        snap.forEach((doc) => {
          list.push({ ...doc.data() as Job, id: doc.id });
        });
        setJobs(list);
      }, (err) => {
        console.warn('Jobs sync error:', err);
        setJobs([]);
      });

      // Schedules listener
      const unsubSchedules = onSnapshot(collection(db, 'schedules'), (snap) => {
        const list: Schedule[] = [];
        snap.forEach((doc) => {
          list.push({ ...doc.data() as Schedule, id: doc.id });
        });
        setSchedules(list);
      }, (err) => {
        console.warn('Schedules sync error:', err);
        setSchedules([]);
      });

      setLoading(false);

      return () => {
        unsubEquip();
        unsubJobs();
        unsubSchedules();
      };
    } else {
      setEquipment([]);
      setJobs([]);
      setSchedules([]);
    }
  }, [currentUser]);

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      setAuthError(null);
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google Sign-in popup blocked or failed.', err);
      setAuthError('Google login popup was blocked or could not be completed.');
      throw err;
    }
  };

  const loginWithEmail = async (emailInput: string, passwordInput: string) => {
    try {
      setAuthError(null);
      const lowerEmail = emailInput.trim().toLowerCase();

      // Registration and activation are verified in onAuthStateChanged, after
      // the credential is accepted. They cannot be pre-checked here: reading
      // /users requires an authenticated caller, so a pre-flight lookup always
      // fails with permission-denied and would block every sign-in.
      await signInWithEmailAndPassword(auth, lowerEmail, passwordInput);
    } catch (err: any) {
      console.error('Email login failed:', err);
      let errMsg = err.message || 'Authentication with Email & Password failed.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errMsg = 'Invalid email address or password. Please verify and try again.';
      }
      setAuthError(errMsg);
      throw new Error(errMsg);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setAuthError(null);
  };

  const addEquipment = async (eq: Omit<Equipment, 'id' | 'createdAt'>) => {
    if (!currentUser) throw new Error('You must be signed in to register equipment.');

    try {
      return await createWithUniqueId(
        'equipment',
        EQUIPMENT_ID_PREFIX,
        nextSequenceStart(EQUIPMENT_ID_PREFIX, equipment),
        eq,
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'equipment');
      throw err;
    }
  };

  const updateEquipmentStatus = async (id: string, status: Equipment['status']) => {
    if (currentUser) {
      const pathStr = `equipment/${id}`;
      try {
        await updateDoc(doc(db, 'equipment', id), { status });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, pathStr);
      }
    }
  };

  const addJob = async (job: Omit<Job, 'id' | 'createdAt'>) => {
    if (!currentUser) throw new Error('You must be signed in to file a job.');

    const prefix = jobIdPrefix();
    let jobId: string;

    try {
      jobId = await createWithUniqueId(
        'jobs',
        prefix,
        nextSequenceStart(prefix, jobs),
        job,
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'jobs');
      throw err;
    }

    // Roll the linked device's status forward to match the job outcome. This is
    // secondary to the log entry itself, so a failure here is surfaced without
    // discarding the job that was already committed.
    let nextStatus: Equipment['status'] = 'Active';
    if (job.jobStatus === 'Awaiting Spare Parts') nextStatus = 'Awaiting Spare Parts';
    else if (job.jobStatus === 'In Progress' || job.jobStatus === 'Pending') nextStatus = 'Under Repair';

    try {
      await updateDoc(doc(db, 'equipment', job.equipmentId), { status: nextStatus });
    } catch (err) {
      console.error(`Job ${jobId} was saved, but the status of equipment ${job.equipmentId} could not be updated.`, err);
    }

    return jobId;
  };

  const addSchedule = async (sch: Omit<Schedule, 'id' | 'createdAt'>) => {
    if (!currentUser) throw new Error('You must be signed in to schedule maintenance.');

    try {
      return await createWithUniqueId(
        'schedules',
        SCHEDULE_ID_PREFIX,
        nextSequenceStart(SCHEDULE_ID_PREFIX, schedules),
        sch,
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'schedules');
      throw err;
    }
  };

  const updateScheduleStatus = async (id: string, status: Schedule['status']) => {
    if (currentUser) {
      const pathStr = `schedules/${id}`;
      try {
        await updateDoc(doc(db, 'schedules', id), { status });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, pathStr);
      }
    }
  };

  const deleteEquipment = async (id: string) => {
    if (currentUser) {
      const pathStr = `equipment/${id}`;
      try {
        await deleteDoc(doc(db, 'equipment', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, pathStr);
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        loading,
        equipment,
        jobs,
        schedules,
        authError,
        setAuthError,
        loginWithGoogle,
        loginWithEmail,
        logout,
        addEquipment,
        updateEquipmentStatus,
        addJob,
        addSchedule,
        updateScheduleStatus,
        deleteEquipment
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
