import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import {
  collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, getDoc, runTransaction,
  query, where, addDoc,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  EQUIPMENT_ID_PREFIX,
  SCHEDULE_ID_PREFIX,
  jobIdPrefix,
} from '../constants';
import { AppNotification, AppUser, Equipment, Job, Schedule } from '../types';

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
  /** Registered staff directory, used to assign work to a named engineer. */
  staff: AppUser[];
  /** Notifications addressed to the signed-in user, newest first. */
  notifications: AppNotification[];
  authError: string | null;
  setAuthError: (err: string | null) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  
  // Data actions. The add* methods allocate the record ID and return it.
  addEquipment: (eq: Omit<Equipment, 'id' | 'createdAt'>) => Promise<string>;
  /** Registers `quantity` identical units, each with its own ID and QR label. */
  addEquipmentBatch: (
    eq: Omit<Equipment, 'id' | 'createdAt'>,
    quantity: number,
  ) => Promise<BatchRegistrationResult>;
  updateEquipmentStatus: (id: string, status: Equipment['status']) => Promise<void>;
  /** Amends a registered device. Administrators only, enforced by the rules. */
  updateEquipment: (id: string, changes: EquipmentEdit) => Promise<void>;
  addJob: (job: Omit<Job, 'id' | 'createdAt'>) => Promise<string>;
  addSchedule: (sch: Omit<Schedule, 'id' | 'createdAt'>) => Promise<string>;
  updateScheduleStatus: (id: string, status: Schedule['status']) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;
  notifyAssignment: (input: AssignmentNotificationInput) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

/** Upper bound on one bulk registration, to catch a mistyped quantity. */
export const MAX_BULK_REGISTRATION = 100;

/** Outcome of a bulk registration, including a partial run. */
export interface BatchRegistrationResult {
  /** IDs successfully created, in order. */
  created: string[];
  /** 1-based position of the unit that failed, if any. */
  failedAt?: number;
  error?: string;
}

/** The fields of a registered device an administrator may amend. */
export type EquipmentEdit = Pick<
  Equipment,
  'name' | 'manufacturer' | 'modelNumber' | 'serialNumber' | 'assetNumber' | 'ward' | 'status'
> & {
  powerRating?: string;
  photoUrl?: string;
};

export interface AssignmentNotificationInput {
  recipientEmail: string;
  equipmentId: string;
  equipmentName: string;
  scheduleId: string;
  dueDate: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [staff, setStaff] = useState<AppUser[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
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

      // Staff directory, used to assign work to a named engineer
      const unsubStaff = onSnapshot(collection(db, 'users'), (snap) => {
        const list: AppUser[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as AppUser;
          list.push({
            ...data,
            email: data.email || docSnap.id,
            name: data.name || data.fullName || docSnap.id,
          });
        });
        setStaff(list);
      }, (err) => {
        console.warn('Staff sync error:', err);
        setStaff([]);
      });

      // Notifications addressed to this user only. The rules restrict reads to
      // the recipient, so the query has to filter by the same field.
      const unsubNotifications = onSnapshot(
        query(collection(db, 'notifications'), where('recipientEmail', '==', currentUser.email.toLowerCase())),
        (snap) => {
          const list: AppNotification[] = [];
          snap.forEach((docSnap) => {
            list.push({ ...(docSnap.data() as AppNotification), id: docSnap.id });
          });
          list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
          setNotifications(list);
        },
        (err) => {
          console.warn('Notification sync error:', err);
          setNotifications([]);
        }
      );

      setLoading(false);

      return () => {
        unsubEquip();
        unsubJobs();
        unsubSchedules();
        unsubStaff();
        unsubNotifications();
      };
    } else {
      setEquipment([]);
      setJobs([]);
      setSchedules([]);
      setStaff([]);
      setNotifications([]);
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
        // A password can also be absent because Firebase removed it when the
        // account first signed in with Google on an unverified address, so the
        // message points at both remedies rather than only "wrong password".
        errMsg =
          'Invalid email address or password. If you have signed in with Google before, use "Forgot password" to set a password for this account.';
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

  /**
   * Registers several identical units in one go — a ward taking delivery of ten
   * beds should not have to fill the form ten times.
   *
   * Each unit still becomes its own record with its own ID and QR label, so they
   * remain individually trackable once the labels are attached. IDs are claimed
   * one at a time rather than in a batch write, because the transactional claim
   * is what stops two people registering at the same moment from colliding.
   */
  const addEquipmentBatch = async (
    eq: Omit<Equipment, 'id' | 'createdAt'>,
    quantity: number,
  ): Promise<BatchRegistrationResult> => {
    if (!currentUser) throw new Error('You must be signed in to register equipment.');

    const total = Math.floor(quantity);
    if (!Number.isFinite(total) || total < 1) {
      throw new Error('Enter how many units to register.');
    }
    if (total > MAX_BULK_REGISTRATION) {
      throw new Error(`Register at most ${MAX_BULK_REGISTRATION} units at a time.`);
    }

    const created: string[] = [];
    let nextNumber = nextSequenceStart(EQUIPMENT_ID_PREFIX, equipment);

    for (let i = 0; i < total; i++) {
      try {
        const id = await createWithUniqueId('equipment', EQUIPMENT_ID_PREFIX, nextNumber, eq);
        created.push(id);

        // Start the next search past the ID just taken. The local equipment list
        // does not update mid-loop, so without this every unit would re-scan
        // from the same number.
        const parsed = Number(id.slice(EQUIPMENT_ID_PREFIX.length));
        nextNumber = Number.isFinite(parsed) ? parsed + 1 : nextNumber + 1;
      } catch (err) {
        // Report what actually got saved rather than implying none of it did.
        return {
          created,
          failedAt: i + 1,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    return { created };
  };

  const updateEquipment = async (id: string, changes: EquipmentEdit) => {
    if (currentUser?.role !== 'admin') {
      throw new Error('Only a System Administrator can amend a registered device.');
    }

    const pathStr = `equipment/${id}`;
    try {
      await updateDoc(doc(db, 'equipment', id), {
        ...changes,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.email,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, pathStr);
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

  /**
   * Records an assignment notification for the engineer who was given the job.
   *
   * The in-app notification is the delivery mechanism that works unconditionally.
   * Email is sent by the optional onNotificationCreated Cloud Function, which
   * reads these same documents; if it is not deployed the record simply stays
   * in-app. Failure here must never discard the schedule that was already saved.
   */
  const notifyAssignment = async (input: AssignmentNotificationInput) => {
    if (!currentUser) return;

    const recipient = input.recipientEmail.trim().toLowerCase();
    if (!recipient || recipient === currentUser.email.toLowerCase()) {
      // No point notifying yourself about your own assignment.
      return;
    }

    const notification: Omit<AppNotification, 'id'> = {
      recipientEmail: recipient,
      type: 'assignment',
      title: 'New maintenance assignment',
      message:
        `You have been assigned preventive maintenance on ${input.equipmentName} ` +
        `(${input.equipmentId}), due ${input.dueDate}.`,
      equipmentId: input.equipmentId,
      equipmentName: input.equipmentName,
      scheduleId: input.scheduleId,
      dueDate: input.dueDate,
      createdByName: currentUser.name,
      read: false,
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, 'notifications'), notification);
    } catch (err) {
      console.error('The schedule was saved, but the engineer could not be notified.', err);
      throw new Error('The schedule was saved, but the assigned engineer could not be notified.');
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const markAllNotificationsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(
      unread.map((n) =>
        updateDoc(doc(db, 'notifications', n.id), { read: true }).catch((err) =>
          console.warn(`Could not mark notification ${n.id} as read.`, err)
        )
      )
    );
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
        staff,
        notifications,
        authError,
        setAuthError,
        loginWithGoogle,
        loginWithEmail,
        logout,
        addEquipment,
        addEquipmentBatch,
        updateEquipment,
        updateEquipmentStatus,
        addJob,
        addSchedule,
        updateScheduleStatus,
        deleteEquipment,
        notifyAssignment,
        markNotificationRead,
        markAllNotificationsRead
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
