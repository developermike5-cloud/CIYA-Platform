import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
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
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { 
  BuzzGroup, 
  BuzzMessage, 
  OnlineUser, 
  subscribeToGroups, 
  subscribeToGroupMessages, 
  sendBuzzMessage, 
  toggleMessageReaction,
  initUserPresence, 
  subscribeToOnlineUsers, 
  setUserTyping, 
  subscribeToGroupTyping,
  subscribeToBuzzCategories,
  DEFAULT_BUZZ_CATEGORIES
} from '../services/buzzRtdbService';
import { uploadToCloudinary } from '../utils/cloudinary';

interface StudentBuzzProps {
  currentUser: any;
  userProfile?: UserProfile | null;
  isAdmin?: boolean;
  onLoginRequest: () => void;
}

export default function StudentBuzz({
  currentUser,
  userProfile,
  isAdmin = false,
  onLoginRequest
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>(DEFAULT_BUZZ_CATEGORIES);

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
  }, [activeGroupId]);

  // Messages & RTDB stream
  const [messages, setMessages] = useState<BuzzMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Cloudinary media attachment
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);

  // Presence & Typing
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showOnlineList, setShowOnlineList] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
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
        photoUrl: userProfile?.photoUrl || currentUser.photoURL || ''
      },
      activeGroupId || undefined
    );
    return () => cleanupPresence();
  }, [currentUser?.uid, userProfile?.fullName, userProfile?.photoUrl, activeGroupId]);

  // 2. Subscribe to online academy students
  useEffect(() => {
    const unsubPresence = subscribeToOnlineUsers((users) => {
      setOnlineUsers(users);
    });
    return () => unsubPresence();
  }, []);

  // 3. Subscribe to study groups and categories
  useEffect(() => {
    const unsubGroups = subscribeToGroups((loadedGroups) => {
      setGroups(loadedGroups);
      setLoadingGroups(false);
    });
    const unsubCats = subscribeToBuzzCategories((loadedCats) => {
      if (loadedCats && loadedCats.length > 0) {
        setCategories(loadedCats);
      }
    });
    return () => {
      unsubGroups();
      unsubCats();
    };
  }, []);

  // 4. Subscribe to messages of active group (strictly last 50 for bandwidth preservation)
  useEffect(() => {
    if (!activeGroupId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    const unsubMessages = subscribeToGroupMessages(activeGroupId, (loadedMessages) => {
      setMessages(loadedMessages);
      setLoadingMessages(false);
    }, 50);

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
  }, [activeGroupId, currentUser?.uid]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (activeGroupId && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeGroupId]);

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

    try {
      setSendingMessage(true);
      setUploadError(null);

      let uploadedMediaUrl: string | undefined = undefined;
      let mediaType: 'image' | 'file' | undefined = undefined;

      // Upload media to Cloudinary if an attachment was selected
      if (mediaFile) {
        setUploadingMedia(true);
        const uploadRes = await uploadToCloudinary(mediaFile, 'ciya/buzz_chat', undefined, currentUser.uid);
        if (uploadRes && uploadRes.url) {
          uploadedMediaUrl = uploadRes.url;
          mediaType = mediaFile.type.startsWith('image/') ? 'image' : 'file';
        } else {
          throw new Error('Cloudinary upload returned an empty URL.');
        }
      }

      // Store message in RTDB (only the text and the Cloudinary mediaUrl string are stored)
      await sendBuzzMessage(activeGroupId, {
        senderUid: currentUser.uid,
        senderName: userProfile?.fullName || currentUser.displayName || 'Student',
        senderEmail: currentUser.email || '',
        senderPhoto: userProfile?.photoUrl || currentUser.photoURL || undefined,
        isAdmin: effectiveIsAdmin,
        text: cleanText,
        mediaUrl: uploadedMediaUrl,
        mediaType
      });

      // Reset input & typing state
      setMessageText('');
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

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!activeGroupId) return;
    if (!currentUser) {
      onLoginRequest();
      return;
    }
    try {
      await toggleMessageReaction(activeGroupId, messageId, emoji);
    } catch (e) {
      console.warn('Reaction toggle failed:', e);
    }
  };

  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const canSendMessages = effectiveIsAdmin || activeGroup?.allowStudentsChat !== false;

  // Filter groups
  const filteredGroups = groups.filter((g) => {
    const matchesSearch = 
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || g.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full max-w-5xl mx-auto font-sans select-none min-h-[calc(100dvh-130px)] flex flex-col pb-24 sm:pb-28">
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
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium truncate">
                  Peer study rooms & real-time discussions
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowOnlineList(!showOnlineList)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{onlineUsers.length} Online</span>
            </button>
          </div>

          {/* Online Users Drawer/Modal */}
          <AnimatePresence>
            {showOnlineList && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-xl overflow-hidden"
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <h4 className="text-xs sm:text-sm font-bold text-white">
                      Active Peers Online ({onlineUsers.length})
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOnlineList(false)}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-3 flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {onlineUsers.length === 0 ? (
                    <p className="text-xs text-slate-400">Connecting presence...</p>
                  ) : (
                    onlineUsers.map((u) => (
                      <div
                        key={u.uid}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>{u.name}</span>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                All Groups
              </button>
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

          {/* Groups Grid */}
          {loadingGroups ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <span className="text-sm font-medium">Loading groups...</span>
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

                return (
                  <div
                    key={group.id}
                    id={`buzz-group-${group.id}`}
                    onClick={() => setActiveGroupId(group.id)}
                    className="group bg-white hover:bg-emerald-50/10 p-5 rounded-3xl border border-slate-200/80 hover:border-emerald-500/50 transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col gap-4 text-left relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Avatar */}
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                        {group.imageUrl ? (
                          <img
                            src={group.imageUrl}
                            alt={group.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Users className="w-6 h-6 text-slate-300" />
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        {isAnnouncementsOnly ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100">
                            Broadcast
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Open Chat
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {group.category}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-base font-black text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                        {group.name}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1 font-medium leading-relaxed">
                        {group.lastMessage || group.description || 'No recent activity.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="w-5 h-5 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500">
                              {String.fromCharCode(64 + i)}
                            </div>
                          ))}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">
                          {group.membersCount || 12}+ students
                        </span>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-slate-50 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-all">
                        <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* View 2: Active Group Live Chat */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md flex flex-col h-[76dvh] sm:h-[80dvh] overflow-hidden">
          {/* Chat Room Top Bar */}
          <div className="p-3 sm:p-3.5 border-b border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setActiveGroupId(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                title="Back to all groups"
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              </button>

              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                {activeGroup?.imageUrl ? (
                  <img
                    src={activeGroup.imageUrl}
                    alt={activeGroup.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Users className="w-4 h-4 text-slate-400" />
                )}
              </div>

              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {activeGroup?.name || 'Study Room'}
                </h3>

                {/* Realtime Subtitle: Typing indicator or online count */}
                <div className="text-[11px] font-medium truncate leading-tight">
                  {typingUsers.length > 0 ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {typingUsers.join(', ')} typing...
                    </span>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {onlineUsers.length} active online
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              {activeGroup?.allowStudentsChat === false ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-amber-600" /> Broadcast
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Open Chat
                </span>
              )}
            </div>
          </div>

          {/* Messages Stream Container */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 bg-slate-50/50">
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
                  {canSendMessages ? 'Say hello to your peers!' : 'Awaiting announcements from instructors.'}
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = currentUser?.uid && msg.senderUid === currentUser.uid;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group/msg`}
                  >
                    {/* Bubble */}
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 shadow-2xs transition-all ${
                        isMe
                          ? 'bg-slate-900 text-white rounded-tr-xs'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                      }`}
                    >
                      {/* Sender Info (for other users) */}
                      {!isMe && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {msg.senderName}
                          </span>
                          {msg.isAdmin && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 flex items-center gap-0.5">
                              <Shield className="w-2.5 h-2.5" /> Admin
                            </span>
                          )}
                        </div>
                      )}

                      {/* Attached Media (Photo from Cloudinary) */}
                      {msg.mediaUrl && (
                        <div className="mb-2 rounded-xl overflow-hidden border border-slate-200/40 bg-slate-950/20 max-h-72 cursor-pointer">
                          {msg.mediaType === 'image' || !msg.mediaType ? (
                            <img
                              src={msg.mediaUrl}
                              alt="Attached photo"
                              onClick={() => setPreviewModalImage(msg.mediaUrl || null)}
                              className="w-full h-auto max-h-64 object-cover hover:opacity-95 transition-opacity"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <a
                              href={msg.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2.5 flex items-center gap-2 text-xs font-bold text-emerald-400 hover:underline"
                            >
                              <Paperclip className="w-3.5 h-3.5" /> Download File
                              <ExternalLink className="w-3 h-3 ml-auto" />
                            </a>
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

                      {/* Timestamp & Reactions Footer */}
                      <div className={`mt-1 flex items-center gap-2 justify-end text-[10px] ${
                        isMe ? 'text-slate-400' : 'text-slate-400'
                      }`}>
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Emoji Reaction Bar */}
                    <div className="flex items-center gap-1 mt-1 px-1">
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="flex items-center gap-1">
                          {Object.entries(msg.reactions).map(([emoji, count]) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleReaction(msg.id, emoji)}
                              className="px-1.5 py-0.5 rounded-full text-[10px] bg-white border border-slate-200 text-slate-700 shadow-2xs hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                            >
                              <span>{emoji}</span>
                              <span className="font-bold">{count}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Quick Add Reaction buttons */}
                      <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-1">
                        {['👍', '🔥', '❤️'].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleReaction(msg.id, emoji)}
                            className="p-1 rounded-full hover:bg-slate-200 text-xs cursor-pointer"
                            title={`React with ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>

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

          {/* Message Input Box or Read-Only Lock Banner */}
          <div className="p-3 bg-white border-t border-slate-100 shrink-0">
            {!canSendMessages ? (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold flex items-center justify-center gap-2 text-center">
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Announcement mode: only instructors can post here.
                </span>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/90 focus-within:border-emerald-500 focus-within:bg-white transition-all">
                {/* File / Photo Upload Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,.pdf"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xs cursor-pointer"
          onClick={() => setPreviewModalImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90dvh] overflow-hidden rounded-2xl">
            <button
              type="button"
              onClick={() => setPreviewModalImage(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900/80 text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={previewModalImage}
              alt="Expanded preview"
              className="max-w-full max-h-[85dvh] object-contain rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
