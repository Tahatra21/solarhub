# 🎨 Rekomendasi Palet Warna - Product Lifecycle Dashboard

Dokumen ini berisi rekomendasi palet warna yang harmonis dan konsisten untuk pengembangan komponen UI dalam Product Lifecycle Dashboard.

## 📋 Daftar Isi
- [Extended Web Palette](#extended-web-palette)
- [Panduan Penggunaan](#panduan-penggunaan)
- [Kombinasi Warna yang Direkomendasikan](#kombinasi-warna-yang-direkomendasikan)
- [Tips Tambahan](#tips-tambahan)

## 🎯 Extended Web Palette

### Palet Warna Web Lengkap
```css
/* Neutral & Base Colors - Warna dasar dan netral */
--neutral-cream-light: #e8d1c5
--neutral-cream-medium: #eddcd2
--neutral-cream-soft: #fff1e6
--neutral-beige-light: #f0efeb
--neutral-beige-warm: #eeddd3
--neutral-white: #ffffff
--neutral-gray-light: #f2f2f2
--neutral-gray-medium: #f0f2f2
--neutral-gray-blue: #e6e7e1

/* Pastel Colors - Warna pastel lembut */
--pastel-mint: #84dcc6
--pastel-mint-light: #a5ffd6
--pastel-coral: #ffa69e
--pastel-coral-bright: #ff686b
--pastel-lavender: #cdb4db
--pastel-pink: #ffc8dd
--pastel-pink-soft: #ffafcc
--pastel-blue: #bde0fe
--pastel-blue-light: #a2d2ff

/* Soft Tones - Warna lembut */
--soft-aqua: #a7e1e3
--soft-green: #d3eacc
--soft-yellow: #f6ed8d
--soft-rose: #f9d9de
--soft-mauve: #e8bcd7
--soft-teal: #b0d1d8
--soft-sage: #c3d3b7
--soft-cream: #f4f3e1
--soft-peach: #f7d0b1
--soft-blush: #f9c5ca

/* Light Tones - Warna terang */
--light-lime: #e5e399
--light-apricot: #fdddb0
--light-ivory: #fcefdc
--light-vanilla: #feebcb
--light-peach: #ffe3d0
--light-mint: #b8d2aa
--light-cyan: #c5e9e7
--light-butter: #feedb4
--light-rose: #ffddde
--light-lavender: #ddd5e7

/* Warm Tones - Warna hangat */
--warm-pink: #ffb7c3
--warm-sand: #f9dcd0
--warm-honey: #feecb5
--warm-apricot: #fed8b1
--warm-mint: #bee8e1
--warm-sage: #cce1da
--warm-lemon: #f9ecb8
--warm-pearl: #f6e1d0
--warm-coral: #f7cbca
--warm-gold: #f7ddb1

/* Cool Tones - Warna sejuk */
--cool-sky: #dbf1f7
--cool-lemon: #fde7ab
--cool-rose: #fabdd0
--cool-periwinkle: #d9d0f0
--cool-orchid: #d3acda
--cool-cotton: #f7ccdf
--cool-powder: #c2d9eb
--cool-seafoam: #c3e7e3
--cool-bisque: #fdd5b1
--cool-blush: #f2d0d9

/* Muted Tones - Warna redup */
--muted-slate: #b8c6d9
--muted-blue-gray: #8596a6
--muted-sand: #f2d9d0
--muted-periwinkle: #a9b5d9
--muted-terracotta: #f2a477
--muted-coral: #f29472
--muted-rose: #f2c4c4
--muted-taupe: #d9c4b8
--muted-peach: #f2ddd0
--muted-salmon: #f2b2ac
--muted-pink: #f2a0a0

/* Vibrant Accents - Warna aksen cerah */
--vibrant-purple: #d9bcf2
--vibrant-magenta: #fef4ff
--vibrant-rose: #eebfd9
--vibrant-pink: #ffa6c3
--vibrant-mint: #d4f5dd
--vibrant-slate: #8990b3
--vibrant-peach: #ffd3c4
--vibrant-periwinkle: #dee3ff
--vibrant-lime: #deffc4
--vibrant-sage: #a0b392

/* Dreamy Pastels - Warna pastel impian */
--dreamy-blue: #a7bed3
--dreamy-aqua: #c6e2e9
--dreamy-lime: #f1ffc4
--dreamy-peach: #ffcaaf
--dreamy-tan: #dab894
--dreamy-yellow: #fdffb6
--dreamy-mint: #caffbf
--dreamy-cyan: #9bf6ff
--dreamy-lavender: #a0c4ff
--dreamy-magenta: #ffc6ff

/* Coral Collection - Koleksi warna coral */
--coral-light: #f08080
--coral-medium: #f4978e
--coral-soft: #f8ad9d
--coral-warm: #fbc4ab
--coral-peach: #ffdab9
```

## 📖 Panduan Penggunaan

### Penggunaan Extended Web Palette

#### 1. Neutral & Base Colors
Digunakan untuk background utama, container, dan elemen dasar:
```css
.container {
  background-color: var(--neutral-white);
  border: 1px solid var(--neutral-gray-light);
}

.card {
  background-color: var(--neutral-cream-soft);
  color: var(--neutral-gray-medium);
}
```

#### 2. Pastel Colors
Digunakan untuk notifikasi, alert, badge, dan tags:
```css
.notification-success { background-color: var(--pastel-mint); }
.notification-warning { background-color: var(--soft-yellow); }
.notification-error { background-color: var(--pastel-coral); }
.notification-info { background-color: var(--pastel-blue); }

.badge-mint { background-color: var(--pastel-mint-light); color: #065f46; }
.badge-coral { background-color: var(--pastel-coral); color: #7f1d1d; }
.badge-lavender { background-color: var(--pastel-lavender); color: #581c87; }
```

#### 3. Soft & Light Tones
Digunakan untuk section backgrounds dan hover states:
```css
.section-soft {
  background: linear-gradient(135deg, var(--soft-cream) 0%, var(--light-ivory) 100%);
}

.card:hover {
  background-color: var(--light-vanilla);
  transform: translateY(-2px);
}
```

#### 4. Warm & Cool Tones
Digunakan untuk theming dan mood setting:
```css
/* Warm theme */
.theme-warm {
  --primary-bg: var(--warm-sand);
  --secondary-bg: var(--warm-peach);
  --accent-color: var(--warm-coral);
}

/* Cool theme */
.theme-cool {
  --primary-bg: var(--cool-sky);
  --secondary-bg: var(--cool-powder);
  --accent-color: var(--cool-seafoam);
}
```

#### 5. Dark Mode Considerations
Gunakan muted tones dengan opacity untuk dark mode:
```css
[data-theme="dark"] {
  --bg-primary: var(--muted-slate);
  --bg-secondary: var(--muted-blue-gray);
  --text-primary: var(--light-ivory);
  --text-secondary: var(--neutral-cream-light);
}
```

## 🎨 Kombinasi Warna yang Direkomendasikan

### Kombinasi Harmonis untuk Web UI

#### 1. Elegant (Lembut & Elegan)
```css
.elegant-combo {
  background: var(--soft-cream);
  border: 1px solid var(--neutral-beige-light);
  color: var(--muted-slate);
  accent-color: var(--soft-mauve);
}
```

#### 2. Fresh (Segar & Modern)
```css
.fresh-combo {
  background: var(--dreamy-mint);
  border: 1px solid var(--pastel-mint);
  color: var(--vibrant-slate);
  accent-color: var(--soft-aqua);
}
```

#### 3. Warm (Hangat & Nyaman)
```css
.warm-combo {
  background: var(--warm-sand);
  border: 1px solid var(--warm-apricot);
  color: var(--muted-terracotta);
  accent-color: var(--coral-medium);
}
```

#### 4. Cool (Sejuk & Profesional)
```css
.cool-combo {
  background: var(--cool-powder);
  border: 1px solid var(--cool-sky);
  color: var(--muted-blue-gray);
  accent-color: var(--pastel-blue);
}
```

#### 5. Dreamy (Impian & Ceria)
```css
.dreamy-combo {
  background: var(--dreamy-lavender);
  border: 1px solid var(--dreamy-magenta);
  color: var(--vibrant-purple);
  accent-color: var(--pastel-pink);
}
```

### Gradient Combinations

```css
/* Sunset Gradient */
.gradient-sunset {
  background: linear-gradient(135deg, var(--coral-peach) 0%, var(--warm-apricot) 50%, var(--light-peach) 100%);
}

/* Ocean Gradient */
.gradient-ocean {
  background: linear-gradient(135deg, var(--dreamy-cyan) 0%, var(--cool-seafoam) 50%, var(--pastel-mint) 100%);
}

/* Garden Gradient */
.gradient-garden {
  background: linear-gradient(135deg, var(--dreamy-lime) 0%, var(--soft-green) 50%, var(--light-mint) 100%);
}

/* Lavender Gradient */
.gradient-lavender {
  background: linear-gradient(135deg, var(--dreamy-lavender) 0%, var(--soft-mauve) 50%, var(--pastel-pink) 100%);
}

/* Cream Gradient */
.gradient-cream {
  background: linear-gradient(135deg, var(--light-ivory) 0%, var(--neutral-cream-soft) 50%, var(--warm-pearl) 100%);
}
```

## 💡 Tips Tambahan

1. **Gunakan tools online** untuk mengecek harmoni warna
2. **Test kontras** untuk aksesibilitas
3. **Pertimbangkan color blindness** dalam pemilihan warna
4. **Dokumentasikan perubahan** untuk konsistensi tim
5. **Gunakan CSS custom properties** untuk maintenance yang mudah

---

**Dibuat untuk**: Product Lifecycle Dashboard  
**Terakhir diupdate**: Januari 2025