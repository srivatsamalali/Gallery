# Baby Showers — Original High-Resolution Photo Gallery

A modern, luxurious photo gallery tailored for **GitHub Pages**, specifically built for showcasing 277 photos taken on the **Nikon Z6 III** in **100% untouched original file size & resolution (6048 × 4032, 24.4 MP)**.

---

## 🌟 Highlights & Features

- **💎 Original Quality Preserved**: Every photo in `Baby Showers/` remains in its native uncompressed state (~15–22 MB each, 4.61 GB total). No downscaling, re-compression, or loss of EXIF metadata.
- **⚡ Buttery Smooth Performance**: Generates crisp, retina-ready 1000px web previews in `thumbnails/` so the 4.6 GB gallery scrolls at 60 FPS without crashing mobile or desktop browsers.
- **🔍 Large Preview Lightbox**:
  - Full-screen modal with progressive loading.
  - **100% Pixel Zoom (Z)** with drag & pan inspection to view full 24 MP details.
  - Interactive Filmstrip carousel at the bottom for quick skimming.
  - Next / Previous buttons, touch swipe gestures, and keyboard shortcuts (`←`, `→`, `Esc`, `Space`, `F`, `Z`, `D`).
- **⬇️ 1-Click Original Quality Downloads**:
  - Download button on every photo card and inside the lightbox.
  - Downloads the exact bit-for-bit original photo from `Baby Showers/` with its original filename.
  - Festive animations: confetti explosions, spinning progress, and toast feedback.
- **☑️ Multi-Photo Batch Download**: Select multiple photos and download them sequentially.
- **▶️ Auto-Playing Slideshow**: Hands-free presentation mode with smooth crossfades.
- **🎨 Layout Switcher**:
  - **Masonry View** (Pinterest-style, preserves natural portrait and landscape orientations).
  - **Balanced Grid** (Clean uniform square tiles).
  - **Editorial Stream** (Large magazine-style feed).
- **❤️ Favorites / Likes**: Guests can like photos and filter by their favorites (saved locally).
- **🔎 Real-time Search & Filter**: Instant search by photo number (e.g. `316`) and filters for Portraits, Landscapes, and Liked photos.

---

## 🚀 How to Host on GitHub Pages

### 1. Initialize Git & Commit Files
Open Terminal in this folder (`photos`) and run:

```bash
git init
git branch -M main
git add .
git commit -m "Add Baby Showers high-resolution gallery and originals"
```

> **Note on Push Buffer for 4.6 GB**:
> Because the repository contains 4.6 GB of high-resolution DSLR photos, configure git's postBuffer so the upload won't time out:
> ```bash
> git config http.postBuffer 524288000
> ```

### 2. Create the GitHub Repository & Push

1. Go to [GitHub.com/new](https://github.com/new).
2. Create a repository named `photos` (or `baby-showers`).
3. Link and push your local files:
```bash
git remote add origin https://github.com/<YOUR-USERNAME>/<REPO-NAME>.git
git push -u origin main
```

---

## 🔒 Important Note on Private Repositories & GitHub Pages

- **GitHub Free**: GitHub Pages on **private** repositories requires a **GitHub Pro**, **GitHub Team**, or **GitHub Enterprise** account. If you are on the GitHub Free plan and make the repository private, GitHub will prompt you that GitHub Pages requires GitHub Pro.
- **If you have GitHub Pro**: You can make the repository **Private** and enable GitHub Pages under:
  **Settings → Pages → Build and deployment → Source: Deploy from a branch (`main` / `/root`)**.
- **If you do not have GitHub Pro**: You can make the repository **Public** (or keep the repo private with GitHub Pro). Anyone with the link will be able to access the gallery and download photos.

---

## 📁 Project Structure

```
├── Baby Showers/          # 277 original untouched DSLR photos (~15-22MB each, 6048x4032)
├── thumbnails/            # Fast, crisp retina web thumbnails for 60fps gallery browsing
├── index.html             # Main gallery web page
├── styles.css             # Champagne & Rose luxury styling, responsive layouts, animations
├── gallery.js             # Lightbox, zoom, slideshow, batch download, confetti engine
├── photos-data.js         # Manifest containing photo metadata, dimensions, sizes, and EXIF
├── generate_manifest.py   # Helper script to rebuild thumbnails/manifest if photos are added
├── .gitignore             # Ignores OS cache files (.DS_Store)
└── README.md              # Documentation and GitHub Pages setup instructions
```

