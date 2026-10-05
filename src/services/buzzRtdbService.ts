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
  onSnapshot,
  increment,
  collectionGroup,
  where,
  serverTimestamp as firestoreTimestamp
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
  runTransaction,
  serverTimestamp as rtdbTimestamp 
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
  isPersonal?: boolean;
  ownerUid?: string;
  isProOnly?: boolean;
  isAdminOnly?: boolean;
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
  mediaType?: 'image' | 'file' | 'audio' | 'video';
  timestamp: number;
  reactions?: Record<string, number>;
  user_reactions?: Record<string, string>; // userId -> emoji
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  starredBy?: Record<string, boolean>;
  starredAt?: number;
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
    lastMessage: 'Congratulations to Cohort 3 on their graduation! Welcome Cohort 4.',
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
 * Realtime Database Only Service for Buzz Chat.
 * Replaces Firestore implementation to minimize costs and improve latency.
 */
export function subscribeToGroups(
  currentUid: string | null,
  callback: (groups: BuzzGroup[]) => void
): () => void {
  if (!rtdb) {
    callback(localGroupsCache);
    return () => {};
  }

  const groupsRef = ref(rtdb, 'buzz_groups');
  
  const unsubscribe = onValue(groupsRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      // Seed default groups into RTDB if completely empty
      DEFAULT_SEED_GROUPS.forEach(async (g) => {
        try {
          await set(ref(rtdb, `buzz_groups/${g.id}`), g);
        } catch (e) {}
      });
      callback(DEFAULT_SEED_GROUPS);
      return;
    }

    const list: BuzzGroup[] = Object.keys(data).map(id => ({
      ...data[id],
      id
    })).filter((g) => {
      if (g.isPersonal) return g.ownerUid === currentUid;
      return true; 
    });

    list.sort((a, b) => {
      if (a.isPersonal && !b.isPersonal) return -1;
      if (!a.isPersonal && b.isPersonal) return 1;
      return (b.lastMessageTime || b.createdAt) - (a.lastMessageTime || a.createdAt);
    });

    localGroupsCache = list;
    safeStorage.setItem('ciya_buzz_rtdb_groups_cache', JSON.stringify(list));
    callback(list);
  }, (err) => {
    console.warn('RTDB subscribeToGroups error:', err);
    callback(localGroupsCache);
  });

  return () => {
    try { unsubscribe(); } catch (e) {}
  };
}

/**
 * Ensures a personal "You" chat room exists for a user in RTDB.
 */
export async function ensurePersonalGroup(uid: string, name: string): Promise<void> {
  if (!rtdb || !uid) return;
  const personalGroupId = `personal_${uid}`;
  const groupRef = ref(rtdb, `buzz_groups/${personalGroupId}`);
  
  const snapshot = await get(groupRef);
  if (!snapshot.exists()) {
    await set(groupRef, {
      id: personalGroupId,
      name: 'You',
      description: 'Store and save important info relating to your studies.',
      category: 'Personal',
      imageUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&q=80',
      allowStudentsChat: true,
      createdAt: Date.now(),
      membersCount: 1,
      isPersonal: true,
      ownerUid: uid
    });
  }
}

/**
 * Creates a new student study group in RTDB.
 */
export async function createBuzzGroup(group: Omit<BuzzGroup, 'id' | 'createdAt'>): Promise<string> {
  const newGroupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const groupData: BuzzGroup = {
    ...group,
    id: newGroupId,
    allowStudentsChat: group.allowStudentsChat !== false,
    isProOnly: !!group.isProOnly,
    isAdminOnly: !!group.isAdminOnly,
    createdAt: Date.now(),
    membersCount: 1,
    lastMessage: 'Group created by admin.',
    lastMessageTime: Date.now(),
    lastMessageSender: group.createdBy || 'Admin'
  };

  if (rtdb) {
    await set(ref(rtdb, `buzz_groups/${newGroupId}`), groupData);
  }

  localGroupsCache = [groupData, ...localGroupsCache];
  safeStorage.setItem('ciya_buzz_rtdb_groups_cache', JSON.stringify(localGroupsCache));
  return newGroupId;
}

/**
 * Updates an existing group in RTDB.
 */
export async function updateBuzzGroup(groupId: string, data: Partial<BuzzGroup>): Promise<void> {
  if (rtdb) {
    await update(ref(rtdb, `buzz_groups/${groupId}`), cleanObject(data));
  }

  localGroupsCache = localGroupsCache.map((g) => (g.id === groupId ? { ...g, ...data } : g));
  safeStorage.setItem('ciya_buzz_rtdb_groups_cache', JSON.stringify(localGroupsCache));
}

/**
 * Toggles whether students are allowed to send messages in the group.
 */
export async function toggleGroupStudentChat(groupId: string, allowStudentsChat: boolean): Promise<void> {
  return updateBuzzGroup(groupId, { allowStudentsChat });
}

/**
 * Deletes a group from RTDB.
 */
export async function deleteBuzzGroup(groupId: string): Promise<void> {
  if (rtdb) {
    await remove(ref(rtdb, `buzz_groups/${groupId}`));
    await remove(ref(rtdb, `buzz_messages/${groupId}`));
  }

  localGroupsCache = localGroupsCache.filter((g) => g.id !== groupId);
  safeStorage.setItem('ciya_buzz_rtdb_groups_cache', JSON.stringify(localGroupsCache));
}

/**
 * Full RTDB Message Subscription.
 */
export function subscribeToGroupMessagesRTDB(
  groupId: string,
  callback: (messages: BuzzMessage[]) => void,
  limitCount = 50
): () => void {
  if (!rtdb) {
    callback([]);
    return () => {};
  }

  const messagesRef = rtdbQuery(
    ref(rtdb, `buzz_messages/${groupId}`),
    limitToLast(limitCount)
  );

  const unsubscribe = onValue(messagesRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }

    const list: BuzzMessage[] = Object.keys(data).map(id => {
      const item = data[id];
      return {
        ...item,
        id,
        user_reactions: item.user_reactions || {},
        starredBy: item.starredBy || {}
      } as BuzzMessage;
    });

    list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    callback(list);
  }, (err) => {
    console.warn('RTDB subscribeToGroupMessages error:', err);
    callback([]);
  });

  return () => {
    try { unsubscribe(); } catch (e) {}
  };
}

// Keep old name for backward compatibility in components
export const subscribeToGroupMessages = subscribeToGroupMessagesRTDB;

/**
 * Removes undefined properties from an object to prevent RTDB errors.
 */
function cleanObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => cleanObject(item));

  const result = { ...obj };
  Object.keys(result).forEach(key => {
    if (result[key] === undefined) {
      delete result[key];
    } else if (result[key] !== null && typeof result[key] === 'object') {
      result[key] = cleanObject(result[key]);
    }
  });
  return result;
}

/**
 * Sends a message into RTDB ONLY.
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
    mediaType?: 'image' | 'file' | 'audio' | 'video';
    replyTo?: {
      id: string;
      senderName: string;
      text: string;
    };
  }
): Promise<void> {
  if (!rtdb) return;

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  const fullMessage: BuzzMessage = {
    id: messageId,
    groupId,
    senderUid: message.senderUid,
    senderName: message.senderName,
    senderEmail: message.senderEmail,
    senderPhoto: message.senderPhoto || '',
    isAdmin: !!message.isAdmin,
    text: message.text || '',
    mediaUrl: message.mediaUrl || '',
    mediaType: message.mediaType || 'file',
    timestamp: now,
    replyTo: message.replyTo,
    starredBy: {}
  };

  const summary = message.mediaUrl 
    ? (message.text ? `[Media] ${message.text}` : '[Shared Media Attachment]')
    : message.text;

  const rtdbMessage = cleanObject(fullMessage);

  try {
    const updates: Record<string, any> = {};
    updates[`buzz_messages/${groupId}/${messageId}`] = rtdbMessage;
    updates[`buzz_groups/${groupId}/lastMessage`] = summary.slice(0, 100);
    updates[`buzz_groups/${groupId}/lastMessageTime`] = now;
    updates[`buzz_groups/${groupId}/lastMessageSender`] = message.senderName;
    
    await update(ref(rtdb), updates);
  } catch (e: any) {
    console.error('RTDB sendBuzzMessage failed:', e.code, e.message);
    throw e;
  }
}

/**
 * Toggles an emoji reaction in RTDB.
 */
export async function toggleMessageReaction(
  groupId: string,
  messageId: string,
  emoji: string,
  userId: string,
  currentEmoji?: string | null
): Promise<void> {
  if (!userId || !rtdb || !groupId || !messageId) return;

  const userReactionRef = ref(rtdb, `buzz_messages/${groupId}/${messageId}/user_reactions/${userId}`);

  try {
    const action = currentEmoji === emoji ? remove(userReactionRef) : set(userReactionRef, emoji);
    
    await Promise.race([
      action,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Realtime Database not reachable')), 8000)
      )
    ]);
  } catch (e: any) {
    console.error('Reaction toggle failed:', e.code, e.message);
    throw e;
  }
}

/**
 * Deletes a message from RTDB.
 */
export async function deleteBuzzMessage(groupId: string, messageId: string): Promise<void> {
  if (rtdb) {
    await remove(ref(rtdb, `buzz_messages/${groupId}/${messageId}`));
  }
}

/**
 * Toggles a star (favorite) on a message in RTDB.
 */
export async function toggleStarMessage(
  groupId: string, 
  messageId: string, 
  userId: string, 
  isStarred: boolean,
  messageData?: BuzzMessage
): Promise<void> {
  if (!rtdb || !userId) return;

  try {
    const updates: Record<string, any> = {};
    
    // 1. Update the message itself
    updates[`buzz_messages/${groupId}/${messageId}/starredBy/${userId}`] = isStarred ? true : null;
    
    // 2. Update user's personal stars collection for efficient lookup
    if (isStarred && messageData) {
      updates[`user_stars/${userId}/${messageId}`] = cleanObject({
        ...messageData,
        groupId,
        id: messageId,
        starredAt: Date.now()
      });
    } else {
      updates[`user_stars/${userId}/${messageId}`] = null;
    }

    await update(ref(rtdb), updates);
  } catch (e) {
    console.error('RTDB star update failed:', e);
  }
}

/**
 * Subscribes to starred messages in RTDB.
 */
export function subscribeToStarredMessages(
  userId: string,
  callback: (messages: BuzzMessage[]) => void
): () => void {
  if (!rtdb || !userId) {
    callback([]);
    return () => {};
  }

  const starsRef = ref(rtdb, `user_stars/${userId}`);
  
  const unsubscribe = onValue(starsRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }

    const list: BuzzMessage[] = Object.keys(data).map(id => ({
      ...data[id],
      id
    }));

    list.sort((a, b) => (b.starredAt || b.timestamp || 0) - (a.starredAt || a.timestamp || 0));
    callback(list);
  }, (err) => {
    console.warn('RTDB subscribeToStarredMessages error:', err);
    callback([]);
  });

  return () => {
    try { unsubscribe(); } catch (e) {}
  };
}
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
            lastSeen: rtdbTimestamp()
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
  'Website Development',
  'Mobile App Development'
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
