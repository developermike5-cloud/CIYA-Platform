import React from 'react';

/**
 * CIYA Membership Badge preview: an HTML/CSS rebuild of the badge template
 * so the student's own uploaded profile photo sits inside the real badge
 * design, with all of the badge's info visible.
 */
export default function CiyaBadgePreview({ userProfile, active = false }: { userProfile: any; active?: boolean }) {
  const name = userProfile?.fullName || 'CIYA Student';
  const initials = name.trim().split(/\s+/).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const memberId = String(userProfile?.myReferralCode || userProfile?.uid || 'CIYA').toUpperCase().slice(0, 8);
  const memberSince = (() => {
    try {
      const c = userProfile?.createdAt;
      const d = c instanceof Date ? c : c?.toDate ? c.toDate() : c ? new Date(c) : new Date();
      return isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
    } catch {
      return new Date().getFullYear();
    }
  })();

  return (
    <div className="relative w-full max-w-[340px] mx-auto rounded-[26px] overflow-hidden text-left shadow-2xl border-4 border-amber-300/80 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 font-sans">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-8 w-40 h-40 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-white font-black tracking-[0.3em] text-sm leading-none">CIYA</p>
            <p className="text-emerald-200/80 text-[9px] font-black uppercase tracking-[0.25em] mt-1">Academy</p>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest bg-amber-400 text-amber-950 px-2.5 py-1 rounded-full shrink-0">
            Premium Member
          </span>
        </div>

        {/* Photo + name */}
        <div className="mt-5 flex items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-amber-300/70 bg-emerald-950 flex items-center justify-center shrink-0 shadow-lg">
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt="Member photo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-2xl font-black text-amber-200">{initials || 'C'}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-300/80">Member Name</p>
            <p className="text-white font-black text-lg leading-tight truncate">{name}</p>
            <p className="text-[10px] font-bold text-emerald-100/70 mt-1">Membership Badge Holder</p>
          </div>
        </div>

        {/* Badge details */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-emerald-300/70">Member ID</p>
            <p className="text-white font-mono font-black text-sm">{memberId}</p>
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-emerald-300/70">Member Since</p>
            <p className="text-white font-mono font-black text-sm">{memberSince}</p>
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-emerald-300/70">Badge Tier</p>
            <p className="text-white font-mono font-black text-sm">GOLD</p>
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-emerald-300/70">Status</p>
            <p className={`font-mono font-black text-sm ${active ? 'text-amber-300' : 'text-slate-300/80'}`}>{active ? 'ACTIVE' : 'INACTIVE'}</p>
          </div>
        </div>

        {/* Footer strip */}
        <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-200/60">CIYA Academy Membership Badge</p>
          <span className="text-base shrink-0">🏅</span>
        </div>
      </div>
    </div>
  );
}
