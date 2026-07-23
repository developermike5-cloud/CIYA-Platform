import React, { useRef, useState } from 'react';
import { Download, Crown, Sparkles, Award, Mail, BookOpen, IdCard, Calendar } from 'lucide-react';

interface BadgeData {
  fullName: string;
  email: string;
  courseName: string;
  membershipId: string;
  expiryDate?: string;
  avatarUrl?: string;
  photoURL?: string;
}

interface CIYAMembershipBadgeProps {
  data: BadgeData;
  isSample?: boolean;
}

export default function CIYAMembershipBadge({ data, isSample = false }: CIYAMembershipBadgeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  // Safely load the real brand logo from local storage on component mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setCustomLogo(localStorage.getItem('ciya_brand_logo'));
    }
  }, []);

  // Format expiry date beautifully
  const displayExpiry = data.expiryDate
    ? new Date(data.expiryDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Never Expires';

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2D context');

      const width = 600;
      const height = 900;
      canvas.width = width;
      canvas.height = height;

      // 1. Draw Deep Metallic Slate/Navy Gradient Background
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width);
      bgGrad.addColorStop(0, '#0f172a'); // slate-900
      bgGrad.addColorStop(1, '#020617'); // slate-950
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw subtle grid lines / dots for tech theme
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)'; // subtle emerald glow
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let j = 0; j < height; j += 40) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(width, j);
        ctx.stroke();
      }

      // Draw subtle decorative diagonal vector lines
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.07)'; // subtle amber lines
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width, 0);
      ctx.lineTo(0, height / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(width, height / 3);
      ctx.lineTo(0, height);
      ctx.stroke();

      // 2. Draw Left Golden Ribbon (Now saying "CIYA BADGE")
      const ribbonWidth = 65;
      const ribbonGrad = ctx.createLinearGradient(0, 0, ribbonWidth, height);
      ribbonGrad.addColorStop(0, '#fef08a'); // yellow-200
      ribbonGrad.addColorStop(0.3, '#f59e0b'); // amber-500
      ribbonGrad.addColorStop(0.7, '#d97706'); // amber-600
      ribbonGrad.addColorStop(1, '#b45309'); // amber-700
      ctx.fillStyle = ribbonGrad;
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(ribbonWidth, 0);
      ctx.lineTo(ribbonWidth, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      // Write vertical text on the gold ribbon
      ctx.save();
      ctx.translate(ribbonWidth / 2 + 5, height / 2);
      ctx.rotate(-Math.PI / 2); // Read upwards
      ctx.fillStyle = '#0f172a'; // dark text
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 24px "Inter", sans-serif'; // Bolder, larger font
      ctx.letterSpacing = '10px';
      ctx.fillText('CIYA BADGE', 0, 0);
      ctx.restore();

      // 3. Draw Top Main Brand Header (CIY Academy)
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = '950 32px "Inter", sans-serif'; // Larger, bolder header font
      ctx.letterSpacing = '5px';
      ctx.fillText('CIY ACADEMY', (width + ribbonWidth) / 2, 75);

      ctx.fillStyle = '#fbbf24'; // amber-400
      ctx.font = '900 12px "Inter", sans-serif'; // Bolder subheader font
      ctx.letterSpacing = '6px';
      ctx.fillText('CREATE IT YOURSELF ACADEMY', (width + ribbonWidth) / 2, 105);

      // 5. Draw Circular Gold Ring for Student Photo Portrait
      const portraitCenterX = (width + ribbonWidth) / 2;
      const portraitCenterY = 265; // Shifted down for more spacing
      const portraitRadius = 90; // Increased portrait radius

      // Outer gold circle ring
      ctx.beginPath();
      ctx.arc(portraitCenterX, portraitCenterY, portraitRadius + 6, 0, Math.PI * 2);
      const goldGrad = ctx.createLinearGradient(portraitCenterX - portraitRadius, portraitCenterY - portraitRadius, portraitCenterX + portraitRadius, portraitCenterY + portraitRadius);
      goldGrad.addColorStop(0, '#fbbf24');
      goldGrad.addColorStop(1, '#b45309');
      ctx.strokeStyle = goldGrad;
      ctx.lineWidth = 6;
      ctx.stroke();

      // Inner image clip circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(portraitCenterX, portraitCenterY, portraitRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Load avatar image helper
      const drawAvatar = () => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';

          img.onload = () => {
            const size = portraitRadius * 2;
            const x = portraitCenterX - portraitRadius;
            const y = portraitCenterY - portraitRadius;
            
            const minSide = Math.min(img.width, img.height);
            const sourceX = (img.width - minSide) / 2;
            const sourceY = (img.height - minSide) / 2;

            ctx.drawImage(img, sourceX, sourceY, minSide, minSide, x, y, size, size);
            resolve();
          };

          img.onerror = () => {
            ctx.fillStyle = '#1e293b'; // slate-800
            ctx.beginPath();
            ctx.arc(portraitCenterX, portraitCenterY, portraitRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fbbf24'; // Gold text
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '950 54px "Inter", sans-serif';
            const initials = data.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            ctx.fillText(initials || 'ST', portraitCenterX, portraitCenterY + 2);
            resolve();
          };

          const activePhoto = data.photoURL || data.avatarUrl;
          if (activePhoto) {
            img.src = activePhoto;
          } else {
            img.src = '';
          }
        });
      };

      await drawAvatar();
      ctx.restore(); // Exit portrait clipping path

      // 6. Draw Student Name (Split color theme, bolder & larger)
      const nameY = 415;
      const nameParts = data.fullName.toUpperCase().split(' ');
      const firstName = nameParts[0] || 'STUDENT';
      const lastName = nameParts.slice(1).join(' ') || 'PRO';

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      
      // Calculate widths to center mixed white/gold name
      ctx.font = '950 34px "Inter", sans-serif'; // Bolder, larger font
      const firstW = ctx.measureText(firstName + ' ').width;
      ctx.font = '950 34px "Inter", sans-serif';
      const lastW = ctx.measureText(lastName).width;
      const totalW = firstW + lastW;

      const nameStartX = portraitCenterX - totalW / 2;

      // Draw first part in white
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = '950 34px "Inter", sans-serif';
      ctx.fillText(firstName + ' ', nameStartX, nameY);

      // Draw second part in Gold/Amber
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(lastName, nameStartX + firstW, nameY);

      // Subheading: CIYA Student (bolder & larger)
      ctx.fillStyle = '#10b981'; // emerald-500
      ctx.font = '950 14px "Inter", sans-serif'; // Bolder & larger
      ctx.letterSpacing = '5px';
      ctx.textAlign = 'center';
      ctx.fillText('CIYA STUDENT', portraitCenterX, nameY + 30);

      // 7. Draw Metadata Rows (with increased font sizes & line spacing)
      const startFieldY = 505; // Generous top offset to prevent jumbling
      const rowGap = 62; // Spacing increased from 52
      const fieldX = ribbonWidth + 50;

      const fields = [
        { label: 'EMAIL ADDRESS', value: data.email, prefix: '✉' },
        { label: 'COHORT SYLLABUS', value: data.courseName, prefix: '🎓' },
        { label: 'MEMBERSHIP SERIAL', value: data.membershipId, prefix: '🆔', isMono: true },
        { label: 'MEMBERSHIP LIFETIME', value: `Active (30-day term: Ends ${displayExpiry})`, prefix: '📅' },
      ];

      fields.forEach((field, idx) => {
        const currentY = startFieldY + idx * rowGap;

        // Draw small circle icon backing
        ctx.fillStyle = 'rgba(251, 191, 36, 0.08)';
        ctx.beginPath();
        ctx.arc(fieldX + 15, currentY + 12, 20, 0, Math.PI * 2); // Larger circle frame
        ctx.fill();
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw mini icon character
        ctx.fillStyle = '#fbbf24';
        ctx.font = '18px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(field.prefix, fieldX + 15, currentY + 13);

        // Draw labels (bolder & larger)
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#94a3b8'; // slate-400
        ctx.font = '950 11px "Inter", sans-serif'; // Bolder & larger
        ctx.letterSpacing = '2.5px';
        ctx.fillText(field.label, fieldX + 48, currentY + 5);

        // Draw values (bolder & larger)
        ctx.fillStyle = '#ffffff';
        ctx.font = field.isMono ? '900 16px "Courier New", monospace' : '950 16px "Inter", sans-serif'; // Bolder & larger
        ctx.letterSpacing = '0.5px';
        ctx.fillText(field.value, fieldX + 48, currentY + 24);
      });

      // 8. Divider & Slogans
      const dividerY = 760;
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ribbonWidth + 30, dividerY);
      ctx.lineTo(width - 30, dividerY);
      ctx.stroke();

      // Proud to be Student Slogan (bolder & larger)
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = '950 15px "Inter", sans-serif'; // Increased font size
      ctx.letterSpacing = '4px';
      ctx.fillText('PROUD TO BE A CIYA STUDENT', portraitCenterX, dividerY + 32);

      // Slogan line 2
      ctx.fillStyle = 'rgba(251, 191, 36, 0.95)';
      ctx.font = '900 11px "Inter", sans-serif'; // Increased font size
      ctx.letterSpacing = '5px';
      ctx.fillText('LEARN • BUILD • LAUNCH • EARN', portraitCenterX, dividerY + 50);

      // 10. Draw Bottom Ribbon with Core Pillars & Netlify website URL (centered layout with URL below text)
      const bottomY = height - 54;
      ctx.fillStyle = '#090d16'; // super dark
      ctx.fillRect(ribbonWidth, bottomY, width - ribbonWidth, 54);

      const centerTextX = (width + ribbonWidth) / 2;

      ctx.fillStyle = '#64748b'; // slate-500
      ctx.font = '900 11px "Inter", sans-serif'; // Bolder
      ctx.letterSpacing = '1.5px';
      ctx.textAlign = 'center';
      ctx.fillText('PRACTICAL TRAINING  |  REAL-WORLD PROJECTS', centerTextX, bottomY + 20);

      // CIY Academy Netlify Website link
      ctx.fillStyle = '#fbbf24';
      ctx.font = '950 14px "Inter", sans-serif'; // Larger, bolder URL
      ctx.letterSpacing = '1px';
      ctx.textAlign = 'center';
      ctx.fillText('ciyacademy.netlify.app', centerTextX, bottomY + 38);

      // Trigger actual download of PNG
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = isSample
        ? 'ciy_academy_badge_sample.png'
        : `ciy_academy_badge_${data.fullName.toLowerCase().replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();

    } catch (err) {
      console.error('Failed to export high-res badge image:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6" id="ciya-membership-badge-component">
      {/* 1. Interactive High-Fidelity CSS Badge Wrapper */}
      <div className="relative w-full max-w-[390px] bg-gradient-to-br from-[#0c1020] via-[#111827] to-[#030712] rounded-[2rem] border border-amber-500/35 shadow-2xl p-0 overflow-hidden flex font-sans select-none aspect-[2/3] transition-all duration-300 hover:shadow-amber-500/10">
        {/* Glow Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.08)_0%,transparent_70%)] pointer-events-none" />
        
        {/* Left Vertical Gold Ribbon */}
        <div className="w-[45px] shrink-0 bg-gradient-to-b from-amber-200 via-amber-500 to-amber-700 flex items-center justify-center relative shadow-lg">
          <span 
            className="text-[#020617] font-black tracking-[0.4em] uppercase text-[10px] whitespace-nowrap rotate-270 block select-none transform origin-center"
            style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}
          >
            CIYA BADGE
          </span>
        </div>

        {/* Right Main Content Area */}
        <div className="flex-1 p-5 pb-0 flex flex-col justify-between relative z-10">
          
          {/* Top Brand Block */}
          <div className="flex justify-start items-start">
            <div className="text-left space-y-0.5">
              <h4 className="text-white font-black uppercase text-sm tracking-wider flex items-center gap-1">
                CIY ACADEMY <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              </h4>
              <p className="text-[7.5px] text-amber-400 font-extrabold uppercase tracking-widest leading-none">CREATE IT YOURSELF ACADEMY</p>
            </div>
          </div>

          {/* Central Portrait Area */}
          <div className="flex flex-col items-center mt-2">
            {/* Custom styled circular photo frame */}
            <div className="w-26 h-26 rounded-full border-[3px] border-amber-400 p-1 bg-slate-900 shadow-md shadow-amber-500/10 relative overflow-hidden flex items-center justify-center shrink-0">
              {(data.photoURL || data.avatarUrl) ? (
                <img
                  src={data.photoURL || data.avatarUrl}
                  alt={data.fullName}
                  className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-amber-400 font-black text-3xl uppercase">
                  {data.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
              )}
            </div>

            {/* Dynamic Name and Title */}
            <div className="text-center mt-3 space-y-1">
              <h3 className="text-base font-black tracking-wide uppercase text-white leading-tight">
                {data.fullName.split(' ')[0]} <span className="text-amber-400">{data.fullName.split(' ').slice(1).join(' ')}</span>
              </h3>
              <p className="text-[10px] text-emerald-400 font-extrabold tracking-widest uppercase">CIYA Student</p>
            </div>
          </div>

          {/* Metadata Field Rows with increased spacing and bolder font */}
          <div className="space-y-3 mt-4 text-left">
            {[
              { label: 'EMAIL ADDRESS', value: data.email, icon: Mail },
              { label: 'COHORT SYLLABUS', value: data.courseName, icon: BookOpen },
              { label: 'MEMBERSHIP SERIAL', value: data.membershipId, icon: IdCard, isMono: true },
              { label: 'MEMBERSHIP TERM', value: `30 Days (Expires ${displayExpiry})`, icon: Calendar },
            ].map((row, idx) => {
              const Icon = row.icon;
              return (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-amber-500/10 rounded-full flex items-center justify-center shrink-0 border border-amber-500/20">
                    <Icon className="w-3 h-3 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest leading-none block mb-0.5">{row.label}</span>
                    <span className={`text-xs text-white font-extrabold leading-tight block truncate ${row.isMono ? 'font-mono' : ''}`}>
                      {row.value}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Card Footer Stamp Slogan Row (Centered Slogans, No Stamp Logo) */}
          <div className="border-t border-amber-500/10 pt-4 mt-4 flex flex-col items-center justify-center pb-4 text-center">
            <p className="text-white font-black text-[10px] tracking-widest uppercase leading-tight">PROUD TO BE CIYA STUDENT</p>
            <p className="text-[9px] text-amber-400 font-extrabold uppercase tracking-wider leading-none mt-1">LEARN • BUILD • LAUNCH • EARN</p>
          </div>

          {/* Bottom High-Fidelity Ribbon with Core Pillars & Centered Website link underneath */}
          <div className="bg-[#090d16] -mx-5 px-5 py-2.5 flex flex-col items-center justify-center border-t border-amber-500/10 mt-auto text-center gap-1">
            <span className="text-[8px] text-slate-500 font-bold tracking-wider uppercase">
              PRACTICAL TRAINING  |  REAL-WORLD PROJECTS
            </span>
            <span className="text-[10px] text-amber-400 font-mono font-black tracking-wider hover:underline cursor-pointer">
              ciyacademy.netlify.app
            </span>
          </div>

        </div>
      </div>

      {/* 2. Hidden Canvas For High-Res PNG Generation */}
      <canvas ref={canvasRef} className="hidden" />

      {/* 3. Action Download Trigger Button */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-md shadow-amber-500/20 flex items-center gap-2 border-0 select-none transition-all"
      >
        <Download className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
        {downloading ? 'Generating Premium Badge PNG...' : isSample ? 'Download Sample Badge PNG' : 'Download My CIYA Badge'}
      </button>
    </div>
  );
}
