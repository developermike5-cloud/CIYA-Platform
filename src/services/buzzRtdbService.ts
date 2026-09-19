import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  ref, 
  set, 
  push, 
  update, 
  remove, 
  get, 
  query as rtdbQuery, 
  limitToLast, 
  onValue, 
  onDisconnect, 
  serverTimestamp 
} from 'firebase/database';
import { db, rtdb, auth } from '../firebase';
import { safeStorage } from '../utils/safeStorage';

export interface BuzzGroup {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  category: string;
  allowStudentsChat: boolean; // if false, only admins can send messages
  createdAt: number;
  createdBy?: string;
  lastMessage?: string;
  lastMessageTime?: number;
  lastMessageSender?: string;
  membersCount?: number;
}

export interface BuzzMessage {
  id: string;
  groupId: string;
  senderUid: string;
  senderName: string;
  senderEmail: string;
  senderPhoto?: string;
  isAdmin?: boolean;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'file' | 'audio';
  timestamp: number;
  reactions?: Record<string, number>;
}

export interface OnlineUser {
  uid: string;
  name: string;
  email: string;
  photoUrl?: string;
  status: 'online' | 'offline';
  lastSeen: number;
  currentGroupId?: string;
}

const DEFAULT_SEED_GROUPS: BuzzGroup[] = [
  {
    id: 'group_general',
    name: 'CIYA Global Students Lounge',
    description: 'General community hangout, introductions, study habits, and official academy announcements.',
    category: 'general',
    imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=80',
    allowStudentsChat: true,
    membersCount: 428,
    createdAt: Date.now() - 86400000 * 30,
    lastMessage: 'Welcome everyone to the academy! Happy learning and building.',
    lastMessageTime: Date.now() - 3600000 * 4,
    lastMessageSender: 'CIYA Coach'
  },
  {
    id: 'group_web_dev',
    name: 'AI Website Dev Squad',
    description: 'Frontend layouts, Gemini prompts, hosting, responsive CSS styling, and project debugging.',
    category: 'web',
    imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&q=80',
    allowStudentsChat: true,
    membersCount: 284,
    createdAt: Date.now() - 86400000 * 20,
    lastMessage: 'Check the new layout with full mobile responsiveness!',
    lastMessageTime: Date.now() - 3600000 * 2,
    lastMessageSender: 'Emmanuel O.'
  },
  {
    id: 'group_film_studio',
    name: 'AI Film & Animation Studio',
    description: 'Prompt engineering for runway, pika, midjourney video, and audio synchronization.',
    category: 'film',
    imageUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=400&q=80',
    allowStudentsChat: true,
    membersCount: 195,
    createdAt: Date.now() - 86400000 * 15,
    lastMessage: 'Check out the 30-second commercial script in prompt lab.',
    lastMessageTime: Date.now() - 3600000 * 6,
    lastMessageSender: 'David Kalu'
  },
  {
    id: 'group_graphics',
    name: 'AI Graphics & Branding Lab',
    description: 'Logo creation, brand mockups, flyer designs, and client presentation decks.',
    category: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400&q=80',
    allowStudentsChat: true,
    membersCount: 167,
    createdAt: Date.now() - 86400000 * 10,
    lastMessage: 'Tip: Always use 4:3 or 16:9 for clean image card alignments.',
    lastMessageTime: Date.now() - 86400000,
    lastMessageSender: 'Amina Bello'
  },
  {
    id: 'group_announcements',
    name: 'Official Academy Announcements',
    description: 'Direct announcements from instructors and admins regarding assignments, tests, and cohort milestones.',
    category: 'general',
    imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&q=80',
    allowStudentsChat: false, // Announcements only
    membersCount: 520,
    createdAt: Date.now() - 86400000 * 40,
    lastMessage: 'Cohort 3 graduation assignment submission portal is now live.',
    lastMessageTime: Date.now() - 3600000 * 1,
    lastMessageSender: 'Super Admin'
  }
];

// In-memory fallback
let localGroupsCache: BuzzGroup[] = [];
try {
  const cached = safeStorage.getItem('ciya_buzz_rtdb_groups_cache');
  if (cached) localGroupsCache = JSON.parse(cached);
} catch (e) {}
if (localGroupsCache.length === 0) {
  localGroupsCache = DEFAULT_SEED_GROUPS;
}

/**
 * Subscribes to the list of student study groups from Cloud Firestore in real-time.
 * Automatically seeds default groups if collection is newly initialized.
 */
export function subscribeToGroups(callback: (groups: BuzzGroup[]) => void): () => void {
  if (!db) {
    callback(localGroupsCache);
    return () => {};
  }

  let hasSeeded = false;

  const groupsColRef = collection(db, 'buzz_groups');
  const unsubscribe = onSnapshot(
    groupsColRef,
    (snapshot) => {
      if (snapshot.empty) {
        // Seed default groups into Firestore if completely empty
        if (!hasSeeded) {
          hasSeeded = true;
          DEFAULT_SEED_GROUPS.forEach(async (g) => {
            try {
              await setDoc(doc(db, 'buzz_groups', g.id), g);
            } catch (e) {
              // Ignore seeding failure if non-admin
            }
          });
        }
        callback(DEFAULT_SEED_GROUPS);
        return;
      }

      const list: BuzzGroup[] = snapshot.docs.map((docSnap) => {
        const item = docSnap.data();
        return {
          id: docSnap.id,
          name: item.name || 'Unnamed Group',
          description: item.description || '',
          imageUrl: item.imageUrl || '',
          category: item.category || 'general',
          allowStudentsChat: item.allowStudentsChat !== false, // default true
          createdAt: item.createdAt || Date.now(),
          createdBy: item.createdBy || '',
          lastMessage: item.lastMessage || '',
          lastMessageTime: item.lastMessageTime || 0,
          lastMessageSender: item.lastMessageSender || '',
          membersCount: item.membersCount || 1
        };
      });

      // Sort by lastMessageTime or createdAt descending
      list.sort((a, b) => (b.lastMessageTime || b.createdAt) - (a.lastMessageTime || a.createdAt));

      localGroupsCache = list;
      safeStorage.setItem('ciya_buzz_rtdb_groups_cache', JSON.stringify(list));
      callback(list);
    },
    (err) => {
      console.warn('Firestore subscribeToGroups error, using local fallback:', err);
      callback(localGroupsCache);
    }
  );

  return () => {
    try {
      unsubscribe();
    } catch (e) {}
  };
}

/**
 * Creates a new student study group in Firestore and RTDB.
 */
export async function createBuzzGroup(group: Omit<BuzzGroup, 'id' | 'createdAt'>): Promise<string> {
  const newGroupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const groupData: BuzzGroup = {
    ...group,
    id: newGroupId,
    allowStudentsChat: group.allowStudentsChat !== false,
    createdAt: Date.now(),
    membersCount: 1,
    lastMessage: 'Group created by admin.',
    lastMessageTime: Date.now(),
    lastMessageSender: group.createdBy || 'Admin'
  };

  // 1. Primary write to Firestore
  if (db) {
    await setDoc(doc(db, 'buzz_groups', newGroupId), groupData);
  }

  // 2. Mirror write to RTDB (safe try/catch so it never throws PERMISSION_DENIED)
  if (rtdb) {
    try {
      await set(ref(rtdb, `buzz_groups/${newGroupId}`), groupData);
    } catch (rtdbErr) {
      console.warn('RTDB group mirror skipped (using Firestore):', rtdbErr);
    }
  }

  localGroupsCache = [groupData, ...localGroupsCache];
  safeStorage.setItem('ciya_buzz_rtdb_groups_cache', JSON.stringify(localGroupsCache));
  return newGroupId;
}

/**
 * Updates an existing group (name, description, imageUrl, allowStudentsChat).
 */
export async function updateBuzzGroup(groupId: string, data: Partial<BuzzGroup>): Promise<void> {
  // 1. Update Firestore
  if (db) {
    await updateDoc(doc(db, 'buzz_groups', groupId), data);
  }

  // 2. Safe mirror to RTDB
  if (rtdb) {
    try {
      await update(ref(rtdb, `buzz_groups/${groupId}`), data);
    } catch (rtdbErr) {
      console.warn('RTDB group update mirror skipped (using Firestore):', rtdbErr);
    }
  }

  localGroupsCache = localGroupsCache.map((g) => (g.id === groupId ? { ...g, ...data } : g));
  safeStorage.setItem('ciya_buzz_rtdb_groups_cache', JSON.stringify(localGroupsCache));
}

/**
 * Toggles whether students are allowed to send messages in the group.
 * If false, group is in Announcement mode (only admins can post).
 */
export async function toggleGroupStudentChat(groupId: string, allowStudentsChat: boolean): Promise<void> {
  return updateBuzzGroup(groupId, { allowStudentsChat });
}

/**
 * Deletes a group from Firestore and RTDB.
 */
export async function deleteBuzzGroup(groupId: string): Promise<void> {
  if (db) {
    await deleteDoc(doc(db, 'buzz_groups', groupId));
  }

  if (rtdb) {
    try {
      await remove(ref(rtdb, `buzz_groups/${groupId}`));
      await remove(ref(rtdb, `buzz_messages/${groupId}`));
    } catch (rtdbErr) {
      console.warn('RTDB delete mirror skipped (using Firestore):', rtdbErr);
    }
  }

  localGroupsCache = localGroupsCache.filter((g) => g.id !== groupId);
  safeStorage.setItem('ciya_buzz_rtdb_groups_cache', JSON.stringify(localGroupsCache));
}

/**
 * Subscribes to messages for a specific group with a strict pagination limit
 * of 50 messages to preserve bandwidth and quota.
 */
export function subscribeToGroupMessages(
  groupId: string,
  callback: (messages: BuzzMessage[]) => void,
  limitCount = 50
): () => void {
  // If Firestore is available, use real-time Firestore listener with limit(50)
  if (db) {
    const messagesQuery = query(
      collection(db, 'buzz_groups', groupId, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const list: BuzzMessage[] = snapshot.docs.map((d) => {
          const item = d.data();
          return {
            id: d.id,
            groupId: item.groupId || groupId,
            senderUid: item.senderUid || '',
            senderName: item.senderName || 'Student',
            senderEmail: item.senderEmail || '',
            senderPhoto: item.senderPhoto || '',
            isAdmin: !!item.isAdmin,
            text: item.text || '',
            mediaUrl: item.mediaUrl || '',
            mediaType: item.mediaType,
            timestamp: item.timestamp || Date.now(),
            reactions: item.reactions || {}
          };
        });

        // Reverse to chronological order (oldest to newest)
        list.reverse();

        try {
          safeStorage.setItem(`ciya_buzz_messages_${groupId}`, JSON.stringify(list));
        } catch (e) {}

        callback(list);
      },
      (err) => {
        console.warn('Firestore subscribeToGroupMessages error, trying local cache:', err);
        try {
          const saved = safeStorage.getItem(`ciya_buzz_messages_${groupId}`);
          if (saved) callback(JSON.parse(saved));
        } catch (e) {}
      }
    );

    return () => {
      try {
        unsubscribe();
      } catch (e) {}
    };
  }

  // Fallback if db is somehow unavailable
  try {
    const saved = safeStorage.getItem(`ciya_buzz_messages_${groupId}`);
    if (saved) callback(JSON.parse(saved));
    else callback([]);
  } catch (e) {
    callback([]);
  }
  return () => {};
}

/**
 * Sends a message into Firestore and RTDB.
 * Media (if any) has already been uploaded to Cloudinary,
 * so only the text and Cloudinary mediaUrl string are stored in the database.
 */
export async function sendBuzzMessage(
  groupId: string,
  message: {
    senderUid: string;
    senderName: string;
    senderEmail: string;
    senderPhoto?: string;
    isAdmin: boolean;
    text: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'file' | 'audio';
  }
): Promise<void> {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  const fullMessage: BuzzMessage = {
    id: messageId,
    groupId,
    senderUid: message.senderUid,
    senderName: message.senderName,
    senderEmail: message.senderEmail,
    senderPhoto: message.senderPhoto || '',
    isAdmin: message.isAdmin,
    text: message.text || '',
    mediaUrl: message.mediaUrl || '',
    mediaType: message.mediaType,
    timestamp: now,
    reactions: {}
  };

  const summary = message.mediaUrl 
    ? (message.text ? `[Media] ${message.text}` : '[Shared Media Attachment]')
    : message.text;

  // 1. Write to Firestore
  if (db) {
    await setDoc(doc(db, 'buzz_groups', groupId, 'messages', messageId), fullMessage);
    try {
      await updateDoc(doc(db, 'buzz_groups', groupId), {
        lastMessage: summary.slice(0, 100),
        lastMessageTime: now,
        lastMessageSender: message.senderName
      });
    } catch (e) {}
  }

  // 2. Safe mirror to RTDB
  if (rtdb) {
    try {
      await set(ref(rtdb, `buzz_messages/${groupId}/${messageId}`), fullMessage);
      await update(ref(rtdb, `buzz_groups/${groupId}`), {
        lastMessage: summary.slice(0, 100),
        lastMessageTime: now,
        lastMessageSender: message.senderName
      });
    } catch (e) {
      console.warn('RTDB message mirror skipped:', e);
    }
  }

  // Local storage backup
  try {
    const saved = safeStorage.getItem(`ciya_buzz_messages_${groupId}`);
    const list = saved ? JSON.parse(saved) : [];
    list.push(fullMessage);
    safeStorage.setItem(`ciya_buzz_messages_${groupId}`, JSON.stringify(list.slice(-50)));
  } catch (e) {}
}

/**
 * Adds an emoji reaction to a message.
 */
export async function toggleMessageReaction(
  groupId: string,
  messageId: string,
  emoji: string
): Promise<void> {
  if (db) {
    try {
      const msgDocRef = doc(db, 'buzz_groups', groupId, 'messages', messageId);
      const snap = await getDocs(query(collection(db, 'buzz_groups', groupId, 'messages'), limit(1)));
      // Increment reaction in doc
      const updateObj: Record<string, any> = {};
      updateObj[`reactions.${emoji}`] = Date.now(); // Record reaction
      await updateDoc(msgDocRef, updateObj).catch(() => {});
    } catch (e) {}
  }

  if (rtdb) {
    try {
      const reactionRef = ref(rtdb, `buzz_messages/${groupId}/${messageId}/reactions/${emoji}`);
      const snap = await get(reactionRef);
      const currentCount = snap.exists() ? (snap.val() || 0) : 0;
      await set(reactionRef, currentCount + 1);
    } catch (e) {}
  }
}

/**
 * Initializes real-time online presence for a user with safe fallbacks.
 */
export function initUserPresence(
  user: { uid: string; name: string; email: string; photoUrl?: string },
  activeGroupId?: string
): () => void {
  if (!user.uid) return () => {};

  // Store in local session
  try {
    const onlineItem: OnlineUser = {
      uid: user.uid,
      name: user.name,
      email: user.email,
      photoUrl: user.photoUrl,
      status: 'online',
      lastSeen: Date.now(),
      currentGroupId: activeGroupId
    };
    safeStorage.setItem('ciya_current_presence', JSON.stringify(onlineItem));
  } catch (e) {}

  if (!rtdb) return () => {};

  try {
    const connectedRef = ref(rtdb, '.info/connected');
    const userPresenceRef = ref(rtdb, `presence/${user.uid}`);

    const unsubscribe = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        try {
          onDisconnect(userPresenceRef).set({
            status: 'offline',
            lastSeen: serverTimestamp()
          }).catch(() => {});

          set(userPresenceRef, {
            uid: user.uid,
            name: user.name,
            email: user.email,
            photoUrl: user.photoUrl || '',
            status: 'online',
            lastSeen: Date.now(),
            currentGroupId: activeGroupId || null
          }).catch(() => {});
        } catch (e) {}
      }
    }, () => {});

    return () => {
      try {
        unsubscribe();
        set(userPresenceRef, {
          status: 'offline',
          lastSeen: Date.now()
        }).catch(() => {});
      } catch (e) {}
    };
  } catch (e) {
    return () => {};
  }
}

/**
 * Subscribes to the list of online students across the academy with robust fallback.
 */
export function subscribeToOnlineUsers(callback: (users: OnlineUser[]) => void): () => void {
  const fallbackList: OnlineUser[] = [
    { uid: 'u1', name: 'Amina Bello', email: 'amina@ciya.academy', status: 'online', lastSeen: Date.now() },
    { uid: 'u2', name: 'David Kalu', email: 'david@ciya.academy', status: 'online', lastSeen: Date.now() },
    { uid: 'u3', name: 'Emmanuel O.', email: 'emmanuel@ciya.academy', status: 'online', lastSeen: Date.now() },
    { uid: 'u4', name: 'Grace Adeyemi', email: 'grace@ciya.academy', status: 'online', lastSeen: Date.now() },
    { uid: 'u5', name: 'Zainab Ibrahim', email: 'zainab@ciya.academy', status: 'online', lastSeen: Date.now() }
  ];

  if (!rtdb) {
    callback(fallbackList);
    return () => {};
  }

  try {
    const presenceRef = ref(rtdb, 'presence');
    const unsubscribe = onValue(
      presenceRef,
      (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          callback(fallbackList);
          return;
        }

        const activeList: OnlineUser[] = [];
        const cutoff = Date.now() - 1000 * 60 * 10; // active within last 10 mins

        Object.keys(data).forEach((uid) => {
          const item = data[uid];
          if (item && item.status === 'online' && (typeof item.lastSeen === 'number' ? item.lastSeen > cutoff : true)) {
            activeList.push({
              uid,
              name: item.name || 'Student',
              email: item.email || '',
              photoUrl: item.photoUrl,
              status: 'online',
              lastSeen: item.lastSeen || Date.now(),
              currentGroupId: item.currentGroupId
            });
          }
        });

        callback(activeList.length > 0 ? activeList : fallbackList);
      },
      () => {
        callback(fallbackList);
      }
    );

    return () => {
      try {
        unsubscribe();
      } catch (e) {}
    };
  } catch (e) {
    callback(fallbackList);
    return () => {};
  }
}

/**
 * Sets the typing status of a user in a specific group.
 */
export function setUserTyping(groupId: string, uid: string, name: string, isTyping: boolean): void {
  if (!rtdb || !groupId || !uid) return;
  try {
    const typingRef = ref(rtdb, `typing/${groupId}/${uid}`);
    if (isTyping) {
      set(typingRef, {
        name,
        timestamp: Date.now()
      }).catch(() => {});
      onDisconnect(typingRef).remove().catch(() => {});
    } else {
      remove(typingRef).catch(() => {});
    }
  } catch (e) {}
}

/**
 * Subscribes to typing status in a group.
 */
export function subscribeToGroupTyping(
  groupId: string,
  currentUid: string,
  callback: (typingNames: string[]) => void
): () => void {
  if (!rtdb || !groupId) {
    callback([]);
    return () => {};
  }

  try {
    const typingGroupRef = ref(rtdb, `typing/${groupId}`);
    const unsubscribe = onValue(
      typingGroupRef,
      (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          callback([]);
          return;
        }

        const names: string[] = [];
        const cutoff = Date.now() - 6000;

        Object.keys(data).forEach((uid) => {
          if (uid !== currentUid) {
            const item = data[uid];
            if (item && item.timestamp && item.timestamp > cutoff) {
              names.push(item.name || 'A student');
            }
          }
        });

        callback(names);
      },
      () => callback([])
    );

    return () => {
      try {
        unsubscribe();
      } catch (e) {}
    };
  } catch (e) {
    callback([]);
    return () => {};
  }
}

// -------------------------------------------------------------
// Category Management Helpers
// -------------------------------------------------------------
export const DEFAULT_BUZZ_CATEGORIES = [
  'General Lounge',
  'AI Website & Dev',
  'AI Film & Video',
  'AI Graphics & Branding',
  'Capstone Projects'
];

export function subscribeToBuzzCategories(
  callback: (categories: string[]) => void
): () => void {
  const localCached = safeStorage.getItem('ciya_buzz_categories');
  if (localCached) {
    try {
      const parsed = JSON.parse(localCached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        callback(parsed);
      }
    } catch (e) {}
  } else {
    callback(DEFAULT_BUZZ_CATEGORIES);
  }

  // Realtime Database listener
  if (rtdb) {
    try {
      const catRef = ref(rtdb, 'settings/buzz_categories');
      const unsubscribe = onValue(catRef, (snapshot) => {
        const val = snapshot.val();
        if (Array.isArray(val) && val.length > 0) {
          safeStorage.setItem('ciya_buzz_categories', JSON.stringify(val));
          callback(val);
        } else if (!localCached) {
          callback(DEFAULT_BUZZ_CATEGORIES);
        }
      }, (err) => {
        console.warn('RTDB category sync error:', err);
      });
      return () => {
        try { unsubscribe(); } catch (e) {}
      };
    } catch (e) {
      console.warn('Failed to listen to RTDB categories:', e);
    }
  }

  return () => {};
}

export async function saveBuzzCategories(categories: string[]): Promise<void> {
  const cleaned = Array.from(new Set(categories.map(c => c.trim()).filter(Boolean)));
  safeStorage.setItem('ciya_buzz_categories', JSON.stringify(cleaned));

  if (rtdb) {
    try {
      const catRef = ref(rtdb, 'settings/buzz_categories');
      await set(catRef, cleaned);
    } catch (e) {
      console.warn('Could not persist categories to RTDB:', e);
    }
  }
}
