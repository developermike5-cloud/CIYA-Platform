import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, triggerSystemSignal } from '../../firebase';
import { BookOpen, Plus, Trash2, Edit2, Link as LinkIcon, Image as ImageIcon, Send, RefreshCw, X, Eye, FileText, Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Highlighter, Pilcrow } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { preprocessMarkdown, stripMarkdown } from '../../utils/markdownUtils';

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
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [author, setAuthor] = useState('CIYA Team');
  const [publishedDate, setPublishedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formTab, setFormTab] = useState<'write' | 'preview'>('write');

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
    const blogRef = collection(db, 'blog');
    const q = query(blogRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list: BlogPost[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as BlogPost);
        });
        setPosts(list);
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'blog');
        setLoading(false);
        showToast('error', 'Failed to sync articles list from server.');
      }
    );

    return () => unsubscribe();
  }, []);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showToast('error', 'Title and Content body are required fields!');
      return;
    }

    setSubmitting(true);
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
        showToast('success', 'Article successfully updated!');
      } else {
        const blogRef = collection(db, 'blog');
        await addDoc(blogRef, {
          ...payload,
          createdAt: serverTimestamp(),
        });
        await triggerSystemSignal('blog');
        showToast('success', 'New article successfully published to the blog!');
      }

      // Reset Form state
      resetForm();
    } catch (err: any) {
      handleFirestoreError(err, isEditing ? OperationType.UPDATE : OperationType.CREATE, 'blog');
      showToast('error', `Failed to submit post: ${err.message || 'unknown error'}`);
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
    if (!window.confirm("Are you absolutely sure you want to permanently delete this blog post? This action is irreversible.")) {
      return;
    }

    try {
      const docRef = doc(db, 'blog', postId);
      await deleteDoc(docRef);
      await triggerSystemSignal('blog');
      showToast('success', 'Article has been deleted successfully.');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, 'blog');
      showToast('error', `Failed to delete article: ${err.message}`);
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

            {/* Post Image Link */}
            <div className="space-y-1.5">
              <label htmlFor="blog-input-image" className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                <span>Image Link URL</span>
              </label>
              <input
                id="blog-input-image"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="e.g. https://images.unsplash.com/photo-..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-semibold rounded-xl py-3 px-4 text-xs focus:border-teal-500 outline-none transition-all shadow-inner"
              />
              <p className="text-[10px] text-slate-400 font-bold pl-1">
                Provide a direct web link to an online image.
              </p>
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
                  <button
                    type="button"
                    title="Insert Image Link"
                    onClick={() => insertAtCursor("![Image Alt](", ")")}
                    className="p-1.5 hover:bg-slate-200 rounded-md text-slate-700 transition-all flex items-center justify-center border-0 cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>
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
                                className="text-teal-600 hover:text-teal-800 underline font-extrabold transition-colors cursor-pointer decoration-2 decoration-teal-300 hover:decoration-teal-600" 
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
            <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>📋 Published Articles ({posts.length})</span>
            </h3>

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
                        onClick={() => handleDelete(post.id)}
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
    </div>
  );
}
