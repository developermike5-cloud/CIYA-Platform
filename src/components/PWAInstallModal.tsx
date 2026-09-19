import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share, PlusSquare, Smartphone, CheckCircle, Download, RefreshCw } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PWAInstallModal({ isOpen, onClose }: PWAInstallModalProps) {
  const { isInstallable, isInstalled, isIOS, installApp, needRefresh, updateServiceWorker } = usePWAInstall();

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (isInstallable) {
      const installed = await installApp();
      if (installed) {
        onClose();
      }
    } else {
      // If browser hasn't fired the event yet, alert the user to use manual menu
      alert('The native installation prompt is not yet ready. Please use your browser\'s menu (⋮ or ...) and select "Install app" or "Add to Home Screen" to install CIYA manually.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Card */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="relative z-10 w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl border border-slate-100 text-left overflow-hidden pb-[max(env(safe-area-inset-bottom),24px)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">Install CIYA App</h3>
                <p className="text-xs text-slate-500 font-semibold">Fast access & offline caching</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center border-0 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="py-5 space-y-5">
            {/* Native App Benefits - Always shown to reinforce value */}
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-xs">
                <Download className="w-4 h-4 shrink-0" />
                <span>Native App Benefits</span>
              </div>
              <ul className="text-xs text-slate-600 font-semibold space-y-1.5 pl-4 list-disc">
                <li>Launch instantly from your home screen or desktop</li>
                <li>Full-screen view without browser address bars</li>
                <li>Automatic offline caching of course workspaces</li>
              </ul>
            </div>

            {/* Action Section */}
            <div className="space-y-4">
              {needRefresh ? (
                /* 1. Update Path: App is installed but needs an update */
                <button
                  type="button"
                  onClick={() => updateServiceWorker()}
                  className="w-full py-4 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all border-0 cursor-pointer"
                >
                  <RefreshCw className="w-5 h-5 animate-spin-slow" />
                  Update to Latest Version
                </button>
              ) : isInstalled ? (
                /* 2. Success Path: App is already installed and up to date */
                <div className="flex flex-col items-center justify-center py-2 space-y-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-wider">App is Up to Date</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-semibold text-center leading-relaxed">
                    You are already running the full CIYA standalone experience.
                  </p>
                </div>
              ) : isIOS ? (
                /* 3. iOS Path: Manual interaction required by Apple */
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
                    <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                      <span className="text-indigo-600">iOS Notice:</span> Tap the <strong className="text-slate-900">Share</strong> button and then <strong className="text-slate-900">"Add to Home Screen"</strong> to install CIYA manually.
                    </p>
                  </div>
                  <div className="flex justify-center gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500"><Share className="w-4 h-4" /></div>
                      <span className="text-[9px] font-bold text-slate-400">Share</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500"><PlusSquare className="w-4 h-4" /></div>
                      <span className="text-[9px] font-bold text-slate-400">Add to Home</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* 4. Desktop/Android Path: Native install or manual fallback */
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="w-full py-4 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all border-0 cursor-pointer"
                  >
                    <Download className="w-5 h-5" />
                    {isInstallable ? 'Install Now' : 'Check for Installation'}
                  </button>

                  {!isInstallable && (
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                      <p className="text-[11px] text-amber-800 font-bold leading-relaxed">
                        <span className="block mb-1">💡 Manual Installation:</span>
                        If the "Install" button doesn't trigger, use your browser menu (<strong className="font-black">⋮</strong>) and select <strong className="font-black">"Install app"</strong> or <strong className="font-black">"Add to Home Screen"</strong>.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
