import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  MessageSquare, 
  Upload, 
  Check, 
  X, 
  Shield, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Loader2, 
  Image as ImageIcon,
  Sparkles,
  Radio,
  ExternalLink
} from 'lucide-react';
import { 
  BuzzGroup, 
  subscribeToGroups, 
  createBuzzGroup, 
  updateBuzzGroup, 
  deleteBuzzGroup, 
  toggleGroupStudentChat,
  subscribeToOnlineUsers,
  OnlineUser,
  subscribeToBuzzCategories,
  saveBuzzCategories,
  DEFAULT_BUZZ_CATEGORIES
} from '../../services/buzzRtdbService';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { auth } from '../../firebase';
import CustomDropdown from '../../components/CustomDropdown';

export default function BuzzGroupsAdmin() {
  const [groups, setGroups] = useState<BuzzGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<BuzzGroup | null>(null);
  
  // Form fields
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupCategory, setGroupCategory] = useState<string>('General Lounge');
  const [groupImageUrl, setGroupImageUrl] = useState('');
  const [allowStudentsChat, setAllowStudentsChat] = useState(true);
  const [isProOnly, setIsProOnly] = useState(false);
  const [isAdminOnly, setIsAdminOnly] = useState(false);

  // Category state
  const [categories, setCategories] = useState<string[]>(DEFAULT_BUZZ_CATEGORIES);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  
  // Upload states
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filter state
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    type?: 'danger' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));
  const openConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' = 'danger') => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        closeConfirmModal();
      },
      type
    });
  };

  // Subscribe to RTDB groups and categories
  useEffect(() => {
    const unsubscribeGroups = subscribeToGroups(null, (loadedGroups) => {
      setGroups(loadedGroups);
      setLoading(false);
    });

    const unsubscribePresence = subscribeToOnlineUsers((users) => {
      setOnlineUsers(users);
    });

    const unsubscribeCats = subscribeToBuzzCategories((cats) => {
      if (cats && cats.length > 0) {
        setCategories(cats);
      }
    });

    return () => {
      unsubscribeGroups();
      unsubscribePresence();
      unsubscribeCats();
    };
  }, []);

  const handleAddCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setCategoryError('Category already exists.');
      return;
    }
    const updated = [...categories, trimmed];
    setCategories(updated);
    setGroupCategory(trimmed);
    setNewCategoryName('');
    setShowAddCategory(false);
    setCategoryError(null);
    try {
      await saveBuzzCategories(updated);
      setActionSuccess(`Category "${trimmed}" added!`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.warn('Failed to save category:', err);
    }
  };

  const handleDeleteCategory = async (catToDelete: string) => {
    if (categories.length <= 1) {
      alert('You must keep at least one category.');
      return;
    }
    
    openConfirm(
      'Delete Category',
      `Are you sure you want to delete the category "${catToDelete}"? Groups using this category should be updated to a new category afterwards.`,
      async () => {
        const updated = categories.filter(c => c !== catToDelete);
        setCategories(updated);
        if (groupCategory === catToDelete) {
          setGroupCategory(updated[0] || 'General Lounge');
        }
        try {
          await saveBuzzCategories(updated);
          setActionSuccess(`Category "${catToDelete}" deleted.`);
          setTimeout(() => setActionSuccess(null), 3000);
        } catch (err) {
          console.warn('Failed to delete category:', err);
        }
      }
    );
  };

  const openCreateModal = () => {
    setEditingGroup(null);
    setGroupName('');
    setGroupDesc('');
    setGroupCategory(categories[0] || 'General Lounge');
    setGroupImageUrl('');
    setAllowStudentsChat(true);
    setIsProOnly(false);
    setIsAdminOnly(false);
    setUploadError(null);
    setShowAddCategory(false);
    setIsModalOpen(true);
  };

  const openEditModal = (group: BuzzGroup) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupDesc(group.description);
    setGroupCategory(group.category || categories[0] || 'General Lounge');
    setGroupImageUrl(group.imageUrl || '');
    setAllowStudentsChat(group.allowStudentsChat !== false);
    setIsProOnly(!!group.isProOnly);
    setIsAdminOnly(!!group.isAdminOnly);
    setUploadError(null);
    setShowAddCategory(false);
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    try {
      setIsUploadingImage(true);
      setUploadError(null);
      const res = await uploadToCloudinary(file, 'ciya/buzz_groups');
      if (res && res.url) {
        setGroupImageUrl(res.url);
      } else {
        throw new Error('Upload completed without an image URL.');
      }
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setUploadError(err.message || 'Failed to upload group profile picture to Cloudinary.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setUploadError('Group name is required.');
      return;
    }

    try {
      setSaveLoading(true);
      setUploadError(null);
      const adminEmail = auth?.currentUser?.email || 'admin@ciya.academy';

      if (editingGroup) {
        await updateBuzzGroup(editingGroup.id, {
          name: groupName.trim(),
          description: groupDesc.trim(),
          category: groupCategory,
          imageUrl: groupImageUrl.trim() || undefined,
          allowStudentsChat: allowStudentsChat,
          isProOnly: isProOnly,
          isAdminOnly: isAdminOnly
        });
        setActionSuccess(`Group "${groupName}" updated successfully.`);
      } else {
        await createBuzzGroup({
          name: groupName.trim(),
          description: groupDesc.trim(),
          category: groupCategory,
          imageUrl: groupImageUrl.trim() || undefined,
          allowStudentsChat: allowStudentsChat,
          isProOnly: isProOnly,
          isAdminOnly: isAdminOnly,
          createdBy: adminEmail
        });
        setActionSuccess(`New group "${groupName}" created successfully.`);
      }

      setIsModalOpen(false);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      console.error('Failed to save group:', err);
      setUploadError(err.message || 'Error saving group to Realtime Database.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleToggleChat = async (group: BuzzGroup) => {
    const newState = !group.allowStudentsChat;
    // Optimistically update UI
    setGroups(prev => prev.map(g => g.id === group.id ? { ...g, allowStudentsChat: newState } : g));
    try {
      await toggleGroupStudentChat(group.id, newState);
      setActionSuccess(`Chat permissions updated: "${group.name}" is now ${newState ? 'Open to Student Chat' : 'Admin Announcements Only'}.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to toggle group chat permission:', err);
      // Revert state if failed
      setGroups(prev => prev.map(g => g.id === group.id ? { ...g, allowStudentsChat: group.allowStudentsChat } : g));
      setActionSuccess(`Failed to update chat permission: ${err?.message || 'Permission denied'}`);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const handleDeleteGroup = (group: BuzzGroup) => {
    openConfirm(
      'Delete Group',
      `Are you sure you want to delete "${group.name}"? This action is permanent and will remove all chat history from the Realtime Database and Firestore.`,
      async () => {
        try {
          await deleteBuzzGroup(group.id);
          setActionSuccess(`Group "${group.name}" was successfully removed.`);
          setTimeout(() => setActionSuccess(null), 3000);
        } catch (err) {
          console.error('Failed to delete group:', err);
        }
      }
    );
  };

  const filteredGroups = groups.filter(g => {
    if (filterCategory === 'all') return true;
    return (g.category || '').toLowerCase() === filterCategory.toLowerCase();
  });

  const activeChatGroupsCount = groups.filter(g => g.allowStudentsChat !== false).length;
  const announcementsOnlyCount = groups.filter(g => g.allowStudentsChat === false).length;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Firebase Realtime Database (RTDB)
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Media via Cloudinary • 50-Msg Window
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Student Live Chat & Groups Manager
          </h1>
          <p className="text-sm text-slate-600 font-medium mt-1 max-w-2xl">
            Create and organize student study groups, upload cohort cover avatars, and control whether students can chat or if the channel is reserved for administrator announcements.
          </p>
        </div>

        <button
          id="admin-create-group-btn"
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer hover:scale-102 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Create New Group
        </button>
      </div>

      {/* Success Notification Alert */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-semibold flex items-center gap-2 shadow-xs">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{groups.length}</div>
            <div className="text-xs font-semibold text-slate-500">Total Live Groups</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <MessageSquare className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600">{activeChatGroupsCount}</div>
            <div className="text-xs font-semibold text-slate-500">Open Student Chat</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Lock className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600">{announcementsOnlyCount}</div>
            <div className="text-xs font-semibold text-slate-500">Announcements Only</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Radio className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-2xl font-black text-teal-600">{onlineUsers.length}</div>
            <div className="text-xs font-semibold text-slate-500">Active Students Online</div>
          </div>
        </div>
      </div>

      {/* Filters & Groups List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">Configured Study Groups</h2>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {filteredGroups.length} groups matching filter
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Filter by Category:</span>
            <CustomDropdown
              value={filterCategory}
              onChange={val => setFilterCategory(val)}
              options={[
                { label: 'All Categories', value: 'all' },
                ...categories.map(cat => ({ label: cat, value: cat }))
              ]}
              className="min-w-[160px]"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="text-sm font-medium">Loading groups from Realtime Database...</span>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <Users className="w-12 h-12 mx-auto text-slate-300" />
            <div className="font-bold text-slate-700">No Groups Found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No groups match the current category filter. Try selecting "All Categories".
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredGroups.map((group) => {
              const canStudentsChat = group.allowStudentsChat !== false;

              return (
                <div
                  key={group.id}
                  className="p-5 sm:p-6 hover:bg-slate-50/60 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  {/* Left: Avatar & Info */}
                  <div className="flex items-start sm:items-center gap-4 min-w-0">
                    {/* Profile Picture */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 shadow-xs flex items-center justify-center relative">
                      {group.imageUrl ? (
                        <img 
                          src={group.imageUrl} 
                          alt={group.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Users className="w-8 h-8 text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                          {group.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                          {group.category}
                        </span>
                        
                        {canStudentsChat ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> Students Can Chat
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Announcements Only
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-slate-600 font-medium line-clamp-2 leading-relaxed">
                        {group.description || 'No description provided.'}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-medium pt-0.5">
                        <span>Members: ~{group.membersCount || 1}</span>
                        {group.lastMessage && (
                          <span className="truncate max-w-xs text-slate-500">
                            Last: &quot;{group.lastMessage}&quot;
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Controls & Toggles */}
                  <div className="flex flex-wrap items-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                    {/* Student Chat Permission Switch */}
                    <div className="flex items-center gap-2 bg-slate-100/90 px-3 py-2 rounded-xl border border-slate-200">
                      <div className="text-left">
                        <div className="text-[11px] font-extrabold text-slate-800 leading-none">
                          Student Chat
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">
                          {canStudentsChat ? 'Allowed' : 'Disabled (Only Admin)'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleChat(group)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          canStudentsChat ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                        aria-label="Toggle student chat permission"
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            canStudentsChat ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => openEditModal(group)}
                      className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="Edit group details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(group)}
                      className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                      title="Delete group"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Create / Edit Group */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {editingGroup ? 'Edit Study Group' : 'Create New Study Group'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Stored in Firebase Realtime Database
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold shrink-0 mt-3">
                {uploadError}
              </div>
            )}

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveGroup} className="flex-1 overflow-y-auto pr-1 sm:pr-2 py-3 space-y-4">
              {/* Group Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Group Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Prompt Engineering Cohort 3"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium !text-slate-900"
                />
              </div>

              {/* Group Category & Custom Category Manager */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Category *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddCategory(!showAddCategory)}
                    className="text-[11px] font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {showAddCategory ? 'Cancel' : 'Add Custom Category'}
                  </button>
                </div>

                {/* Inline Add Category Input */}
                {showAddCategory && (
                  <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Enter new category name..."
                        value={newCategoryName}
                        onChange={(e) => {
                          setNewCategoryName(e.target.value);
                          setCategoryError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCategory();
                          }
                        }}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-emerald-300 bg-white text-xs font-bold !text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddCategory()}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer shrink-0 shadow-2xs"
                      >
                        Add Category
                      </button>
                    </div>
                    {categoryError && (
                      <p className="text-[11px] text-rose-600 font-semibold">{categoryError}</p>
                    )}
                  </div>
                )}

                <CustomDropdown
                  value={groupCategory}
                  onChange={val => setGroupCategory(val)}
                  options={categories.map(cat => ({ label: cat, value: cat }))}
                  className="w-full"
                />

                {/* Categories Badge List with Delete Option */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Categories ({categories.length}) — Click to select, ✕ to delete:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200/70">
                    {categories.map((cat) => (
                      <div 
                        key={cat}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          groupCategory === cat
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span 
                          onClick={() => setGroupCategory(cat)} 
                          className="cursor-pointer select-none"
                        >
                          {cat}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteCategory(cat);
                          }}
                          className={`p-1 rounded transition-colors cursor-pointer z-10 ${
                            groupCategory === cat
                              ? 'text-emerald-100 hover:text-white hover:bg-emerald-500'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                          title={`Delete category "${cat}"`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Profile Picture Upload directly to Cloudinary */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Group Profile Picture / Cover Avatar
                </label>
                
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                    {isUploadingImage ? (
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    ) : groupImageUrl ? (
                      <img
                        src={groupImageUrl}
                        alt="Group avatar"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />

                    <button
                      type="button"
                      disabled={isUploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {isUploadingImage ? 'Uploading to Cloudinary...' : 'Upload Image'}
                    </button>

                    <p className="text-[11px] text-slate-500">
                      Uploaded directly to Cloudinary. URL is saved in RTDB.
                    </p>
                  </div>
                </div>

                {groupImageUrl && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <span className="truncate max-w-xs">{groupImageUrl}</span>
                    <button
                      type="button"
                      onClick={() => setGroupImageUrl('')}
                      className="text-rose-500 hover:text-rose-700 font-bold shrink-0"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Small Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Small Description *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="A short description of the cohort's focus or rules..."
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium resize-none !text-slate-900"
                />
              </div>

              {/* Toggle: Allow Students to Chat */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                    {allowStudentsChat ? (
                      <Unlock className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Lock className="w-4 h-4 text-amber-600" />
                    )}
                    Allow Students to Chat & Comment
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {allowStudentsChat 
                      ? 'Students and instructors can send messages freely.' 
                      : 'Announcement mode: only admins can post messages.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setAllowStudentsChat(!allowStudentsChat)}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    allowStudentsChat ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                  aria-label="Toggle student chat permission"
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      allowStudentsChat ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle: Pro Members Only */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <ShieldAlert className={`w-4 h-4 ${isProOnly ? 'text-indigo-600' : 'text-slate-400'}`} />
                    Pro Members Only
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    If enabled, only users with Pro membership can access this group.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsProOnly(!isProOnly)}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isProOnly ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isProOnly ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle: Admin Only */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Shield className={`w-4 h-4 ${isAdminOnly ? 'text-rose-600' : 'text-slate-400'}`} />
                    Admin Only
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    If enabled, this group is hidden from all users except Admins.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAdminOnly(!isAdminOnly)}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isAdminOnly ? 'bg-rose-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isAdminOnly ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Fixed Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:text-slate-800 text-sm font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading || isUploadingImage}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                >
                  {saveLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingGroup ? 'Save Changes' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${confirmModal.type === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">{confirmModal.title}</h3>
            <p className="text-sm text-slate-600 font-medium mb-6 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={closeConfirmModal}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all shadow-sm cursor-pointer ${
                  confirmModal.type === 'danger' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
