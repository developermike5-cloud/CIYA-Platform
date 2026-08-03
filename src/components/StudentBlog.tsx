import React, { useEffect, useState } from 'react';
import { BookOpen, Calendar, User, ArrowLeft, Loader2, Megaphone, ExternalLink, Share2, Check } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { preprocessMarkdown, stripMarkdown } from '../utils/markdownUtils';
import { safeStorage } from '../utils/safeStorage';
import staticBlogs from '../data/blog.json';

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

interface StudentBlogProps {
  isLocked?: boolean;
}

export const StudentBlog: React.FC<StudentBlogProps> = ({ isLocked = false }) => {
  // Read strictly from static blogs JSON
  const [posts] = useState<BlogPost[]>(staticBlogs as BlogPost[]);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Auto-select article if navigated via announcement link or stored article ID
  useEffect(() => {
    const checkAndSelectArticle = (targetId?: string) => {
      const storedId = targetId || safeStorage.getItem('ciya_selected_article_id');
      if (storedId && posts.length > 0) {
        const match = posts.find(p => p.id === storedId || p.title.toLowerCase().includes(storedId.toLowerCase()));
        if (match) {
          setSelectedPost(match);
          safeStorage.removeItem('ciya_selected_article_id');
        }
      }
    };

    checkAndSelectArticle();

    const handleNavigateEvent = (e: any) => {
      if (e.detail) {
        checkAndSelectArticle(e.detail);
      }
    };

    window.addEventListener('ciya_navigate_article', handleNavigateEvent);
    return () => {
      window.removeEventListener('ciya_navigate_article', handleNavigateEvent);
    };
  }, [posts]);

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

  useEffect(() => {
    setLoading(false);
  }, [isLocked]);

  if (isLocked) {
    return (
      <div id="blog-locked-container" className="bg-white border text-sm border-slate-200 rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto shadow-sm my-6 font-sans">
        <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-8 h-8 text-rose-500" />
        </div>
        <h3 className="text-xl font-black text-slate-800 tracking-tight">CIYA Blog Desk Locked</h3>
        <p className="text-slate-500 mt-3 text-sm leading-relaxed font-semibold">
          The CIYA official blog and resource articles section is temporarily locked by administrators. Please reach out to your instructor or coach for more coordinates!
        </p>
        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center items-center gap-2 text-xs text-slate-400 font-bold">
          <span>🛡️ CIYA Guarded Academy Portal</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div id="blog-loading-state" className="flex flex-col items-center justify-center py-20 text-slate-500 font-sans">
        <Loader2 className="w-10 h-10 animate-spin text-teal-600 mb-4" />
        <p className="text-sm font-bold">Fetching latest articles from the CIYA desk...</p>
      </div>
    );
  }

  if (selectedPost) {
    return (
      <div id="blog-detail-container" className="max-w-3xl mx-auto font-sans pb-16 text-left">
        <button
          id="blog-back-btn"
          onClick={() => setSelectedPost(null)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold text-xs bg-slate-100 hover:bg-slate-200 border-0 rounded-xl px-4 py-2.5 mb-6 cursor-pointer transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Articles</span>
        </button>

        <article className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {selectedPost.imageUrl && (
            <div className="w-full h-64 md:h-96 relative overflow-hidden bg-slate-100 border-b border-slate-100">
              <img
                src={selectedPost.imageUrl}
                alt={selectedPost.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6 md:p-10 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-400 border-b pb-4 border-slate-100">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full text-slate-600">
                  <User className="w-3.5 h-3.5 text-teal-600" />
                  <span>By {selectedPost.author || 'CIYA Coach'}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span>
                    {getDisplayDate(selectedPost)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const articleLink = `/blog?id=${selectedPost.id}`;
                  navigator.clipboard.writeText(articleLink);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2500);
                }}
                className="flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200/80 px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition-all cursor-pointer shadow-2xs"
                title="Copy internal article link for announcements"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Article Link'}</span>
              </button>
            </div>

            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {selectedPost.title}
            </h1>

            <div className="border-t border-slate-100 pt-6">
              <div className="markdown-body prose prose-slate max-w-none text-slate-800 text-sm md:text-base leading-relaxed space-y-4">
                <ReactMarkdown
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-xl md:text-2xl font-black text-slate-900 mt-6 mb-2" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-lg md:text-xl font-black text-slate-900 mt-5 mb-2" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-base md:text-lg font-bold text-slate-900 mt-4 mb-1" {...props} />,
                    p: ({node, children, ...props}) => {
                      const hasImage = node?.children?.some((child: any) => child.type === 'element' && child.tagName === 'img');
                      if (hasImage) {
                        return <div className="whitespace-pre-wrap leading-relaxed mb-4 text-slate-700 font-medium" {...props}>{children}</div>;
                      }
                      return <p className="whitespace-pre-wrap leading-relaxed mb-4 text-slate-700 font-medium" {...props}>{children}</p>;
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
                    ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1 text-slate-700 font-medium" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1 text-slate-700 font-medium" {...props} />,
                    li: ({node, ...props}) => <li className="mb-1" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-extrabold text-slate-900" {...props} />,
                    em: ({node, ...props}) => <em className="italic text-slate-800" {...props} />,
                    del: ({node, ...props}) => <span className="bg-amber-100 text-amber-950 font-black px-1.5 py-0.5 rounded border border-amber-200/60 shadow-sm mx-0.5" {...props} />,
                    img: ({node, ...props}) => (
                      <div className="my-6 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-1 shadow-sm max-w-xl mx-auto">
                        <img className="w-full h-auto object-cover rounded-xl" referrerPolicy="no-referrer" {...props} />
                      </div>
                    ),
                  }}
                >
                  {preprocessMarkdown(selectedPost.content)}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div id="blog-main-container" className="max-w-5xl mx-auto font-sans pb-16 text-left">
      <div id="blog-header-card" className="bg-gradient-to-br from-slate-900 to-teal-950 border border-slate-800 text-teal-50 rounded-3xl p-6 md:p-8 shadow-sm mb-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-teal-500/10 blur-[80px] rounded-full" />
        <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 font-black px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1 mb-3">
          <BookOpen className="w-3 h-3" /> CIYA Knowledge Base
        </span>
        <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">📰 CIYA News & Article Desk</h3>
        <p className="text-slate-300 text-xs md:text-sm font-semibold leading-relaxed mt-2 max-w-2xl">
          Enhance your digital transformation career. Read deep tutorials, marketing scripts, and exclusive announcements compiled directly by your master coaches.
        </p>
      </div>

      {posts.length === 0 ? (
        <div id="blog-empty-state" className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-teal-100">
            <BookOpen className="w-8 h-8 text-teal-600" />
          </div>
          <h4 className="text-lg font-extrabold text-slate-800">No Articles Found</h4>
          <p className="text-slate-500 text-xs font-semibold mt-2 max-w-md mx-auto">
            Our writing desk is currently compiling brand new resources. Check back shortly to access high-conversion guidelines!
          </p>
        </div>
      ) : (
        <div id="blog-grid" className="flex flex-col gap-5 max-w-4xl mx-auto">
          {posts.map((post) => {
            const plainText = stripMarkdown(post.content);
            const wordCount = plainText.split(/\s+/).filter(Boolean).length;
            const readTime = Math.max(1, Math.ceil(wordCount / 200));

            return (
              <div
                key={post.id}
                id={`blog-card-${post.id}`}
                onClick={() => setSelectedPost(post)}
                className="bg-white border border-slate-200 hover:border-teal-500/30 rounded-3xl overflow-hidden hover:shadow-lg hover:shadow-slate-100/50 transition-all duration-300 flex flex-col md:flex-row group cursor-pointer text-left"
              >
                {post.imageUrl ? (
                  <div className="w-full md:w-56 h-48 md:h-auto min-h-[170px] bg-slate-50 relative overflow-hidden flex-shrink-0">
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="w-full md:w-56 h-48 md:h-auto min-h-[170px] bg-slate-50 flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 flex-shrink-0">
                    <BookOpen className="w-10 h-10 text-slate-300" />
                  </div>
                )}

                <div className="p-5 md:p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <span className="text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">{post.author || 'CIYA Coach'}</span>
                      <span>•</span>
                      <span>
                        {getDisplayDate(post)}
                      </span>
                    </div>

                    <h4 className="text-base md:text-lg font-black text-slate-900 group-hover:text-teal-600 transition-colors line-clamp-2 leading-snug">
                      {post.title}
                    </h4>

                    <p className="text-xs font-semibold text-slate-500 line-clamp-3 leading-relaxed">
                      {plainText}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[10px] font-black text-teal-600 group-hover:text-teal-700 transition-all uppercase tracking-wider flex items-center gap-1">
                      Read Article <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md">
                      ⏳ {readTime} min read
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
