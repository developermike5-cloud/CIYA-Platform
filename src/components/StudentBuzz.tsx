import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  Info, 
  Send, 
  ArrowLeft, 
  Search, 
  Image as ImageIcon, 
  Paperclip, 
  Loader2, 
  Lock, 
  Smile, 
  Radio, 
  Check, 
  Flame, 
  Heart, 
  ThumbsUp, 
  Lightbulb, 
  X, 
  Shield, 
  ExternalLink,
  MessageSquare,
  Sparkles,
  Reply,
  Trash2,
  Forward,
  Bookmark,
  MoreVertical,
  ChevronRight,
  Download,
  BadgeCheck,
  ListChecks,
  UserPlus,
  Copy,
  MessageCircle,
  ChevronDown,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { 
  BuzzGroup, 
  BuzzMessage, 
  OnlineUser, 
  subscribeToGroups, 
  subscribeToGroupMessagesRTDB, 
  sendBuzzMessage, 
  toggleMessageReaction,
  deleteBuzzMessage,
  toggleStarMessage,
  ensurePersonalGroup,
  initUserPresence, 
  subscribeToOnlineUsers, 
  setUserTyping, 
  subscribeToGroupTyping,
  subscribeToBuzzCategories,
  DEFAULT_BUZZ_CATEGORIES,
  subscribeToStarredMessages,
  joinBuzzGroup,
  subscribeToMessageComments,
  sendMessageComment,
  updateCommentReaction,
  deleteMessageComment,
  BuzzComment
} from '../services/buzzRtdbService';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { dispatchNotification } from '../services/notifyHub';
import { uploadToCloudinary } from '../utils/cloudinary';
import { Star, AlertCircle } from 'lucide-react';
import { showCiyaToast } from './CiyaToast';

// Fallback rules shown in the join popup when the admin has not written custom rules
const DEFAULT_GROUP_RULES = [
  '1. Be respectful and kind to every member of this group.',
  '2. No spam, scams, or irrelevant promotions.',
  '3. Keep discussions on the topic of this group.',
  '4. Never share another student\'s personal information.',
  '5. Report any concern to a CIYA admin.'
].join('\n');

interface StudentBuzzProps {
  currentUser: any;
  userProfile?: UserProfile | null;
  isAdmin?: boolean;
  onLoginRequest: () => void;
  onActiveChatChange?: (active: boolean) => void;
}

// WhatsApp-style day separators for the chat stream
const sameCalendarDay = (a?: number, b?: number) => {
  const da = new Date(a || 0), db = new Date(b || 0);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
};
const formatBuzzDateDivider = (ts?: number) => {
  const d = new Date(ts || 0);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today.getTime() - day.getTime()) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function StudentBuzz({
  currentUser,
  userProfile,
  isAdmin = false,
  onLoginRequest,
  onActiveChatChange
}: StudentBuzzProps) {
  // Effective admin status check
  const effectiveIsAdmin = 
    isAdmin || 
    currentUser?.email?.toLowerCase() === 'developermike5@gmail.com' ||
    userProfile?.role === 'admin' ||
    userProfile?.role === 'super_admin';

  // Group list & selection
  const [groups, setGroups] = useState<BuzzGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('groupId') || null;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  // Comments on a message (text + image only, no videos)
  const [commentsMessage, setCommentsMessage] = useState<BuzzMessage | null>(null);
  const [comments, setComments] = useState<BuzzComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentFile, setCommentFile] = useState<File | null>(null);
  const [commentPreviewUrl, setCommentPreviewUrl] = useState<string | null>(null);
  const [sendingComment, setSendingComment] = useState(false);
  // Selected comment inside the comments panel (reactions / copy / delete)
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [showCommentDeleteConfirm, setShowCommentDeleteConfirm] = useState<string | null>(null);
  // Jump straight to a saved favourite message when its group opens
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [messageLimit, setMessageLimit] = useState(50);
  const pendingJumpRef = useRef<string | null>(null);
  // Profile photos fetched from Firestore for senders whose messages/comments lack senderPhoto
  const [profilePhotos, setProfilePhotos] = useState<Record<string, string>>({});
  const profilePhotoFetchedRef = useRef<Set<string>>(new Set());
  const commentFileInputRef = useRef<HTMLInputElement | null>(null);
  const [categories, setCategories] = useState<string[]>(['All', 'Favourite', 'Website Development', 'Mobile App Development']);

  // Favourite messages state
  const [favouriteMessages, setFavouriteMessages] = useState<BuzzMessage[]>([]);
  const [favouritePage, setFavouritePage] = useState(1);
  const favouriteMessagesPerPage = 10;

  // Update URL when activeGroupId changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (activeGroupId) {
      params.set('groupId', activeGroupId);
    } else {
      params.delete('groupId');
    }
    const newRelativePathQuery = window.location.pathname + '?' + params.toString();
    window.history.replaceState(null, '', newRelativePathQuery);
    
    // Notify parent about active chat state
    if (onActiveChatChange) {
      onActiveChatChange(!!activeGroupId);
    }
  }, [activeGroupId, onActiveChatChange]);

  // Messages & RTDB stream
  const [messages, setMessages] = useState<BuzzMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Interaction States
  const [replyingTo, setReplyingTo] = useState<BuzzMessage | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<BuzzMessage | null>(null);
  const [messageActionMenuId, setMessageActionMenuId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // Cloudinary media attachment
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);

  // Presence & Typing
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const autoScrollHoldRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initialize user presence when logged in
  useEffect(() => {
    if (!currentUser?.uid) return;
    const cleanupPresence = initUserPresence(
      {
        uid: currentUser.uid,
        name: userProfile?.fullName || currentUser.displayName || 'Student',
        email: currentUser.email || '',
        photoUrl: userProfile?.photoURL || currentUser.photoURL || ''
      },
      activeGroupId || undefined
    );
    return () => cleanupPresence();
  }, [currentUser?.uid, userProfile?.fullName, userProfile?.photoURL, activeGroupId]);

  // 2. Subscribe to online academy students
  useEffect(() => {
    const unsubPresence = subscribeToOnlineUsers((users) => {
      setOnlineUsers(users);
    });
    return () => unsubPresence();
  }, []);

  // 3. Subscribe to study groups and categories
  useEffect(() => {
    // Ensure personal group exists
    if (currentUser?.uid) {
      ensurePersonalGroup(currentUser.uid, userProfile?.fullName || currentUser.displayName || 'Student');
    }

    const unsubGroups = subscribeToGroups(currentUser?.uid || null, (loadedGroups) => {
      // Defensive check: only update groups if we have a UID OR if it's the initial load
      // This prevents the "disappearing" act when UID briefly blips to null
      if (currentUser?.uid || groups.length === 0) {
        setGroups(loadedGroups);
        setLoadingGroups(false);
      }
    });
    const unsubCats = subscribeToBuzzCategories((loadedCats) => {
      // Priority ordering: All, Favourite, then others
      const base = ['All', 'Favourite'];
      const filtered = (loadedCats || []).filter(c => !base.includes(c));
      setCategories([...base, ...filtered]);
    });
    return () => {
      unsubGroups();
      unsubCats();
    };
  }, [currentUser?.uid]);

  // Handle favourite messages subscription
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsubStarred = subscribeToStarredMessages(currentUser.uid, (msgs) => {
      setFavouriteMessages(msgs);
    });
    return () => unsubStarred();
  }, [currentUser?.uid]);

  // Handle personal group creation separately to avoid blocking subscription
  useEffect(() => {
    if (currentUser?.uid) {
      ensurePersonalGroup(currentUser.uid, userProfile?.fullName || currentUser.displayName || 'Student');
    }
  }, [currentUser?.uid, userProfile?.fullName, currentUser?.displayName]);

  // 4. Subscribe to messages of active group (strictly last 50 for bandwidth preservation)
  useEffect(() => {
    if (!activeGroupId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    const unsubMessages = subscribeToGroupMessagesRTDB(activeGroupId, (loadedMessages) => {
      setMessages(loadedMessages);
      setLoadingMessages(false);
    }, messageLimit);

    // Subscribe to typing notifications in this group
    const unsubTyping = subscribeToGroupTyping(
      activeGroupId,
      currentUser?.uid || '',
      (names) => setTypingUsers(names)
    );

    return () => {
      unsubMessages();
      unsubTyping();
      // Clear typing indicator on leaving room
      if (currentUser?.uid) {
        setUserTyping(activeGroupId, currentUser.uid, '', false);
      }
    };
  }, [activeGroupId, currentUser?.uid, messageLimit]);

  // Subscribe to comments of the message the comments panel is open on
  useEffect(() => {
    if (!commentsMessage || !activeGroupId) {
      setComments([]);
      setSelectedCommentId(null);
      return;
    }
    setLoadingComments(true);
    const unsubComments = subscribeToMessageComments(activeGroupId, commentsMessage.id, (list) => {
      setComments(list);
      setLoadingComments(false);
    }, 100);
    return () => {
      unsubComments();
    };
  }, [commentsMessage?.id, activeGroupId]);

  // Fetch uploaded profile photos for senders whose messages/comments lack senderPhoto
  useEffect(() => {
    if (!currentUser?.uid) return;
    const uids = new Set<string>();
    for (const m of messages) {
      if (!m.senderPhoto && m.senderUid && !profilePhotoFetchedRef.current.has(m.senderUid)) uids.add(m.senderUid);
    }
    for (const c of comments) {
      if (!c.senderPhoto && c.senderUid && !profilePhotoFetchedRef.current.has(c.senderUid)) uids.add(c.senderUid);
    }
    if (uids.size === 0) return;
    let cancelled = false;
    (async () => {
      const results: Record<string, string> = {};
      await Promise.all([...uids].map(async (uid) => {
        profilePhotoFetchedRef.current.add(uid);
        try {
          const snap = await getDoc(doc(db, 'users', uid));
          const uDoc = snap.data() as { photoURL?: string; photoUrl?: string } | undefined;
          const photo = uDoc?.photoURL || uDoc?.photoUrl || '';
          if (photo) results[uid] = photo;
        } catch {
          // Profile not readable: the initials fallback stays for this sender
        }
      }));
      if (!cancelled && Object.keys(results).length > 0) {
        setProfilePhotos((prev) => ({ ...prev, ...results }));
      }
    })();
    return () => { cancelled = true; };
  }, [messages, comments, currentUser?.uid]);

  // Scroll to bottom when messages update (held while a favourite jump settles)
  useEffect(() => {
    if (activeGroupId && messagesEndRef.current && !pendingJumpRef.current && Date.now() >= (autoScrollHoldRef.current || 0)) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeGroupId]);

  // Jump to a saved favourite message right after the chat opens
  useEffect(() => {
    if (!activeGroupId || !pendingJumpRef.current || loadingMessages) return;
    const target = pendingJumpRef.current;
    const el = document.getElementById(`buzz-msg-${target}`);
    if (el) {
      pendingJumpRef.current = null;
      setHighlightedMessageId(target);
      // Anchor instantly, then re-anchor as images/layout settle so the target stays centred
      const anchor = () => el.scrollIntoView({ behavior: 'auto', block: 'center' });
      anchor();
      setTimeout(anchor, 400);
      setTimeout(anchor, 1000);
      window.setTimeout(() => setHighlightedMessageId(null), 3000);
      // Hold auto-scroll-to-bottom while the jump settles
      autoScrollHoldRef.current = Date.now() + 3600;
    } else if (messageLimit < 500) {
      // Not inside the loaded window: widen the history window and try again
      setMessageLimit((l) => Math.min(500, l * 4));
    } else {
      pendingJumpRef.current = null;
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages, activeGroupId, messageLimit, loadingMessages]);

  // Handle typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);

    if (!activeGroupId || !currentUser?.uid) return;
    const studentName = userProfile?.fullName || currentUser.displayName || 'Student';

    // Broadcast isTyping = true
    setUserTyping(activeGroupId, currentUser.uid, studentName, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Debounce to clear typing status after 2.5s of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (activeGroupId && currentUser?.uid) {
        setUserTyping(activeGroupId, currentUser.uid, studentName, false);
      }
    }, 2500);
  };

  // Handle media file selection for Cloudinary upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File exceeds 10MB limit.');
      return;
    }

    setMediaFile(file);
    setUploadError(null);

    // Create local preview
    const localUrl = URL.createObjectURL(file);
    setMediaPreviewUrl(localUrl);
  };

  const clearSelectedMedia = () => {
    setMediaFile(null);
    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
      setMediaPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Send message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeGroupId) return;

    if (!currentUser) {
      onLoginRequest();
      return;
    }

    const cleanText = messageText.trim();
    if (!cleanText && !mediaFile) return;

    const activeGroup = groups.find((g) => g.id === activeGroupId);
    if (activeGroup?.allowStudentsChat === false && !effectiveIsAdmin) {
      setUploadError('This channel is in announcement mode. Only administrators can send messages.');
      return;
    }

    // Membership gate: only joined members can chat in a group
    if (
      activeGroup &&
      !activeGroup.isPersonal &&
      activeGroup.category !== 'Personal' &&
      !effectiveIsAdmin &&
      !(activeGroup.members && currentUser.uid && activeGroup.members[currentUser.uid])
    ) {
      setUploadError('Join this group before sending messages.');
      return;
    }

    try {
      setSendingMessage(true);
      setUploadError(null);

      let uploadedMediaUrl: string | undefined = undefined;
      let mediaType: 'image' | 'file' | 'audio' | 'video' | undefined = undefined;

      // Upload media to Cloudinary if an attachment was selected
      if (mediaFile) {
        setUploadingMedia(true);
        const uploadRes = await uploadToCloudinary(mediaFile, 'ciya/buzz_chat', undefined, currentUser.uid);
        if (uploadRes && uploadRes.url) {
          uploadedMediaUrl = uploadRes.url;
          if (mediaFile.type.startsWith('image/')) {
            mediaType = 'image';
          } else if (mediaFile.type.startsWith('video/')) {
            mediaType = 'video';
          } else if (mediaFile.type.startsWith('audio/')) {
            mediaType = 'audio';
          } else {
            mediaType = 'file';
          }
        } else {
          throw new Error('Cloudinary upload returned an empty URL.');
        }
      }

      // Store message in RTDB
      await sendBuzzMessage(activeGroupId, {
        senderUid: currentUser.uid,
        senderName: userProfile?.fullName || currentUser.displayName || 'Student',
        senderEmail: currentUser.email || '',
        senderPhoto: userProfile?.photoURL || currentUser.photoURL || undefined,
        isAdmin: effectiveIsAdmin,
        text: cleanText,
        mediaUrl: uploadedMediaUrl,
        mediaType,
        replyTo: replyingTo ? {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          text: replyingTo.text
        } : undefined
      });

      // Notify the group's other members (in-app + push) through the dispatcher
      try {
        const memberUids = activeGroup?.members ? Object.keys(activeGroup.members).filter((u: string) => u !== currentUser.uid) : [];
        if (memberUids.length) {
          await dispatchNotification({
            userIds: memberUids,
            title: `${userProfile?.fullName || currentUser.displayName || 'Someone'} posted in ${activeGroup?.name || 'your group'}`,
            message: (cleanText || 'Sent an attachment').slice(0, 140),
            type: 'buzz_reply',
            triggeredBy: 'Buzz',
            url: '/dashboard'
          });
        }
      } catch { /* notification is best-effort */ }

      // Reset input & typing state
      setMessageText('');
      setReplyingTo(null);
      clearSelectedMedia();
      if (currentUser?.uid) {
        setUserTyping(activeGroupId, currentUser.uid, '', false);
      }
    } catch (err: any) {
      console.error('Failed to send buzz message:', err);
      setUploadError(err.message || 'Failed to send message. Please check connection.');
    } finally {
      setSendingMessage(false);
      setUploadingMedia(false);
    }
  };

  // Comment image selection (images only, no videos)
  const handleCommentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Comments support images only.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image exceeds the 10MB limit.');
      return;
    }
    setCommentFile(file);
    setCommentPreviewUrl(URL.createObjectURL(file));
  };

  const clearCommentImage = () => {
    setCommentFile(null);
    if (commentPreviewUrl) {
      URL.revokeObjectURL(commentPreviewUrl);
      setCommentPreviewUrl(null);
    }
    if (commentFileInputRef.current) {
      commentFileInputRef.current.value = '';
    }
  };

  const handleSendComment = async () => {
    if (!commentsMessage || !activeGroupId) return;
    if (!currentUser) {
      onLoginRequest();
      return;
    }
    const cleanText = commentText.trim();
    if (!cleanText && !commentFile) return;
    try {
      setSendingComment(true);
      let commentImageUrl: string | undefined = undefined;
      if (commentFile) {
        const uploadRes = await uploadToCloudinary(commentFile, 'ciya/buzz_chat', undefined, currentUser.uid);
        if (uploadRes && uploadRes.url) {
          commentImageUrl = uploadRes.url;
        } else {
          throw new Error('Image upload returned an empty URL.');
        }
      }
      await sendMessageComment(activeGroupId, commentsMessage.id, {
        senderUid: currentUser.uid,
        senderName: userProfile?.fullName || currentUser.displayName || 'Student',
        senderEmail: currentUser.email || '',
        senderPhoto: userProfile?.photoURL || currentUser.photoURL || undefined,
        isAdmin: effectiveIsAdmin,
        text: cleanText,
        imageUrl: commentImageUrl
      });
      if ((commentsMessage as any).senderUid && (commentsMessage as any).senderUid !== currentUser.uid) {
        void dispatchNotification({
          userIds: [(commentsMessage as any).senderUid],
          title: `${userProfile?.fullName || currentUser.displayName || 'Someone'} replied to your post`,
          message: (cleanText || 'Sent an attachment').slice(0, 140),
          type: 'buzz_reply',
          triggeredBy: 'Buzz',
          url: '/dashboard'
        });
      }
      setCommentText('');
      clearCommentImage();
    } catch (err: any) {
      console.error('Failed to post comment:', err);
      showToast(err.message || 'Failed to post comment. Please check connection.');
    } finally {
      setSendingComment(false);
    }
  };

  // Comment reactions (emoji saved under the comment; any signed-in user may react)
  const handleCommentReaction = async (comment: BuzzComment, emoji: string) => {
    const uid = currentUser?.uid;
    if (!uid || !activeGroupId || !commentsMessage) return;
    const current = comment.reactions?.[uid] || null;
    try {
      await updateCommentReaction(activeGroupId, commentsMessage.id, comment.id, uid, current === emoji ? null : emoji);
      setSelectedCommentId(null);
    } catch (err: any) {
      console.error('Failed to react to comment:', err);
      showToast(err.message || 'Failed to react. Please check connection.');
    }
  };

  const handleCopyComment = async (c: BuzzComment) => {
    try {
      await navigator.clipboard.writeText(c.text || '');
      showToast('Copied to clipboard!');
    } catch {
      showToast('Failed to copy.');
    }
    setSelectedCommentId(null);
  };

  const handleDeleteComment = async () => {
    if (!showCommentDeleteConfirm || !activeGroupId || !commentsMessage) return;
    try {
      await deleteMessageComment(activeGroupId, commentsMessage.id, showCommentDeleteConfirm);
      showToast('Comment deleted');
    } catch (err: any) {
      console.error('Failed to delete comment:', err);
      showToast(err.message || 'Failed to delete comment. Please check connection.');
    }
    setShowCommentDeleteConfirm(null);
  };

  const handleCopyMessage = async (msg: BuzzMessage) => {
    try {
      await navigator.clipboard.writeText(msg.text || '');
      showToast('Copied to clipboard!');
    } catch {
      showToast('Could not copy. Please try again.');
    }
    setMessageActionMenuId(null);
    setSelectedMessageId(null);
  };

  const handleReaction = async (messageId: string, emoji: string, currentEmoji?: string | null) => {
    if (!activeGroupId) return;
    if (!currentUser) {
      onLoginRequest();
      return;
    }
    try {
      await toggleMessageReaction(activeGroupId, messageId, emoji, currentUser.uid, currentEmoji);
    } catch (e: any) {
      showToast(e.message || 'Failed to update reaction');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeGroupId) return;
    try {
      await deleteBuzzMessage(activeGroupId, messageId);
    } catch (e) {
      console.error('Failed to delete message:', e);
    }
  };

  const handleToggleStar = async (msg: BuzzMessage) => {
    if (!activeGroupId || !currentUser) return;
    const isStarred = !!msg.starredBy?.[currentUser.uid];
    try {
      await toggleStarMessage(activeGroupId, msg.id, currentUser.uid, !isStarred, msg);
      if (!isStarred) {
        showToast('Message saved to Favourite successfully!');
      }
    } catch (e) {
      console.error('Failed to toggle star:', e);
    }
  };

  const handleForwardMessage = async (targetGroupId: string) => {
    if (!forwardingMessage) return;
    // Membership gate: only joined members can forward into a group
    const targetGroup = groups.find((g) => g.id === targetGroupId);
    if (
      targetGroup &&
      !targetGroup.isPersonal &&
      targetGroup.category !== 'Personal' &&
      !effectiveIsAdmin &&
      !(targetGroup.members && currentUser?.uid && targetGroup.members[currentUser.uid])
    ) {
      showCiyaToast('Join that group first to forward messages into it.');
      return;
    }
    try {
      await sendBuzzMessage(targetGroupId, {
        senderUid: currentUser.uid,
        senderName: userProfile?.fullName || currentUser.displayName || 'Student',
        senderEmail: currentUser.email || '',
        senderPhoto: userProfile?.photoURL || currentUser.photoURL || undefined,
        isAdmin: effectiveIsAdmin,
        text: forwardingMessage.text,
        mediaUrl: forwardingMessage.mediaUrl,
        mediaType: forwardingMessage.mediaType
      });
      setForwardingMessage(null);
      showCiyaToast('Message forwarded!');
    } catch (e) {
      console.error('Failed to forward message:', e);
    }
  };

  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const isStarredCategory = selectedCategory === 'Favourite';
  const canSendMessages = !isStarredCategory && (effectiveIsAdmin || activeGroup?.allowStudentsChat !== false);
  // Posting cooldown: non-admins must wait between posts (minutes set by admin per group)
  const groupCooldownSeconds = activeGroup?.postCooldownSeconds || 0;
  const cooldownSeconds = !isStarredCategory && !effectiveIsAdmin && groupCooldownSeconds > 0 ? groupCooldownSeconds : 0;
  const lastOwnPostTs = useMemo(() => {
    if (!cooldownSeconds || !currentUser?.uid) return 0;
    let t = 0;
    for (const m of messages) {
      if (m.senderUid === currentUser.uid && m.timestamp > t) t = m.timestamp;
    }
    return t;
  }, [messages, currentUser?.uid, cooldownSeconds]);
  const [cooldownTick, setCooldownTick] = useState(Date.now());
  useEffect(() => {
    if (!cooldownSeconds) return;
    const iv = setInterval(() => setCooldownTick(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [cooldownSeconds, activeGroupId]);
  const cooldownRemaining = cooldownSeconds && lastOwnPostTs
    ? Math.max(0, Math.ceil((lastOwnPostTs + cooldownSeconds * 1000 - cooldownTick) / 1000))
    : 0;

  // Personal ("You") rooms show the user's own uploaded profile photo, never a placeholder image
  const personalPhoto = userProfile?.photoURL || currentUser?.photoURL || '';
  const personalInitials = (userProfile?.fullName || currentUser?.displayName || 'S')
    .trim().split(/\s+/).map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase() || 'S';
  const isPersonalRoom = !!(activeGroup && (activeGroup.isPersonal || activeGroup.category === 'Personal'));
  const groupAvatarSrc = (g: { imageUrl?: string; isPersonal?: boolean; category?: string } | null | undefined) =>
    g && (g.isPersonal || g.category === 'Personal') && personalPhoto ? personalPhoto : g?.imageUrl;

  // Group membership gate: students must join a group before seeing its content
  const activeUid = currentUser?.uid || '';
  const activeIsPersonal = !!activeGroup && (activeGroup.isPersonal || activeGroup.category === 'Personal');
  const activeIsMember = !activeGroup ? false : (
    activeIsPersonal ||
    effectiveIsAdmin ||
    !!(activeGroup.members && activeGroup.members[activeUid])
  );
  const activeNeedsJoin = !!activeGroup && !activeIsPersonal && !activeIsMember;
  const activeProLocked = !!activeGroup?.isProOnly && userProfile?.membership !== 'pro' && !effectiveIsAdmin;
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [joiningGroup, setJoiningGroup] = useState(false);


  const handleEnterGroup = async () => {
    if (!activeGroupId) return;
    if (!activeUid) {
      onLoginRequest();
      return;
    }
    try {
      setJoiningGroup(true);
      await joinBuzzGroup(activeGroupId, activeUid);
      setShowRulesModal(false);
      showCiyaToast(`Welcome to ${activeGroup?.name || 'the group'}! You are now a member.`);
    } catch (e) {
      console.error('Failed to join group:', e);
      showCiyaToast('Could not join the group. Please check your connection and try again.');
    } finally {
      setJoiningGroup(false);
    }
  };

  // Filter groups
  const filteredGroups = groups.filter((g) => {
    if (selectedCategory === 'Favourite') return false;
    
    // Admin Only Filter
    if (g.isAdminOnly && !effectiveIsAdmin) return false;

    const matchesSearch = 
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Explicit handle for 'All' category
    if (selectedCategory === 'All') return matchesSearch;
    
    const groupCat = (g.category || '').toLowerCase();
    const activeCat = selectedCategory.toLowerCase();
    
    return matchesSearch && groupCat === activeCat;
  });

  // Favourite messages pagination
  const totalFavouritePages = Math.ceil(favouriteMessages.length / favouriteMessagesPerPage);
  const paginatedFavouriteMessages = favouriteMessages.slice(
    (favouritePage - 1) * favouriteMessagesPerPage,
    favouritePage * favouriteMessagesPerPage
  );

  // Mobile Long Press Logic
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressFiredRef = useRef(false);

  // Force Cloudinary to trigger a direct download instead of opening in a new tab
  const handleDownloadMedia = async (url: string, fileName?: string) => {
    if (!url) return;
    
    // Cloudinary specific transformation for attachment
    const attachmentUrl = url.includes('/upload/') 
      ? url.replace('/upload/', '/upload/fl_attachment/')
      : url;

    try {
      setToast('Preparing download...');
      
      // Try fetch-to-blob for a true "direct" experience (no tab flash)
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error('CORS or Network error');
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || url.split('/').pop()?.split('?')[0] || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(blobUrl);
      setToast('Download complete!');
    } catch (error) {
      console.warn('Direct fetch failed (likely CORS), falling back to attachment URL:', error);
      // Fallback: Open Cloudinary with fl_attachment in a new tab (triggers download in most browsers)
      const link = document.createElement('a');
      link.href = attachmentUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      // Some browsers respect download attribute on cross-origin if triggered by user
      link.download = fileName || '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast('Download started (fallback)');
    }
  };

  const handleTouchStart = (msgId: string) => {
    longPressTimer.current = setTimeout(() => {
      longPressFiredRef.current = true;
      setSelectedMessageId(msgId);
      setMessageActionMenuId(msgId);
      // Trigger a light haptic feedback if possible
      if ('vibrate' in navigator) navigator.vibrate(50);
    }, 600); // 600ms for long press
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  // Long-press on a comment opens its action row (same interaction as posts)
  const startCommentLongPress = (commentId: string) => {
    longPressTimer.current = setTimeout(() => {
      longPressFiredRef.current = true;
      setSelectedCommentId(commentId);
      if ('vibrate' in navigator) navigator.vibrate(50);
    }, 600);
  };
  const endCommentLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  return (
    <div 
      className={`w-full mx-auto font-sans select-none flex flex-col ${
        activeGroupId ? 'h-full pb-0 min-h-0 max-w-none' : 'max-w-5xl min-h-[calc(100dvh-130px)] pb-24 sm:pb-28'
      }`} 
      onClick={() => setMessageActionMenuId(null)}
    >
      {/* View 1: Groups Catalog */}
      {!activeGroupId ? (
        <div className="space-y-4">
          {/* Top Bar Card */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                      CIYA Buzz
                    </h2>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-950 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live Feed
                    </span>
                  </div>
                <p className="text-xs text-slate-500 font-medium truncate">
                  Peer study rooms & discussions
                </p>
              </div>
            </div>
          </div>

          {/* Search & Dynamic Category Filter */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search study groups..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
            </div>

            {/* Dynamic Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Groups Grid or Starred Messages */}
          {loadingGroups ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <span className="text-sm font-medium">Loading groups...</span>
            </div>
          ) : isStarredCategory ? (
            /* Favourite Messages View */
            <div className="space-y-4">
              {favouriteMessages.length === 0 ? (
                <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-1.5">
                  <Star className="w-8 h-8 mx-auto text-slate-300" />
                  <div className="font-bold text-slate-700">No Favourite Messages</div>
                  <p className="text-xs text-slate-400">Your favorite messages will appear here.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3">
                    {paginatedFavouriteMessages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-500/50 transition-colors cursor-pointer"
                        onClick={() => {
                          pendingJumpRef.current = msg.id;
                          setShowGroupInfo(false);
                          setActiveGroupId(msg.groupId);
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900">{msg.senderName}</span>
                            <span className="text-[10px] text-slate-400">• {new Date(msg.timestamp).toLocaleDateString()}</span>
                          </div>
                          <Star className="w-3 h-3 text-amber-500 fill-current" />
                        </div>
                        <p className="text-sm text-slate-700 line-clamp-2 mb-2 italic">"{msg.text}"</p>
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {groups.find(g => g.id === msg.groupId)?.name || 'Study Room'}
                          </div>
                          <ChevronRight className="w-3 h-3 text-slate-300" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Favourite Pagination */}
                  {totalFavouritePages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2 pb-8">
                      <button 
                        disabled={favouritePage === 1}
                        onClick={() => setFavouritePage(p => p - 1)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-50 cursor-pointer"
                      >
                        Prev
                      </button>
                      <span className="text-xs font-bold text-slate-500">
                        Page {favouritePage} of {totalFavouritePages}
                      </span>
                      <button 
                        disabled={favouritePage === totalFavouritePages}
                        onClick={() => setFavouritePage(p => p + 1)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-50 cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-1.5">
              <Users className="w-8 h-8 mx-auto text-slate-300" />
              <div className="font-bold text-slate-700">No Groups Found</div>
              <p className="text-xs text-slate-400">Try changing your search keyword or category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredGroups.map((group) => {
                const isAnnouncementsOnly = group.allowStudentsChat === false;
                const isPersonal = group.isPersonal || group.category === 'Personal';
                const isRestrictedPro = group.isProOnly && userProfile?.membership !== 'pro' && !effectiveIsAdmin;
                const joinedCount = group.members ? Object.keys(group.members).length : (group.membersCount || 0);
                const isMember = isPersonal || effectiveIsAdmin || !!(group.members && currentUser?.uid && group.members[currentUser.uid]);

                return (
                  <div
                    key={group.id}
                    id={`buzz-group-${group.id}`}
                    onClick={() => {
                      if (isRestrictedPro) {
                        showCiyaToast('This group is only open to Pro Members. Please upgrade to join the discussion!');
                        return;
                      }
                      setActiveGroupId(group.id);
                    }}
                    className={`group p-5 rounded-3xl border transition-all cursor-pointer shadow-xs hover:shadow-lg flex flex-col gap-3.5 text-left relative overflow-hidden ${
                      isPersonal
                        ? 'bg-gradient-to-br from-indigo-50/70 via-white to-indigo-100/40 border-indigo-200/70 hover:border-indigo-400'
                        : 'bg-white hover:bg-emerald-50/10 border-slate-200/80 hover:border-emerald-500/50'
                    } ${isRestrictedPro ? 'opacity-75' : ''}`}
                  >
                    {/* Accent ribbon */}
                    {!isPersonal && (
                      <div className={`absolute top-0 inset-x-0 h-1 ${isMember ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200'}`} />
                    )}

                    {/* Restricted Overlay */}
                    {isRestrictedPro && (
                      <div className="absolute inset-0 z-10 bg-slate-900/10 backdrop-blur-[1px] flex items-center justify-center">
                        <div className="bg-indigo-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5">
                          <Lock className="w-3 h-3" /> Pro Only
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      {/* Avatar & Badge Column */}
                      <div className="flex flex-col items-center gap-2 shrink-0">
                        <div className={`w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300 ${isPersonal ? 'bg-indigo-100/60 text-indigo-600' : 'bg-slate-100 border border-slate-200 text-slate-300'}`}>
                          {groupAvatarSrc(group) ? (
                            <img
                              src={groupAvatarSrc(group)}
                              alt={group.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : isPersonal ? (
                            <span className="text-sm font-black text-indigo-600 tracking-wide">{personalInitials}</span>
                          ) : (
                            <Users className="w-6 h-6" />
                          )}
                        </div>

                        <div className="flex flex-col items-center gap-1">
                          {isPersonal ? (
                            <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                              Private
                            </span>
                          ) : isAnnouncementsOnly ? (
                            <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100">
                              Broadcast
                            </span>
                          ) : isMember ? (
                            <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-0.5">
                              <BadgeCheck className="w-2.5 h-2.5" /> Joined
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-200">
                              Not joined
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 py-1">
                        <div className="space-y-1">
                          <h3 className={`text-base font-black transition-colors truncate ${isPersonal ? 'text-indigo-900 group-hover:text-indigo-700' : 'text-slate-900 group-hover:text-emerald-700'}`}>
                            {group.name}
                          </h3>
                          <p className="text-xs text-slate-500 line-clamp-1 font-medium leading-relaxed">
                            {group.lastMessage || group.description || 'No recent activity.'}
                          </p>
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">{group.category}</span>
                            {!isPersonal && (
                              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                <Users className="w-2.5 h-2.5" /> {joinedCount} member{joinedCount === 1 ? '' : 's'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-2 border-t border-slate-50">
                      {!isPersonal && !isMember && (
                        <span className="mr-auto text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full flex items-center gap-1">
                          <UserPlus className="w-3 h-3" /> Join to enter
                        </span>
                      )}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isPersonal ? 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' : isMember ? 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-emerald-600 group-hover:text-white'}`}>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeNeedsJoin ? (
        /* View 2a: Group Preview — students must join before seeing the conversation */
        <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-hidden">
          {/* Top Bar */}
          <div className="p-4 sm:p-6 border-b border-slate-100 bg-white/95 backdrop-blur-md flex items-center gap-4 shrink-0 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveGroupId(null)}
              className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors shrink-0"
              title="Back to all groups"
            >
              <ArrowLeft className="w-5 h-5 stroke-[3]" />
            </button>
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Group Info</div>
              <div className="text-xs font-bold text-slate-500 truncate">Join this group to see the conversation</div>
            </div>
          </div>

          {/* Scrollable Details */}
          <div className="flex-1 overflow-y-auto">
            <div className="relative h-44 sm:h-60 w-full bg-slate-100 overflow-hidden shrink-0">
              {groupAvatarSrc(activeGroup) ? (
                <img
                  src={groupAvatarSrc(activeGroup)}
                  alt={activeGroup.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-emerald-500/15 via-white to-indigo-500/15 flex items-center justify-center">
                  <Users className="w-14 h-14 text-slate-300" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white/95 to-transparent" />
            </div>

            <div className="px-5 sm:px-8 pb-8 space-y-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-700 border border-slate-200">{activeGroup?.category || 'Group'}</span>
                  {activeGroup?.allowStudentsChat === false && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Broadcast only
                    </span>
                  )}
                  {activeGroup?.isProOnly && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5" /> Pro members
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <Users className="w-2.5 h-2.5" /> {activeGroup?.members ? Object.keys(activeGroup.members).length : (activeGroup?.membersCount || 0)} joined
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{activeGroup?.name || 'Study Group'}</h2>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">{activeGroup?.description || 'No description yet.'}</p>
              </div>

              {/* Rules preview */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <ListChecks className="w-3.5 h-3.5 text-emerald-600" /> Group Rules
                </div>
                <p className="mt-2 text-xs sm:text-sm font-medium text-slate-600 whitespace-pre-wrap leading-relaxed line-clamp-4">{activeGroup?.rules || DEFAULT_GROUP_RULES}</p>
                <p className="mt-2 text-[11px] font-bold text-emerald-700">Tap Join Group below to read the full rules and enter.</p>
              </div>

              <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-4 flex items-start gap-3">
                <UserPlus className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-xs font-medium text-emerald-900 leading-relaxed">You must join this group before you can view its conversation or send messages. Tap Join Group to get started.</p>
              </div>
            </div>
          </div>

          {/* Sticky Join Button */}
          <div className="shrink-0 p-4 sm:p-6 border-t border-slate-100 bg-white/95 backdrop-blur-md">
            {activeProLocked ? (
              <button
                type="button"
                onClick={() => showCiyaToast('This group is only open to Pro Members. Please upgrade to join the discussion!')}
                className="w-full py-4 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 font-black text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" /> Pro Members Only
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowRulesModal(true)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-black text-sm tracking-wide shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
              >
                <UserPlus className="w-4 h-4" /> Join Group
              </button>
            )}
          </div>

          {/* Rules & Regulations Popup */}
          {showRulesModal && (
            <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60 backdrop-blur-sm">
              <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[85dvh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
                <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white flex items-center gap-3 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <ListChecks className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black tracking-tight">Group Rules & Regulations</h3>
                    <p className="text-[11px] font-medium text-emerald-100 truncate">{activeGroup?.name}</p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  <p className="text-xs sm:text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">{activeGroup?.rules || DEFAULT_GROUP_RULES}</p>
                  <p className="text-[11px] italic text-slate-400 leading-relaxed">By tapping Enter you agree to follow the rules and regulations of this group.</p>
                </div>
                <div className="p-4 border-t border-slate-100 flex items-center gap-2 shrink-0 bg-white">
                  <button
                    type="button"
                    onClick={() => setShowRulesModal(false)}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleEnterGroup}
                    disabled={joiningGroup}
                    className="flex-[2] py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-xs tracking-wide flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {joiningGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Enter
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* View 2: Active Group Live Chat */
        <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-hidden">
          {/* Chat Room Top Bar (Fixed, unique dark style) */}
          <div className="p-3 sm:p-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border-b border-emerald-900/50 flex items-center gap-3 shrink-0 relative z-20 shadow-lg">
            <button
              type="button"
              onClick={() => { setActiveGroupId(null); setShowGroupInfo(false); }}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
              title="Back to all groups"
            >
              <ArrowLeft className="w-5 h-5 stroke-[3]" />
            </button>

            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 overflow-hidden flex items-center justify-center shrink-0">
              {groupAvatarSrc(activeGroup) ? (
                <img
                  src={groupAvatarSrc(activeGroup)}
                  alt={activeGroup.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : isPersonalRoom ? (
                <span className="text-sm font-black text-white/90 tracking-wide">{personalInitials}</span>
              ) : (
                <Users className="w-5 h-5 text-white/50" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-base sm:text-lg font-black text-white leading-tight tracking-tight line-clamp-2 break-words">
                  {activeGroup?.name || 'Study Room'}
                </h3>
              </div>

              {/* Realtime Subtitle: Typing indicator */}
              <div className="text-xs font-semibold truncate leading-tight mt-0.5">
                {typingUsers.length > 0 ? (
                  <span className="text-emerald-300 font-black flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    {typingUsers.join(', ')} typing...
                  </span>
                ) : (
                  <span className="text-slate-300">
                    {activeGroup?.category === 'Personal' ? 'Private space' : 'Group chat'}
                  </span>
                )}
              </div>

              {/* Status tag: sits at the bottom of the header */}
              <div className="flex flex-wrap gap-1.5 mt-1">
                {activeGroup?.category === 'Personal' ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-300/30 whitespace-nowrap shrink-0">
                    Private
                  </span>
                ) : activeGroup?.allowStudentsChat === false ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-amber-500/20 text-amber-200 border border-amber-300/30 flex items-center gap-1 whitespace-nowrap shrink-0">
                    <Lock className="w-2 h-2" /> Broadcast
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-emerald-400/15 text-emerald-200 border border-emerald-300/30 flex items-center gap-1 whitespace-nowrap shrink-0">
                    <BadgeCheck className="w-2.5 h-2.5" /> Joined
                  </span>
                )}
              </div>
            </div>

            {/* Group info: tap to splash the group's details */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowGroupInfo((v) => !v); }}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
              title="Group info"
            >
              <Info className="w-[18px] h-[18px]" />
            </button>

            <AnimatePresence>
              {showGroupInfo && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: 0.15 } }}
                    exit={{ opacity: 0, transition: { duration: 0.12 } }}
                    className="fixed inset-0 z-40 bg-slate-950/70"
                    onClick={() => setShowGroupInfo(false)}
                  />
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0, transition: { type: 'spring', damping: 30, stiffness: 640, mass: 0.9 } }}
                    exit={{ y: '100%', transition: { duration: 0.18, ease: 'easeIn' } }}
                    className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.25)] border-t border-slate-200/90 flex flex-col max-h-[72dvh] overflow-hidden select-none"
                  >
                    <div className="p-4 pb-3 border-b border-slate-100 shrink-0 bg-white">
                      <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3" />
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 overflow-hidden flex items-center justify-center shrink-0">
                            {groupAvatarSrc(activeGroup) ? (
                              <img src={groupAvatarSrc(activeGroup)} alt={activeGroup.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : isPersonalRoom ? (
                              <span className="text-sm font-black text-emerald-600 tracking-wide">{personalInitials}</span>
                            ) : (
                              <Users className="w-5 h-5 text-emerald-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base font-black text-slate-900 tracking-tight leading-tight break-words">{activeGroup?.name || 'Study Room'}</h3>
                            <p className="text-[11px] text-slate-500 font-semibold">
                              {activeGroup?.category === 'Personal'
                                ? 'Private space'
                                : `${activeGroup?.allowStudentsChat === false ? 'Broadcast group' : 'Study group'} · ${activeGroup?.members ? Object.keys(activeGroup.members).length : (activeGroup?.membersCount || 0)} members`}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowGroupInfo(false)}
                          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center border-0 cursor-pointer transition-colors shrink-0"
                          aria-label="Close group info"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-4 sm:p-5 overflow-y-auto space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">About this group</p>
                      <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
                        {activeGroup?.description?.trim() ? activeGroup.description : 'No description for this group yet.'}
                      </p>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Messages Stream Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-white relative">
            {loadingMessages ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
                <span className="text-xs font-medium">Loading messages...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-1.5">
                <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                <div className="font-bold text-slate-700 text-sm">No messages yet</div>
                <p className="text-xs text-slate-400">
                  {activeGroup?.category === 'Personal' 
                    ? 'Say hello to yourself!' 
                    : (canSendMessages ? 'Say hello to your peers!' : 'Awaiting announcements from instructors.')}
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                  const showDateDivider = idx === 0 || !sameCalendarDay(messages[idx - 1].timestamp, msg.timestamp);
                const isMe = currentUser?.uid && msg.senderUid === currentUser.uid;
                const isStarred = !!msg.starredBy?.[currentUser?.uid || ''];
                const myReaction = currentUser?.uid ? msg.user_reactions?.[currentUser.uid] : null;

                // Group reactions by emoji and count them
                const reactionCounts: Record<string, number> = {};
                if (msg.user_reactions) {
                  Object.values(msg.user_reactions).forEach(emoji => {
                    reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
                  });
                }

                return (
                  <React.Fragment key={msg.id}>
                    {showDateDivider && (
                      <div className="flex justify-center py-1">
                        <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wide shadow-xs">
                          {formatBuzzDateDivider(msg.timestamp)}
                        </span>
                      </div>
                    )}
                    <div
                      id={`buzz-msg-${msg.id}`}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group/msg relative ${highlightedMessageId === msg.id ? 'rounded-3xl bg-amber-50/70 ring-2 ring-amber-400/80 transition-all' : ''}`}
                    >
                    {/* Message Bubble */}
                    <div
                      onClick={() => {
                        // Ignore the click that fires right after a long-press
                        if (longPressFiredRef.current) {
                          longPressFiredRef.current = false;
                          return;
                        }
                        // Tap once to select, tap again to unselect
                        if (selectedMessageId === msg.id) {
                          setSelectedMessageId(null);
                        } else {
                          setSelectedMessageId(msg.id);
                        }
                      }}
                      onContextMenu={(e) => {
                        // Prevent browser menu on mobile to allow our long-press to work
                        if (window.innerWidth < 768) {
                          e.preventDefault();
                          setSelectedMessageId(msg.id);
                          if ('vibrate' in navigator) navigator.vibrate(50);
                        }
                      }}
                      onTouchStart={() => handleTouchStart(msg.id)}
                      onTouchEnd={handleTouchEnd}
                      onTouchMove={handleTouchEnd}
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 shadow-2xs transition-all relative cursor-pointer ${
                        selectedMessageId === msg.id
                          ? 'ring-2 ring-emerald-500/50 bg-emerald-50/10 scale-[1.01]'
                          : ''
                      } ${
                        isMe
                          ? 'bg-slate-900 text-white rounded-tr-xs'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                      }`}
                    >
                      {/* Starred Indicator */}
                      {isStarred && (
                        <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 rounded-full p-0.5 shadow-sm">
                          <Star className="w-2.5 h-2.5 fill-current" />
                        </div>
                      )}

                      {/* Reply Preview in Message */}
                      {msg.replyTo && (
                        <div className={`mb-2 p-2 rounded-lg border-l-4 text-xs ${isMe ? 'bg-white/10 border-emerald-400 text-slate-300' : 'bg-slate-50 border-emerald-500 text-slate-500'}`}>
                          <div className="font-black text-[10px] uppercase mb-0.5 truncate">{msg.replyTo.senderName}</div>
                          <div className="truncate opacity-80 italic">"{msg.replyTo.text}"</div>
                        </div>
                      )}

                      {/* Sender Info (for other users) */}
                      {!isMe && (
                        <div className="flex items-center gap-1.5 mb-1">
                          {/* Profile picture beside the name */}
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[9px] font-black shrink-0 overflow-hidden">
                            {(msg.senderPhoto || profilePhotos[msg.senderUid]) ? (
                              <img src={msg.senderPhoto || profilePhotos[msg.senderUid]} alt={msg.senderName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              (msg.senderName || 'S').charAt(0).toUpperCase()
                            )}
                          </span>
                          <span className="text-xs font-black text-sky-600 truncate">
                            {msg.senderName}
                          </span>
                          {msg.isAdmin && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 flex items-center gap-0.5">
                              <Shield className="w-2.5 h-2.5" /> Admin
                            </span>
                          )}
                        </div>
                      )}

                      {/* Attached Media */}
                      {msg.mediaUrl && (
                        <div className="mb-2 rounded-xl overflow-hidden border border-slate-200/40 bg-slate-950/20 max-h-72 cursor-pointer">
                          {msg.mediaType === 'image' || !msg.mediaType ? (
                            <img
                              src={msg.mediaUrl}
                              alt="Attached"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewModalImage(msg.mediaUrl || null);
                              }}
                              className="w-full h-auto max-h-64 object-cover hover:opacity-95 transition-opacity"
                              referrerPolicy="no-referrer"
                            />
                          ) : msg.mediaType === 'video' ? (
                            <div className="relative group/video">
                              <video
                                src={msg.mediaUrl}
                                controls
                                className="w-full max-h-64 object-contain rounded-lg"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadMedia(msg.mediaUrl!, `video_${msg.id}.mp4`);
                                }}
                                className="absolute top-2 right-2 p-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 text-white shadow-lg transition-all opacity-0 group-hover/video:opacity-100 flex items-center justify-center border-0 cursor-pointer"
                                title="Download Video"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadMedia(msg.mediaUrl!, `file_${msg.id}`);
                              }}
                              className="w-full p-2.5 flex items-center gap-2 text-xs font-bold text-emerald-400 hover:underline bg-transparent border-0 cursor-pointer"
                            >
                              <Paperclip className="w-3.5 h-3.5" /> Download File
                              <ExternalLink className="w-3 h-3 ml-auto" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Text content */}
                      {msg.text && (
                        <p className={`text-xs sm:text-sm font-medium leading-relaxed break-words whitespace-pre-wrap ${
                          isMe ? 'text-slate-100' : 'text-slate-800'
                        }`}>
                          {msg.text}
                        </p>
                      )}

                      {/* Timestamp */}
                      <div className={`mt-1 flex items-center gap-2 justify-end text-[10px] ${
                        isMe ? 'text-emerald-400' : 'text-slate-400'
                      }`}>
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Comment button with reactions beside it */}
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCommentsMessage(msg);
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-colors cursor-pointer ${
                          (msg.commentsCount || 0) > 0
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600'
                        }`}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        {(msg.commentsCount || 0) > 0
                          ? `${msg.commentsCount} comment${msg.commentsCount === 1 ? '' : 's'}`
                          : 'Comment'}
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {Object.keys(reactionCounts).length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {Object.entries(reactionCounts).map(([emoji, count]) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReaction(msg.id, emoji, myReaction);
                              }}
                              className={`px-1.5 py-0.5 rounded-full text-[10px] border shadow-2xs hover:bg-slate-50 flex items-center gap-1 cursor-pointer transition-colors ${
                                myReaction === emoji
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="font-bold">{count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Interaction Bar (Directly Under Emojis) */}
                    {selectedMessageId === msg.id && (
                      <div className={`mt-2 flex flex-col gap-2 ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-top-1 duration-200`}>
                        {/* Emoji Row */}
                        <div className="flex items-center gap-1 bg-white p-1 rounded-full shadow-lg border border-slate-100">
                          {['👍', '❤️', '😂', '😮', '😢'].map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReaction(msg.id, emoji, myReaction);
                                setMessageActionMenuId(null);
                                setSelectedMessageId(null);
                              }}
                              className={`p-1.5 rounded-full hover:bg-slate-100 text-base cursor-pointer active:scale-125 transition-transform ${myReaction === emoji ? 'bg-emerald-50 ring-1 ring-emerald-200' : ''}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>

                        {/* Action Row */}
                        <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-2xl shadow-lg border border-slate-100">
                          {/* Reply Icon */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReplyingTo(msg);
                              setMessageActionMenuId(null);
                              setSelectedMessageId(null);
                            }}
                            className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                          >
                            <Reply className="w-4 h-4" />
                            <span className="text-[9px] font-bold uppercase">Reply</span>
                          </button>

                          <div className="w-px h-6 bg-slate-100" />

                          {/* Star Icon */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStar(msg);
                              setMessageActionMenuId(null);
                              setSelectedMessageId(null);
                            }}
                            className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer ${isStarred ? 'text-amber-500' : 'text-slate-600'}`}
                          >
                            <Star className={`w-4 h-4 ${isStarred ? 'fill-current' : ''}`} />
                            <span className="text-[9px] font-bold uppercase">{isStarred ? 'Saved' : 'Favourite'}</span>
                          </button>

                          <div className="w-px h-6 bg-slate-100" />

                          {/* Copy Icon */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyMessage(msg);
                            }}
                            className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                          >
                            <Copy className="w-4 h-4" />
                            <span className="text-[9px] font-bold uppercase">Copy</span>
                          </button>

                          <div className="w-px h-6 bg-slate-100" />

                          {/* Forward Icon */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setForwardingMessage(msg);
                              setMessageActionMenuId(null);
                              setSelectedMessageId(null);
                            }}
                            className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                          >
                            <Forward className="w-4 h-4" />
                            <span className="text-[9px] font-bold uppercase">Forward</span>
                          </button>

                          {(isMe || effectiveIsAdmin) && (
                            <>
                              <div className="w-px h-6 bg-slate-100" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDeleteConfirm(msg.id);
                                  setMessageActionMenuId(null);
                                  setSelectedMessageId(null);
                                }}
                                className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl hover:bg-slate-100 text-rose-600 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="text-[9px] font-bold uppercase">Delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                    </React.Fragment>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Delete Confirmation Modal (Ciya Admin Style) */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="bg-white rounded-[2rem] max-w-sm w-full p-8 shadow-2xl border border-slate-100 text-center space-y-6"
                >
                  <div className="w-20 h-20 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
                    <Trash2 className="w-10 h-10 stroke-[1.5]" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Delete Message?</h3>
                    <p className="text-sm text-slate-500 font-medium">
                      This action cannot be undone. This message will be permanently removed from CIYA Buzz.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => {
                        handleDeleteMessage(showDeleteConfirm);
                        setShowDeleteConfirm(null);
                      }}
                      className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
                    >
                      Yes, Delete Permanently
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(null)}
                      className="w-full py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-sm transition-all cursor-pointer"
                    >
                      No, Keep It
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Delete Comment Confirmation Modal (Ciya Admin Style) */}
          <AnimatePresence>
            {showCommentDeleteConfirm && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="bg-white rounded-[2rem] max-w-sm w-full p-8 shadow-2xl border border-slate-100 text-center space-y-6"
                >
                  <div className="w-20 h-20 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
                    <Trash2 className="w-10 h-10 stroke-[1.5]" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Delete Comment?</h3>
                    <p className="text-sm text-slate-500 font-medium">
                      This action cannot be undone. This comment will be permanently removed from CIYA Buzz.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => {
                        handleDeleteComment();
                      }}
                      className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
                    >
                      Yes, Delete Permanently
                    </button>
                    <button
                      onClick={() => setShowCommentDeleteConfirm(null)}
                      className="w-full py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-sm transition-all cursor-pointer"
                    >
                      No, Keep It
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Interaction UI Layers: Reply / Forwarding */}
          {replyingTo && (
            <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-4 animate-in slide-in-from-bottom-2">
              <div className="flex-1 min-w-0 border-l-4 border-emerald-500 pl-3">
                <div className="text-[10px] font-black uppercase text-emerald-700">Replying to {replyingTo.senderName}</div>
                <div className="text-xs text-slate-600 truncate opacity-80 italic">"{replyingTo.text}"</div>
              </div>
              <button onClick={() => setReplyingTo(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Forwarding Modal */}
          <AnimatePresence>
            {forwardingMessage && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[70vh]"
                >
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-black text-slate-900">Forward Message</h3>
                    <button onClick={() => setForwardingMessage(null)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-2 overflow-y-auto">
                    {groups.map(g => (
                      <button
                        key={g.id}
                        onClick={() => handleForwardMessage(g.id)}
                        className="w-full text-left p-3 hover:bg-slate-50 rounded-2xl flex items-center gap-3 transition-colors cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                          {groupAvatarSrc(g) ? (
                            <img src={groupAvatarSrc(g)} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <Users className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-800 truncate group-hover:text-emerald-600">{g.name}</div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-widest">{g.category}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Media Upload Preview Bar */}
          {mediaPreviewUrl && (
            <div className="p-2.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-300 bg-white shrink-0">
                  <img src={mediaPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">
                    {mediaFile?.name}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Ready to send
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={sendingMessage}
                onClick={clearSelectedMedia}
                className="w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {uploadError && (
            <div className="p-2 bg-rose-50 border-t border-rose-200 text-rose-800 text-xs font-semibold px-4">
              {uploadError}
            </div>
          )}

          {/* Chat Input Field Container (Fixed at bottom) */}
          <div className="p-3 bg-white border-t border-slate-100 shrink-0 safe-area-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
            {!canSendMessages ? (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold flex items-center justify-center gap-2 text-center">
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Announcement mode: only instructors can post here.
                </span>
              </div>
            ) : cooldownRemaining > 0 ? (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center gap-2 text-center">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  You can keep using the comment section to continue the conversation until the cooldown is over.
                </span>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/90 focus-within:border-emerald-500 focus-within:bg-white transition-all">
                {/* File / Photo Upload Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,video/*,.pdf"
                  className="hidden"
                />

                <button
                  type="button"
                  disabled={sendingMessage}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  title="Attach photo"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>

                {/* Input Text Box */}
                <input
                  type="text"
                  value={messageText}
                  onChange={handleInputChange}
                  placeholder={
                    uploadingMedia
                      ? 'Uploading media...'
                      : replyingTo 
                        ? `Replying to ${replyingTo.senderName}...`
                        : 'Type a message...'
                  }
                  disabled={sendingMessage}
                  className="flex-1 bg-transparent border-0 focus:outline-none text-sm font-medium text-slate-900 placeholder:text-slate-400 px-2"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={sendingMessage || (!messageText.trim() && !mediaFile)}
                  className="w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-xs transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                  {sendingMessage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewModalImage && (
        <div 
          className="fixed inset-0 z-50 flex flex-center justify-center p-4 bg-slate-950/90 backdrop-blur-xs cursor-pointer"
          onClick={() => setPreviewModalImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90dvh] overflow-hidden rounded-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownloadMedia(previewModalImage, `image_${Date.now()}`)}
                className="w-9 h-9 rounded-full bg-slate-900/80 text-white flex items-center justify-center cursor-pointer hover:bg-slate-800 transition-colors border-0"
                title="Download Image"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewModalImage(null)}
                className="w-9 h-9 rounded-full bg-slate-900/80 text-white flex items-center justify-center cursor-pointer hover:bg-slate-800 transition-colors border-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewModalImage}
              alt="Expanded preview"
              className="max-w-full max-h-[85dvh] object-contain rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
      {/* Message Comments Panel */}
      {commentsMessage && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60 backdrop-blur-sm"
          onClick={() => setCommentsMessage(null)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg h-[82dvh] sm:h-[75dvh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4.5 h-4.5 w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">
                    Comments {(comments.length > 0) && <span className="text-emerald-600">({comments.length})</span>}
                  </h3>
                  <p className="text-[11px] font-medium text-slate-500 truncate">
                    On {commentsMessage.senderName}'s post
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCommentsMessage(null)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors shrink-0 border-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {loadingComments ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  <span className="text-xs font-medium">Loading comments...</span>
                </div>
              ) : comments.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-1.5">
                  <MessageCircle className="w-8 h-8 mx-auto text-slate-300" />
                  <div className="font-bold text-slate-700 text-sm">No comments yet</div>
                  <p className="text-xs text-slate-400">Be the first to comment on this post.</p>
                </div>
              ) : (
                comments.map((c) => {
                  const isMyComment = !!currentUser?.uid && c.senderUid === currentUser.uid;
                  const myCommentReaction = currentUser?.uid ? c.reactions?.[currentUser.uid] : null;

                  // Group comment reactions by emoji and count them
                  const commentReactionCounts: Record<string, number> = {};
                  if (c.reactions) {
                    Object.values(c.reactions).forEach((emoji) => {
                      commentReactionCounts[emoji] = (commentReactionCounts[emoji] || 0) + 1;
                    });
                  }

                  return (
                    <div key={c.id} className={`flex flex-col ${isMyComment ? 'items-end' : 'items-start'}`}>
                      <div className="max-w-[80%] min-w-0 flex flex-col">
                        {/* Avatar and name together, on top of the comment */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-black shrink-0 overflow-hidden">
                            {(c.senderPhoto || profilePhotos[c.senderUid]) ? (
                              <img src={c.senderPhoto || profilePhotos[c.senderUid]} alt={c.senderName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              (c.senderName || 'S').charAt(0).toUpperCase()
                            )}
                          </div>
                          <span className="text-[11px] font-black text-slate-800 truncate">{c.senderName}</span>
                          {c.isAdmin && (
                            <span className="px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 flex items-center gap-0.5">
                              <Shield className="w-2 h-2" /> Admin
                            </span>
                          )}
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            // Ignore the click that fires right after a long-press
                            if (longPressFiredRef.current) {
                              longPressFiredRef.current = false;
                              return;
                            }
                            // Tap once to open actions, tap again to close
                            setSelectedCommentId(selectedCommentId === c.id ? null : c.id);
                          }}
                          onContextMenu={(e) => {
                            // Prevent the browser menu on mobile so the long-press works
                            if (window.innerWidth < 768) {
                              e.preventDefault();
                              setSelectedCommentId(c.id);
                              if ('vibrate' in navigator) navigator.vibrate(50);
                            }
                          }}
                          onTouchStart={() => startCommentLongPress(c.id)}
                          onTouchEnd={endCommentLongPress}
                          onTouchMove={endCommentLongPress}
                          className={`px-3 py-2 rounded-2xl text-xs font-medium leading-relaxed inline-block cursor-pointer ${isMyComment ? 'bg-slate-900 text-white rounded-tr-xs' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'} ${
                            selectedCommentId === c.id ? 'ring-2 ring-emerald-500/50' : ''
                          }`}
                        >
                          {c.imageUrl && (
                            <img
                              src={c.imageUrl}
                              alt="Comment image"
                              className="mb-1.5 rounded-xl max-h-56 w-auto object-cover cursor-pointer"
                              referrerPolicy="no-referrer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewModalImage(c.imageUrl || null);
                              }}
                            />
                          )}
                          {c.text && <p className="break-words whitespace-pre-wrap">{c.text}</p>}
                        </div>
                        {/* Comment time below the comment */}
                        <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] text-slate-400 shrink-0">
                            {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {Object.keys(commentReactionCounts).length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {Object.entries(commentReactionCounts).map(([emoji, count]) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCommentReaction(c, emoji);
                                  }}
                                  className={`px-1 py-0.5 rounded-full text-[9px] border shadow-2xs hover:bg-slate-50 flex items-center gap-0.5 cursor-pointer transition-colors ${
                                    myCommentReaction === emoji
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                      : 'bg-white border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  <span className="font-bold">{count}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Comment actions (tap the comment once) */}
                        {selectedCommentId === c.id && (
                          <div className="mt-1.5 flex flex-col gap-1.5 items-start animate-in fade-in slide-in-from-top-1 duration-200">
                            {/* Emoji Row */}
                            <div className="flex items-center gap-1 bg-white p-1 rounded-full shadow-lg border border-slate-100">
                              {['👍', '❤️', '😂', '😮', '😢'].map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCommentReaction(c, emoji);
                                  }}
                                  className={`p-1 rounded-full hover:bg-slate-100 text-sm cursor-pointer active:scale-125 transition-transform ${myCommentReaction === emoji ? 'bg-emerald-50 ring-1 ring-emerald-200' : ''}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                            {/* Copy + Delete */}
                            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-2xl shadow-lg border border-slate-100">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyComment(c);
                                }}
                                className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span className="text-[9px] font-bold uppercase">Copy</span>
                              </button>
                              {isMyComment && (
                                <>
                                  <div className="w-px h-5 bg-slate-100" />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowCommentDeleteConfirm(c.id);
                                      setSelectedCommentId(null);
                                    }}
                                    className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl hover:bg-slate-100 text-rose-600 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span className="text-[9px] font-bold uppercase">Delete</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Comment Composer (images only, no videos) */}
            <div className="p-3 border-t border-slate-100 bg-white shrink-0 space-y-2">
              {commentPreviewUrl && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2">
                  <img src={commentPreviewUrl} alt="Selected" className="w-10 h-10 rounded-lg object-cover" />
                  <span className="text-[10px] font-bold text-slate-500 flex-1 truncate">Image attached</span>
                  <button
                    type="button"
                    onClick={clearCommentImage}
                    className="text-rose-500 hover:text-rose-700 text-xs font-black cursor-pointer bg-transparent border-0"
                  >
                    Remove
                  </button>
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendComment();
                }}
                className="flex items-center gap-2 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/90 focus-within:border-emerald-500 focus-within:bg-white transition-all"
              >
                <input
                  type="file"
                  accept="image/*"
                  ref={commentFileInputRef}
                  onChange={handleCommentFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => commentFileInputRef.current?.click()}
                  disabled={sendingComment}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0 disabled:opacity-50 border-0 bg-transparent"
                  title="Attach image"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  disabled={sendingComment}
                  className="flex-1 bg-transparent border-0 focus:outline-none text-sm font-medium text-slate-900 placeholder:text-slate-400 px-1"
                />
                <button
                  type="submit"
                  disabled={sendingComment || (!commentText.trim() && !commentFile)}
                  className="w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-xs transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0 border-0"
                >
                  {sendingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 stroke-[2.5]" />}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Toast Message */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold shadow-xl flex items-center gap-2"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
