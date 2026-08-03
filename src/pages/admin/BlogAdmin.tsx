import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, triggerSystemSignal } from '../../firebase';
import { BookOpen, Plus, Trash2, Edit2, Link as LinkIcon, Image as ImageIcon, Send, RefreshCw, X, Eye, FileText, Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Highlighter, Pilcrow, Megaphone, Download, Upload } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { preprocessMarkdown, stripMarkdown } from '../../utils/markdownUtils';
import staticBlogs from '../../data/blog.json';
import staticAnnouncements from '../../data/announcements.json';
import { uploadToCloudinary, rejectSubmissionMedia } from '../../lib/cloudinaryService';

interface CarouselAnnouncement {
  id: string;
  title: string;
  link: string;
  category?: string;
}

interface BlogPost {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  author?: string;
  createdAt?: any;
  updatedAt?: any;
  publishedDate?: string;
}

export default function BlogAdmin() {
  const [posts, setPosts] = useState<BlogPost[]>(() => {
    try {
      const stored = localStorage.getItem('ciya_cached_blogs');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Error reading cached blogs:", e);
    }
    return staticBlogs as BlogPost[];
  });
  const [loading, setLoading] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'blog' | 'announcements'>('blog');

  // Helper to save blogs locally & trigger sync
  const saveBlogsLocal = (updated: BlogPost[]) => {
    setPosts(updated);
    try {
      localStorage.setItem('ciya_cached_blogs', JSON.stringify(updated));
    } catch (e) {
      console.error("Error storing cached blogs:", e);
    }
  };

  // Sync with Firestore if available
  useEffect(() => {
    try {
      const q = query(collection(db, 'blog'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const fetchedPosts: BlogPost[] = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<BlogPost, 'id'>)
          }));
          saveBlogsLocal(fetchedPosts);
        }
      }, (err) => {
        console.warn("Firestore blog snapshot error, using local/static fallback:", err);
      });
      return () => unsubscribe();
    } catch (err) {
      console.warn("Blog Firestore listener setup warning:", err);
    }
  }, []);

  // Announcements state
  const [announcements, setAnnouncements] = useState<CarouselAnnouncement[]>(() => {
    try {
      const stored = localStorage.getItem('ciya_cached_announcements');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error(e);
    }
    return staticAnnouncements as CarouselAnnouncement[];
  });

  const [isEditingAnn, setIsEditingAnn] = useState(false);
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annLink, setAnnLink] = useState('');
  const [annCategory, setAnnCategory] = useState<'Blog' | 'Report' | 'General'>('Blog');
  const [deleteModalAnnId, setDeleteModalAnnId] = useState<string | null>(null);

  const saveAnnouncementsLocal = (updated: CarouselAnnouncement[]) => {
    setAnnouncements(updated);
    try {
      localStorage.setItem('ciya_cached_announcements', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const downloadAnnouncementsJSON = () => {
    try {
      const dataStr = JSON.stringify(announcements, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = 'announcements.json';
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      showToast('success', 'announcements.json downloaded successfully! Send this to developer to update the codebase.');
    } catch (err: any) {
      showToast('error', `Failed to download file: ${err.message}`);
    }
  };

  const downloadBlogsJSON = () => {
    try {
      const dataStr = JSON.stringify(posts, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = 'blog.json';
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      showToast('success', 'blog.json downloaded successfully! Update src/data/blog.json with this file.');
    } catch (err: any) {
      showToast('error', `Failed to download file: ${err.message}`);
    }
  };

  const handleCreateOrUpdateAnn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim()) {
      showToast('error', 'Announcement text is required!');
      return;
    }

    let updatedAnnouncements = [...announcements];

    if (isEditingAnn && editingAnnId) {
      updatedAnnouncements = updatedAnnouncements.map(ann => 
        ann.id === editingAnnId 
          ? { ...ann, title: annTitle.trim(), link: annLink.trim(), category: annCategory } 
          : ann
      );
      showToast('success', 'Announcement edited in-memory! Don\'t forget to download the updated JSON.');
    } else {
      const newAnn: CarouselAnnouncement = {
        id: `ann-${Date.now()}`,
        title: annTitle.trim(),
        link: annLink.trim(),
        category: annCategory
      };
      updatedAnnouncements.push(newAnn);
      showToast('success', 'New announcement added in-memory! Don\'t forget to download the updated JSON.');
    }

    saveAnnouncementsLocal(updatedAnnouncements);
    resetAnnForm();
  };

  const handleDeleteAnn = (annId: string) => {
    const updated = announcements.filter(ann => ann.id !== annId);
    saveAnnouncementsLocal(updated);
    showToast('success', 'Announcement removed in-memory!');
  };

  const resetAnnForm = () => {
    setIsEditingAnn(false);
    setEditingAnnId(null);
    setAnnTitle('');
    setAnnLink('');
    setAnnCategory('Blog');
  };

  const handleEditAnnInit = (ann: CarouselAnnouncement) => {
    setIsEditingAnn(true);
    setEditingAnnId(ann.id);
    setAnnTitle(ann.title);
    setAnnLink(ann.link);
    setAnnCategory((ann.category as any) || 'Blog');
  };

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [author, setAuthor] = useState('CIYA Team');
  const [deleteModalPostId, setDeleteModalPostId] = useState<string | null>(null);
  const [publishedDate, setPublishedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formTab, setFormTab] = useState<'write' | 'preview'>('write');

  // Cloudinary Upload States
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingInline, setUploadingInline] = useState(false);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const res = await uploadToCloudinary(file, { folder: 'ciya_blog_covers' });
      if (res.url) {
        setImageUrl(res.url);
        showToast('success', 'Article image uploaded directly to Cloudinary!');
      } else {
        showToast('error', 'Upload failed. Please try again.');
      }
    } catch (err: any) {
      console.error("Cover image upload error:", err);
      showToast('error', err.message || 'Error uploading article image');
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingInline(true);
    try {
      const res = await uploadToCloudinary(file, { folder: 'ciya_blog_inline' });
      if (res.url) {
        const alt = file.name.replace(/\.[^/.]+$/, "");
        const markdownImg = `\n\n![${alt}](${res.url})\n\n`;
        insertAtCursor(markdownImg);
        showToast('success', 'Inline image uploaded to Cloudinary & inserted into article!');
      } else {
        showToast('error', 'Inline image upload failed.');
      }
    } catch (err: any) {
      console.error("Inline image upload error:", err);
      showToast('error', err.message || 'Error uploading inline image');
    } finally {
      setUploadingInline(false);
      e.target.value = '';
    }
  };

  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const getDisplayDate = (post: BlogPost) => {
    if (post.publishedDate) {
      try {
        const parts = post.publishedDate.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const date = new Date(year, month, day);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
      } catch (e) {
        // ignore
      }
      return post.publishedDate;
    }
    return post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent';
  };

  const insertAtCursor = (beforeText: string, afterText: string = "") => {
    const textarea = document.getElementById("blog-input-content") as HTMLTextAreaElement;
    if (!textarea) {
      // Fallback if textarea is not in focus/rendered
      setContent(prev => prev + beforeText + afterText);
      return;
    }

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(startPos, endPos);

    const replacement = beforeText + (selectedText || "") + afterText;
    const newValue = text.substring(0, startPos) + replacement + text.substring(endPos);
    
    setContent(newValue);
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = startPos + beforeText.length + (selectedText || "").length + afterText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    // Loaded statically from blog.json to prevent DB egress costs
    setLoading(false);
  }, []);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showToast('error', 'Title and Content body are required fields!');
      return;
    }

    setSubmitting(true);
    const targetId = isEditing && editingId ? editingId : `blog-${Date.now()}`;

    const newOrUpdatedPost: BlogPost = {
      id: targetId,
      title: title.trim(),
      content: content.trim(),
      imageUrl: imageUrl.trim() || '',
      author: author.trim() || 'CIYA Coach',
      publishedDate: publishedDate || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString()
    };

    let updatedPosts = [...posts];
    if (isEditing && editingId) {
      updatedPosts = updatedPosts.map(p => p.id === editingId ? { ...p, ...newOrUpdatedPost } : p);
    } else {
      updatedPosts = [newOrUpdatedPost, ...updatedPosts];
    }

    // Save to local state and cache immediately
    saveBlogsLocal(updatedPosts);

    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        imageUrl: imageUrl.trim() || '',
        author: author.trim() || 'CIYA Coach',
        publishedDate: publishedDate || new Date().toISOString().split('T')[0],
        updatedAt: serverTimestamp(),
      };

      if (isEditing && editingId) {
        const docRef = doc(db, 'blog', editingId);
        await updateDoc(docRef, payload);
        await triggerSystemSignal('blog');
        showToast('success', 'Article updated! Changes reflected live. Click "Download Blog JSON" to export file.');
      } else {
        const blogRef = collection(db, 'blog');
        const docAdded = await addDoc(blogRef, {
          ...payload,
          createdAt: serverTimestamp(),
        });
        await triggerSystemSignal('blog');
        // Update local post ID with Firestore ID if generated
        if (docAdded?.id) {
          saveBlogsLocal(updatedPosts.map(p => p.id === targetId ? { ...p, id: docAdded.id } : p));
        }
        showToast('success', 'New article published! Click "Download Blog JSON" to export file.');
      }

      resetForm();
    } catch (err: any) {
      console.warn("Firestore sync notice (local changes saved):", err);
      showToast('success', 'Article saved locally & updated! Remember to download JSON if modifying code.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setTitle('');
    setContent('');
    setImageUrl('');
    setAuthor('CIYA Coach');
    setPublishedDate(new Date().toISOString().split('T')[0]);
  };

  const handleEditInit = (post: BlogPost) => {
    setIsEditing(true);
    setEditingId(post.id);
    setTitle(post.title);
    setContent(post.content);
    setImageUrl(post.imageUrl || '');
    setAuthor(post.author || 'CIYA Coach');
    setPublishedDate(post.publishedDate || (post.createdAt?.toDate ? post.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]));
  };

  const handleDelete = async (postId: string) => {
    const updatedPosts = posts.filter((p) => p.id !== postId);
    saveBlogsLocal(updatedPosts);

    try {
      const targetPost = posts.find((p) => p.id === postId);
      if (targetPost) {
        await rejectSubmissionMedia(targetPost);
      }
      const docRef = doc(db, 'blog', postId);
      await deleteDoc(docRef);
      await triggerSystemSignal('blog');
      showToast('success', 'Article deleted.');
    } catch (err: any) {
      console.warn("Firestore delete notice (removed locally):", err);
      showToast('success', 'Article deleted locally.');
    }
  };

  return (
    <div id="blog-admin-dashboard" className="space-y-8 font-sans">
      <div id="blog-admin-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            📰 CIYA Blog & Resource Manager
          </h1>
          <p className="text-xs text-slate-500 font-bold">
            Write, edit, update, or remove knowledge base articles served to all enrolled students.
          </p>
        </div>
        <div>
          {isEditing && (
            <button
              id="admin-blog-cancel-edit-btn"
              onClick={resetForm}
              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl transition-colors border-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Cancel Edit Mode</span>
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div
          id="admin-blog-toast"
          className={`p-4 rounded-xl text-xs font-bold shadow-md transition-all animate-bounce ${
            toast.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {toast.type === 'success' ? '✓ ' : '⚠ '} {toast.msg}
        </div>
      )}

      {/* Tab Selector */}
      <div className="flex border-b border-slate-200 select-none mb-6">
        <button
          onClick={() => setActiveTab('blog')}
          className={`px-6 py-3 border-b-2 font-black text-xs uppercase tracking-wider transition-all cursor-pointer border-0 bg-transparent ${
            activeTab === 'blog'
              ? 'border-teal-600 text-teal-700 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600 font-bold'
          }`}
        >
          📰 Blog Articles Manager
        </button>
        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-6 py-3 border-b-2 font-black text-xs uppercase tracking-wider transition-all cursor-pointer border-0 bg-transparent ${
            activeTab === 'announcements'
              ? 'border-amber-500 text-amber-700 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600 font-bold'
          }`}
        >
          📣 Carousels Announcements
        </button>
      </div>

      {activeTab === 'blog' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Editor Form Panel */}
          <div className="lg:col-span-5">
            <form
              id="admin-blog-form"
              onSubmit={handleCreateOrUpdate}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5"
            >
              <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase border-b border-slate-100 pb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-600" />
                {isEditing ? '✏️ Edit Knowledge Article' : '➕ Write New Article'}
              </h3>

              {/* Author Name */}
              <div className="space-y-1.5">
                <label htmlFor="blog-input-author" className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Author Identity / Team Role
                </label>
                <input
                  id="blog-input-author"
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. CIYA Coach, Tech Lead Mike"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-semibold rounded-xl py-3 px-4 text-xs focus:border-teal-500 outline-none transition-all shadow-inner"
                />
              </div>

              {/* Post Title */}
              <div className="space-y-1.5">
                <label htmlFor="blog-input-title" className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Post Title
                </label>
                <input
                  id="blog-input-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Setting Up Your First High-Ticket Campaign"
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-semibold rounded-xl py-3 px-4 text-xs focus:border-teal-500 outline-none transition-all shadow-inner"
                />
              </div>

              {/* Post Cover Image (Direct Upload to Cloudinary) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
                    <span>Article Cover Image</span>
                  </span>
                  {uploadingCover && <span className="text-teal-600 font-bold animate-pulse text-[10px]">Uploading to Cloudinary...</span>}
                </label>

                {imageUrl ? (
                  <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 p-2 group">
                    <img 
                      src={imageUrl} 
                      alt="Cover Preview" 
                      className="w-full h-36 object-cover rounded-xl border border-slate-200" 
                    />
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <label className="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-white text-[10px] font-black uppercase rounded-xl cursor-pointer shadow-md backdrop-blur-sm transition-all flex items-center gap-1">
                        <Upload className="w-3 h-3" />
                        <span>Change</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleCoverUpload} 
                          className="hidden" 
                          disabled={uploadingCover}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-xl shadow-md backdrop-blur-sm transition-all border-0 cursor-pointer"
                        title="Remove Image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="w-full h-32 border-2 border-dashed border-slate-300 hover:border-teal-500 bg-slate-50 hover:bg-teal-50/30 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all p-4 text-center group">
                    {uploadingCover ? (
                      <div className="flex flex-col items-center gap-2 text-teal-600">
                        <RefreshCw className="w-6 h-6 animate-spin" />
                        <span className="text-xs font-black uppercase tracking-wider">Uploading to Cloudinary...</span>
                      </div>
                    ) : (
                      <>
                        <div className="p-2.5 bg-white group-hover:bg-teal-600 group-hover:text-white text-slate-600 rounded-xl shadow-xs transition-all mb-1 border border-slate-200">
                          <Upload className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-black text-slate-800 tracking-tight">
                          Click to upload article image
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                          Directly select image file from your device
                        </span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleCoverUpload} 
                      className="hidden" 
                      disabled={uploadingCover}
                    />
                  </label>
                )}
              </div>

              {/* Custom Published Date */}
              <div className="space-y-1.5">
                <label htmlFor="blog-input-date" className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Custom Published Date
                </label>
                <input
                  id="blog-input-date"
                  type="date"
                  value={publishedDate}
                  onChange={(e) => setPublishedDate(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-semibold rounded-xl py-3 px-4 text-xs focus:border-teal-500 outline-none transition-all shadow-inner"
                />
                <p className="text-[10px] text-slate-400 font-bold pl-1">
                  Select custom display date. Defaults to today's date.
                </p>
              </div>

              {/* Post Content */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Article Content / Main Body
                  </label>
                  
                  {/* Editor Tabs */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border text-[10px] font-bold self-end sm:self-auto select-none">
                    <button
                      type="button"
                      onClick={() => setFormTab('write')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all border-0 cursor-pointer ${
                        formTab === 'write'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <FileText className="w-3 h-3 text-indigo-500" />
                      <span>Write</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormTab('preview')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all border-0 cursor-pointer ${
                        formTab === 'preview'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <Eye className="w-3 h-3 text-emerald-500" />
                      <span>Live Preview</span>
                    </button>
                  </div>
                </div>

                {/* Toolbar Actions (Only in Write tab) */}
                {formTab === 'write' && (
                  <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      title="Heading 1"
                      onClick={() => insertAtCursor("# ")}
                      className="p-1.5 hover:bg-slate-200 rounded-md text-slate-700 transition-all flex items-center justify-center border-0 cursor-pointer"
                    >
                      <Heading1 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Heading 2"
                      onClick={() => insertAtCursor("## ")}
                      className="p-1.5 hover:bg-slate-200 rounded-md text-slate-700 transition-all flex items-center justify-center border-0 cursor-pointer"
                    >
                      <Heading2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Heading 3"
                      onClick={() => insertAtCursor("### ")}
                      className="p-1.5 hover:bg-slate-200 rounded-md text-slate-700 transition-all flex items-center justify-center border-0 cursor-pointer"
                    >
                      <Heading3 className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-4 bg-slate-300 mx-1" />
                    <button
                      type="button"
                      title="Bold Text"
                      onClick={() => insertAtCursor("**", "**")}
                      className="p-1.5 hover:bg-slate-200 rounded-md text-slate-700 transition-all flex items-center justify-center border-0 cursor-pointer font-bold"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Italic Text"
                      onClick={() => insertAtCursor("*", "*")}
                      className="p-1.5 hover:bg-slate-200 rounded-md text-slate-700 transition-all flex items-center justify-center border-0 cursor-pointer italic"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Highlight Text"
                      onClick={() => insertAtCursor("~~", "~~")}
                      className="p-1.5 bg-amber-50 hover:bg-amber-100 rounded-md text-amber-700 border border-amber-200 transition-all flex items-center justify-center cursor-pointer font-extrabold gap-1 px-2 text-[10px]"
                    >
                      <Highlighter className="w-3.5 h-3.5 text-amber-500" />
                      <span>Highlight</span>
                    </button>
                    <div className="w-px h-4 bg-slate-300 mx-1" />
                    <button
                      type="button"
                      title="New Paragraph Spacing"
                      onClick={() => insertAtCursor("\n\nNew Paragraph\n\n")}
                      className="p-1.5 hover:bg-slate-200 rounded-md text-slate-700 transition-all flex items-center justify-center border-0 cursor-pointer text-[10px] font-black gap-1 px-2"
                    >
                      <Pilcrow className="w-3.5 h-3.5 text-slate-500" />
                      <span>Paragraph</span>
                    </button>
                    <button
                      type="button"
                      title="Bullet List"
                      onClick={() => insertAtCursor("\n- ")}
                      className="p-1.5 hover:bg-slate-200 rounded-md text-slate-700 transition-all flex items-center justify-center border-0 cursor-pointer text-[10px] font-black gap-1 px-2"
                    >
                      <List className="w-3.5 h-3.5 text-slate-500" />
                      <span>Bullet</span>
                    </button>
                    <button
                      type="button"
                      title="Numbered List"
                      onClick={() => insertAtCursor("\n1. ")}
                      className="p-1.5 hover:bg-slate-200 rounded-md text-slate-700 transition-all flex items-center justify-center border-0 cursor-pointer text-[10px] font-black gap-1 px-2"
                    >
                      <ListOrdered className="w-3.5 h-3.5 text-slate-500" />
                      <span>Number</span>
                    </button>
                    <div className="w-px h-4 bg-slate-300 mx-1" />
                    <button
                      type="button"
                      title="Insert Link"
                      onClick={() => insertAtCursor("[", " | https://example.com]")}
                      className="p-1.5 hover:bg-slate-200 rounded-md text-slate-700 transition-all flex items-center justify-center border-0 cursor-pointer"
                    >
                      <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                    <label
                      title="Upload Image directly to Cloudinary and insert into article"
                      className={`p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-md transition-all flex items-center justify-center cursor-pointer text-[10px] font-extrabold gap-1 px-2 ${uploadingInline ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {uploadingInline ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-teal-600" />
                      )}
                      <span>{uploadingInline ? 'Uploading...' : 'Upload Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleInlineImageUpload}
                        className="hidden"
                        disabled={uploadingInline}
                      />
                    </label>
                    <span className="text-[9px] text-slate-400 font-bold ml-auto pr-1 select-none">
                      Markdown Supported 📝
                    </span>
                  </div>
                )}

                {/* View Switch */}
                {formTab === 'write' ? (
                  <textarea
                    id="blog-input-content"
                    rows={12}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write or paste your article body here. Spacing, headers, and links are fully supported. To link text, simply write [text | url], for example: [start now | https://example.com]"
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-semibold rounded-xl py-3 px-4 text-xs focus:border-teal-500 outline-none transition-all shadow-inner resize-y min-h-[250px]"
                  />
                ) : (
                  <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 min-h-[250px] max-h-[400px] overflow-y-auto text-left font-sans shadow-inner">
                    {content.trim() ? (
                      <div className="markdown-body prose prose-slate max-w-none text-slate-800 text-xs md:text-sm leading-relaxed space-y-3">
                        <ReactMarkdown
                          components={{
                            h1: ({node, ...props}) => <h1 className="text-lg md:text-xl font-black text-slate-900 mt-4 mb-2" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-base md:text-lg font-black text-slate-900 mt-3 mb-2" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-sm md:text-base font-bold text-slate-900 mt-2 mb-1" {...props} />,
                            p: ({node, children, ...props}) => {
                              const hasImage = node?.children?.some((child: any) => child.type === 'element' && child.tagName === 'img');
                              if (hasImage) {
                                return <div className="whitespace-pre-wrap leading-relaxed mb-3 text-slate-700 font-medium" {...props}>{children}</div>;
                              }
                              return <p className="whitespace-pre-wrap leading-relaxed mb-3 text-slate-700 font-medium" {...props}>{children}</p>;
                            },
                            a: ({node, href, ...props}) => {
                              const absoluteHref = href ? (
                                (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('/') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) 
                                  ? href 
                                  : `https://${href}`
                              ) : '';
                              return (
                                <a 
                                  className="text-teal-600 hover:text-teal-800 underline font-extrabold transition-colors cursor-pointer decoration-2 decoration-teal-300 hover:decoration-teal-650" 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  {...props} 
                                  href={absoluteHref}
                                />
                              );
                            },
                            ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-3 space-y-1 text-slate-700 font-medium" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-3 space-y-1 text-slate-700 font-medium" {...props} />,
                            li: ({node, ...props}) => <li className="mb-0.5" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-extrabold text-slate-900" {...props} />,
                            em: ({node, ...props}) => <em className="italic text-slate-800" {...props} />,
                            del: ({node, ...props}) => <span className="bg-amber-100 text-amber-950 font-black px-1.5 py-0.5 rounded border border-amber-200/60 shadow-sm mx-0.5" {...props} />,
                            img: ({node, ...props}) => (
                              <div className="my-4 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 p-1 shadow-sm max-w-sm mx-auto">
                                <img className="w-full h-auto object-cover rounded-lg" referrerPolicy="no-referrer" {...props} />
                              </div>
                            ),
                          }}
                        >
                          {preprocessMarkdown(content)}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400 font-bold text-xs select-none">
                        <span>👁️ No content written yet</span>
                        <p className="text-[10px] text-slate-400 mt-1">Start writing in the Edit tab to see live preview updates here.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                <button
                  id="admin-blog-submit-btn"
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all border-0 cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{isEditing ? 'Save Changes' : 'Publish Article'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Existing Articles Grid List */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase">
                  📋 Published Articles ({posts.length})
                </h3>
                <button
                  type="button"
                  onClick={downloadBlogsJSON}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-[11px] rounded-xl shadow-xs transition-all border-0 cursor-pointer"
                  title="Download all blog articles as blog.json for repository updates"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Blog JSON</span>
                </button>
              </div>

              {loading ? (
                <div className="py-20 text-center text-slate-400 font-bold flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
                  <span className="text-xs">Loading posts...</span>
                </div>
              ) : posts.length === 0 ? (
                <div className="py-20 text-center text-slate-400 font-bold space-y-2">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-xs">No articles published yet. Build your first insight using the editor form!</p>
                </div>
              ) : (
                <div id="admin-blog-list" className="mt-4 divide-y divide-slate-100 space-y-4">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      id={`admin-blog-item-${post.id}`}
                      className="pt-4 first:pt-0 flex gap-4 items-start justify-between group"
                    >
                      <div className="flex gap-3 items-start flex-1 min-w-0">
                        {post.imageUrl ? (
                          <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-150">
                            <img
                              src={post.imageUrl}
                              alt={post.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-teal-50 rounded-xl flex items-center justify-center shrink-0 border border-teal-100/50">
                            <BookOpen className="w-6 h-6 text-teal-600" />
                          </div>
                        )}

                        <div className="space-y-1 min-w-0 flex-1">
                          <h4 className="text-xs md:text-sm font-black text-slate-800 truncate leading-snug">
                            {post.title}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            By {post.author || 'CIYA Coach'} • {getDisplayDate(post)}
                          </p>
                          <p className="text-xs text-slate-500 font-semibold line-clamp-2 leading-relaxed">
                            {post.content}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 pl-2">
                        <button
                          id={`admin-blog-edit-${post.id}`}
                          onClick={() => handleEditInit(post)}
                          title="Edit Article"
                          className="p-2 hover:bg-slate-100 text-slate-500 hover:text-teal-600 rounded-lg border-0 bg-transparent cursor-pointer transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          id={`admin-blog-delete-${post.id}`}
                          onClick={() => setDeleteModalPostId(post.id)}
                          title="Delete Article"
                          className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border-0 bg-transparent cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Announcements Section Render */
        <div className="space-y-6">
          {/* Header Card & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-left">
            <div className="space-y-1">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Megaphone className="w-4 h-4 text-amber-500" />
                <span>Carousel Announcement Entries</span>
              </h2>
              <p className="text-xs text-slate-500 font-bold">
                Manage the horizontal carousel slides shown to students. Updates are in-memory; please download and submit the JSON file.
              </p>
            </div>
            
            <button
              onClick={downloadAnnouncementsJSON}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all border-0 cursor-pointer shadow-amber-500/10 active:scale-98 shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Download Carousel JSON</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
            {/* Announcement Form Panel */}
            <div className="lg:col-span-5">
              <form
                onSubmit={handleCreateOrUpdateAnn}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5"
              >
                <h3 className="text-xs font-black text-slate-800 tracking-tight uppercase border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-500" />
                  {isEditingAnn ? '✏️ Edit Announcement slide' : '➕ Create Announcement slide'}
                </h3>

                {/* Category Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Category Type
                  </label>
                  <select
                    value={annCategory}
                    onChange={(e) => setAnnCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-semibold rounded-xl py-3 px-4 text-xs focus:border-amber-500 outline-none transition-all shadow-inner"
                  >
                    <option value="Blog">Blog Post Announcement</option>
                    <option value="Report">Major Report Announcement</option>
                    <option value="General">General Broadcast</option>
                  </select>
                </div>

                {/* Announcement Title/Text */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Announcement Headline / Text
                  </label>
                  <textarea
                    rows={4}
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="e.g. Learn AI Website Development: Build responsive, high-converting platforms with zero code..."
                    required
                    maxLength={180}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-semibold rounded-xl py-3 px-4 text-xs focus:border-amber-500 outline-none transition-all shadow-inner resize-none"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-1">
                    <span>Keep text concise to fit single card spaces nicely.</span>
                    <span>{annTitle.length}/180</span>
                  </div>
                </div>

                {/* Action Link */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Target Hyperlink URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={annLink}
                    onChange={(e) => setAnnLink(e.target.value)}
                    placeholder="e.g. https://ciya.academy/blog (Optional)"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-semibold rounded-xl py-3 px-4 text-xs focus:border-amber-500 outline-none transition-all shadow-inner"
                  />
                </div>

                {/* Submit / Action Buttons */}
                <div className="flex gap-3 pt-2">
                  {isEditingAnn && (
                    <button
                      type="button"
                      onClick={resetAnnForm}
                      className="flex-1 py-3 bg-slate-150 hover:bg-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all border-0 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all border-0 cursor-pointer"
                  >
                    {isEditingAnn ? 'Save Announcement' : 'Add Announcement'}
                  </button>
                </div>
              </form>
            </div>

            {/* Announcement Grid List */}
            <div className="lg:col-span-7">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase border-b border-slate-100 pb-3">
                  <span>📋 Active Slides ({announcements.length})</span>
                </h3>

                {announcements.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 font-bold space-y-2">
                    <Megaphone className="w-12 h-12 text-slate-300 mx-auto" />
                    <p className="text-xs">No announcements created yet. Add one using the editor form!</p>
                  </div>
                ) : (
                  <div className="mt-4 divide-y divide-slate-100 space-y-4">
                    {announcements.map((ann) => (
                      <div
                        key={ann.id}
                        className="pt-4 first:pt-0 flex gap-4 items-start justify-between group"
                      >
                        <div className="flex gap-3 items-start flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 ${
                            ann.category === 'Report' ? 'bg-amber-50' : 'bg-teal-50'
                          }`}>
                            <Megaphone className={`w-5 h-5 ${
                              ann.category === 'Report' ? 'text-amber-600' : 'text-teal-600'
                            }`} />
                          </div>

                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full select-none border ${
                                ann.category === 'Report' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-teal-100 text-teal-800 border-teal-200'
                              }`}>
                                {ann.category || 'Announcement'}
                              </span>
                            </div>
                            <p className="text-xs font-extrabold text-slate-800 leading-normal">
                              {ann.title}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold truncate flex items-center gap-1">
                              <LinkIcon className="w-3 h-3 text-slate-400 shrink-0" />
                              <a href={ann.link} target="_blank" rel="noopener noreferrer" className="hover:underline text-teal-600">
                                {ann.link}
                              </a>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 pl-2">
                          <button
                            type="button"
                            onClick={() => handleEditAnnInit(ann)}
                            title="Edit Slide"
                            className="p-2 hover:bg-slate-100 text-slate-500 hover:text-amber-600 rounded-lg border-0 bg-transparent cursor-pointer transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteModalAnnId(ann.id)}
                            title="Delete Slide"
                            className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border-0 bg-transparent cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL TO AVOID IFRAME BLOCK */}
      {deleteModalPostId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[24px] max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-xl text-rose-650 select-none">
              ⚠️
            </div>
            <h3 className="font-extrabold text-lg text-slate-900 tracking-tight">Delete Blog Post?</h3>
            <p className="text-slate-505 text-xs font-semibold leading-relaxed">
              Are you sure you want to permanently delete this blog post? This action is irreversible.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteModalPostId(null)}
                className="flex-1 py-2.5 bg-slate-150 hover:bg-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const id = deleteModalPostId;
                  setDeleteModalPostId(null);
                  await handleDelete(id);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all border-0 cursor-pointer shadow-sm shadow-rose-600/15"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL FOR ANNOUNCEMENT DELETION */}
      {deleteModalAnnId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[24px] max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-xl text-rose-650 select-none">
              ⚠️
            </div>
            <h3 className="font-extrabold text-lg text-slate-900 tracking-tight">Delete Announcement?</h3>
            <p className="text-slate-505 text-xs font-semibold leading-relaxed">
              Are you sure you want to permanently delete this carousel announcement slide?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteModalAnnId(null)}
                className="flex-1 py-2.5 bg-slate-150 hover:bg-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const id = deleteModalAnnId;
                  setDeleteModalAnnId(null);
                  handleDeleteAnn(id);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all border-0 cursor-pointer shadow-sm shadow-rose-600/15"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
