import os
import struct
import zlib
import math

def create_png(width, height, rgba_buffer):
    """Encodes raw RGBA bytes into a valid PNG byte string."""
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    
    # Prepend 0 (filter byte: None) to each scanline
    scanlines = []
    row_bytes = width * 4
    for y in range(height):
        scanlines.append(b'\x00' + rgba_buffer[y * row_bytes : (y + 1) * row_bytes])
    
    compressed_data = zlib.compress(b''.join(scanlines), 9)
    idat = chunk(b'IDAT', compressed_data)
    iend = chunk(b'IEND', b'')
    return header + ihdr + idat + iend

def render_ciya_icon(size, is_maskable=False):
    """Renders a high-res CIYA emblem on a deep slate background."""
    w, h = size, size
    buffer = bytearray(w * h * 4)
    cx, cy = w / 2.0, h / 2.0
    
    # Outer background: Slate 900 (#0f172a)
    bg_r, bg_g, bg_b = 15, 23, 42
    
    # For maskable, safe zone is 80% circle (radius w * 0.4)
    # For standard, radius is w * 0.44
    outer_r = (w * 0.38) if is_maskable else (w * 0.44)
    inner_r = outer_r * 0.86
    center_disk_r = outer_r * 0.72

    for y in range(h):
        dy = y - cy
        for x in range(w):
            dx = x - cx
            dist = math.sqrt(dx * dx + dy * dy)
            idx = (y * w + x) * 4
            
            # Default background
            r, g, b, a = bg_r, bg_g, bg_b, 255
            
            # Ring glow & border
            if dist <= outer_r + 2:
                if dist > outer_r - 2:
                    # Outer anti-aliased edge
                    t = max(0.0, min(1.0, (outer_r + 2 - dist) / 4.0))
                    # Teal ring accent #0d9488
                    r = int(bg_r * (1 - t) + 13 * t)
                    g = int(bg_g * (1 - t) + 148 * t)
                    b = int(bg_b * (1 - t) + 136 * t)
                elif dist >= inner_r:
                    # Circular gradient track (Teal #14b8a6 to Emerald #10b981)
                    angle = (math.atan2(dy, dx) + math.pi) / (2 * math.pi)
                    ring_r = int(20 + 30 * math.sin(angle * math.pi * 2))
                    ring_g = int(184 + 30 * math.cos(angle * math.pi * 2))
                    ring_b = int(166 + 20 * math.sin(angle * math.pi))
                    r, g, b = ring_r, ring_g, ring_b
                elif dist > center_disk_r:
                    # Dark gap
                    r, g, b = 15, 23, 42
                else:
                    # Inner disk: Gradient amber-to-orange (#f59e0b to #ea580c)
                    t_disk = (dy / center_disk_r + 1.0) / 2.0
                    t_disk = max(0.0, min(1.0, t_disk))
                    r = int(245 * (1 - t_disk) + 234 * t_disk)
                    g = int(158 * (1 - t_disk) + 88 * t_disk)
                    b = int(11 * (1 - t_disk) + 12 * t_disk)
                    
                    # CIYA emblem stylized central 'C' and dot
                    # Stylized letter / icon in center:
                    norm_x = dx / center_disk_r
                    norm_y = dy / center_disk_r
                    inner_dist = math.sqrt(norm_x * norm_x + norm_y * norm_y)
                    
                    # Stylized inner C shape
                    if 0.35 <= inner_dist <= 0.65 and not (-0.35 < norm_y < 0.35 and norm_x > 0.1):
                        r, g, b = 255, 255, 255
                    # Central core jewel / dot
                    if inner_dist <= 0.18:
                        r, g, b = 255, 255, 255
            
            buffer[idx] = max(0, min(255, r))
            buffer[idx + 1] = max(0, min(255, g))
            buffer[idx + 2] = max(0, min(255, b))
            buffer[idx + 3] = a

    return create_png(w, h, buffer)

os.makedirs('public', exist_ok=True)

# 1. Standard 192x192
print("Generating pwa-192x192.png...")
with open('public/pwa-192x192.png', 'wb') as f:
    f.write(render_ciya_icon(192, is_maskable=False))

# 2. Standard 512x512
print("Generating pwa-512x512.png...")
with open('public/pwa-512x512.png', 'wb') as f:
    f.write(render_ciya_icon(512, is_maskable=False))

# 3. Maskable 512x512
print("Generating pwa-maskable-512x512.png...")
with open('public/pwa-maskable-512x512.png', 'wb') as f:
    f.write(render_ciya_icon(512, is_maskable=True))

# 4. Apple Touch Icon 180x180
print("Generating apple-touch-icon.png...")
with open('public/apple-touch-icon.png', 'wb') as f:
    f.write(render_ciya_icon(180, is_maskable=False))

# 5. Scalable SVG icon
svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#0f172a"/>
  <circle cx="256" cy="256" r="210" fill="none" stroke="url(#tealGradient)" stroke-width="28"/>
  <circle cx="256" cy="256" r="150" fill="url(#amberGradient)"/>
  <!-- Stylized C / Emblem -->
  <path d="M 330 190 A 90 90 0 1 0 330 322" fill="none" stroke="#ffffff" stroke-width="28" stroke-linecap="round"/>
  <circle cx="256" cy="256" r="26" fill="#ffffff"/>
  <defs>
    <linearGradient id="tealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14b8a6"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
    <linearGradient id="amberGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#ea580c"/>
    </linearGradient>
  </defs>
</svg>'''

with open('public/icon.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)

with open('public/favicon.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)

print("All PWA icons generated successfully!")
