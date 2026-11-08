/**
 * Baby Showers - Original Quality Photo Gallery Engine
 * Nikon Z6 III High Fidelity Originals • Full Download & Preview System
 */

(function () {
  'use strict';

  // --- State ---
  const state = {
    allPhotos: typeof PHOTOS_DATA !== 'undefined' ? PHOTOS_DATA : [],
    filteredPhotos: [],
    activeFilter: 'all',
    searchQuery: '',
    sortBy: 'default',
    layout: 'masonry',
    currentIndex: 0,
    lightboxOpen: false,
    slideshowRunning: false,
    slideshowTimer: null,
    isZoomed: false,
    favorites: new Set(JSON.parse(localStorage.getItem('bs_favorites') || '[]')),
    selectionMode: false,
    selectedPhotos: new Set(),
  };

  // --- DOM Elements ---
  const el = {
    galleryContainer: document.getElementById('gallery-container'),
    searchInput: document.getElementById('search-input'),
    searchClearBtn: document.getElementById('search-clear-btn'),
    filterTabs: document.querySelectorAll('.tab-btn'),
    tabCounts: {
      all: document.getElementById('count-all'),
      portrait: document.getElementById('count-portrait'),
      landscape: document.getElementById('count-landscape'),
      favorites: document.getElementById('count-favorites'),
    },
    layoutBtns: document.querySelectorAll('.layout-btn'),
    sortSelect: document.getElementById('sort-select'),
    btnSelectMode: document.getElementById('btn-select-mode'),
    btnSlideshow: document.getElementById('btn-slideshow'),
    noResults: document.getElementById('no-results'),
    scrollProgress: document.getElementById('scroll-progress'),
    backToTop: document.getElementById('back-to-top'),
    controlBar: document.getElementById('control-bar'),
    toastContainer: document.getElementById('toast-container'),
    confettiCanvas: document.getElementById('confetti-canvas'),

    // Lightbox Elements
    lightbox: document.getElementById('lightbox'),
    lbMobileBack: document.getElementById('lb-mobile-back'),
    lbSwipeBar: document.getElementById('lb-swipe-bar'),
    lbTitle: document.getElementById('lb-title'),
    lbCounter: document.getElementById('lb-counter'),
    lbQualityPill: document.getElementById('lb-quality-pill'),
    lbImg: document.getElementById('lb-img'),
    lbImgContainer: document.getElementById('lb-img-container'),
    lbClose: document.getElementById('lb-close'),
    lbPrev: document.getElementById('lb-prev'),
    lbNext: document.getElementById('lb-next'),
    lbZoomBtn: document.getElementById('lb-zoom-btn'),
    lbFavBtn: document.getElementById('lb-fav-btn'),
    lbSlideshowBtn: document.getElementById('lb-slideshow-btn'),
    lbFullscreenBtn: document.getElementById('lb-fullscreen-btn'),
    lbDownloadCta: document.getElementById('lb-download-cta'),
    lbCameraMeta: document.getElementById('lb-camera-meta'),
    lbResMeta: document.getElementById('lb-res-meta'),
    lbSizeMeta: document.getElementById('lb-size-meta'),
    lbDateMeta: document.getElementById('lb-date-meta'),
    lbFilmstrip: document.getElementById('lb-filmstrip'),

    // Batch Drawer
    batchDrawer: document.getElementById('batch-drawer'),
    batchCountText: document.getElementById('batch-count-text'),
    batchDownloadBtn: document.getElementById('batch-download-btn'),
    batchCancelBtn: document.getElementById('batch-cancel-btn'),
  };

  // --- Confetti Engine ---
  const confetti = (function () {
    const canvas = el.confettiCanvas;
    if (!canvas) return { burst: () => {} };
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationFrame = null;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    const colors = ['#c99e32', '#e5b948', '#d97d74', '#f3b2a6', '#5f7a68', '#f8f5f0', '#ffffff'];

    function burst(originX, originY) {
      const count = 70;
      const x = originX || window.innerWidth / 2;
      const y = originY || window.innerHeight / 2;

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 12 + 4;
        particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3,
          radius: Math.random() * 5 + 3,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 12,
          opacity: 1,
          gravity: 0.28,
          drag: 0.96,
        });
      }

      if (!animationFrame) {
        render();
      }
    }

    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.015;

        if (p.opacity <= 0 || p.y > canvas.height) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
        ctx.restore();
      }

      if (particles.length > 0) {
        animationFrame = requestAnimationFrame(render);
      } else {
        animationFrame = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    return { burst };
  })();

  // --- Toast Notifications ---
  function showToast(title, message, icon = '🎉', duration = 4000) {
    if (!el.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${message}</div>
      </div>
    `;
    el.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-leave');
      setTimeout(() => toast.remove(), 400);
    }, duration);
  }

  // --- URL Resolver for Original Files ---
  function getOriginalUrl(photo) {
    if (!photo) return '';
    if (window.location.hostname.endsWith('github.io')) {
      return `https://raw.githubusercontent.com/srivatsamalali/Gallery/main/${encodeURI(photo.originalUrl)}`;
    }
    return encodeURI(photo.originalUrl);
  }

  // --- Format Utilities ---
  function formatDate(raw) {
    if (!raw) return 'November 2026';
    // Format "2026:11:06 10:35:29" -> "Nov 6, 2026, 10:35 AM"
    try {
      const parts = raw.split(' ');
      if (parts.length === 2) {
        const d = parts[0].split(':');
        const t = parts[1].split(':');
        const dateObj = new Date(d[0], d[1] - 1, d[2], t[0], t[1]);
        return dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      }
    } catch (e) {}
    return raw;
  }

  // --- Filter, Search & Sort Logic ---
  function applyFiltersAndSort() {
    let result = [...state.allPhotos];

    // Filter Tab
    if (state.activeFilter === 'portrait') {
      result = result.filter((p) => p.isPortrait);
    } else if (state.activeFilter === 'landscape') {
      result = result.filter((p) => !p.isPortrait);
    } else if (state.activeFilter === 'favorites') {
      result = result.filter((p) => state.favorites.has(p.filename));
    }

    // Search query
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.trim().toLowerCase();
      result = result.filter((p) => p.filename.toLowerCase().includes(q) || p.title.toLowerCase().includes(q));
    }

    // Sort
    if (state.sortBy === 'filename-asc') {
      result.sort((a, b) => a.filename.localeCompare(b.filename));
    } else if (state.sortBy === 'filename-desc') {
      result.sort((a, b) => b.filename.localeCompare(a.filename));
    } else if (state.sortBy === 'size-desc') {
      result.sort((a, b) => b.sizeBytes - a.sizeBytes);
    } else if (state.sortBy === 'size-asc') {
      result.sort((a, b) => a.sizeBytes - b.sizeBytes);
    } else {
      // Default: numeric order of filename
      result.sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true }));
    }

    state.filteredPhotos = result;
    updateCounts();
    renderGallery();
  }

  function updateCounts() {
    const total = state.allPhotos.length;
    const portraits = state.allPhotos.filter((p) => p.isPortrait).length;
    const landscapes = total - portraits;
    const favCount = state.favorites.size;

    if (el.tabCounts.all) el.tabCounts.all.textContent = total;
    if (el.tabCounts.portrait) el.tabCounts.portrait.textContent = portraits;
    if (el.tabCounts.landscape) el.tabCounts.landscape.textContent = landscapes;
    if (el.tabCounts.favorites) el.tabCounts.favorites.textContent = favCount;
  }

  // --- Gallery Rendering ---
  function renderGallery() {
    const container = el.galleryContainer;
    if (!container) return;
    container.innerHTML = '';

    if (state.filteredPhotos.length === 0) {
      if (el.noResults) el.noResults.classList.add('visible');
      return;
    }
    if (el.noResults) el.noResults.classList.remove('visible');

    // Layout class
    container.className = `gallery-container layout-${state.layout}`;

    const fragment = document.createDocumentFragment();

    state.filteredPhotos.forEach((photo, index) => {
      const card = createPhotoCard(photo, index);
      fragment.appendChild(card);
    });

    container.appendChild(fragment);

    // Setup intersection observer for scroll reveal
    setupScrollReveal();
  }

  function createPhotoCard(photo, index) {
    const card = document.createElement('div');
    card.className = `photo-card reveal ${state.selectedPhotos.has(photo.filename) ? 'selected' : ''}`;
    card.dataset.index = index;
    card.dataset.filename = photo.filename;

    const isFav = state.favorites.has(photo.filename);
    const aspect = photo.displayWidth && photo.displayHeight ? (photo.displayWidth / photo.displayHeight).toFixed(3) : 1.5;

    card.innerHTML = `
      <div class="photo-img-wrap" style="aspect-ratio: ${aspect};">
        <div class="card-badges">
          <span class="badge-tag badge-size">💾 ${photo.sizeFormatted}</span>
          <span class="badge-tag badge-res">📐 ${photo.isPortrait ? 'Portrait • 24 MP' : 'Landscape • 24 MP'}</span>
        </div>

        <!-- Mobile Touch Favorite Button -->
        <button class="card-mobile-fav ${isFav ? 'active' : ''}" aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}" data-filename="${photo.filename}">
          <svg viewBox="0 0 24 24" fill="${isFav ? '#fff' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>

        <div class="select-checkbox-wrap">
          <div class="select-checkbox">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>

        <img
          class="photo-img"
          src="${encodeURI(photo.thumbUrl)}"
          alt="${photo.title}"
          loading="lazy"
          decoding="async"
          onerror="if(this.src !== '${encodeURI(photo.originalUrl)}') this.src='${encodeURI(photo.originalUrl)}';"
        />

        <div class="card-overlay">
          <div class="overlay-top">
            <button class="overlay-btn btn-fav ${isFav ? 'active' : ''}" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}" data-filename="${photo.filename}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="${isFav ? '#e53e3e' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
            <button class="overlay-btn btn-expand" title="Large Preview">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </button>
          </div>

          <div class="overlay-bottom">
            <div class="card-title-wrap">
              <div class="card-photo-name">${photo.title}</div>
              <div class="card-photo-meta">${photo.width} × ${photo.height} • ${photo.camera}</div>
            </div>
            <button class="card-download-btn" title="Download original photo file (${photo.sizeFormatted})" data-filename="${photo.filename}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Image onload shimmer dismiss
    const img = card.querySelector('.photo-img');
    const wrap = card.querySelector('.photo-img-wrap');
    if (img.complete) {
      wrap.classList.add('loaded');
    } else {
      img.addEventListener('load', () => wrap.classList.add('loaded'), { once: true });
    }

    // Card click routing
    card.addEventListener('click', (e) => {
      // Mobile favorite button clicked
      const mobileFavBtn = e.target.closest('.card-mobile-fav');
      if (mobileFavBtn) {
        e.stopPropagation();
        toggleFavorite(photo.filename, mobileFavBtn);
        return;
      }

      // Desktop favorite button clicked
      const favBtn = e.target.closest('.btn-fav');
      if (favBtn) {
        e.stopPropagation();
        toggleFavorite(photo.filename, favBtn);
        return;
      }

      // Download button clicked
      const dlBtn = e.target.closest('.card-download-btn');
      if (dlBtn) {
        e.stopPropagation();
        triggerDownload(photo, dlBtn);
        return;
      }

      // If in selection mode, toggle selection
      if (state.selectionMode) {
        e.stopPropagation();
        toggleCardSelection(photo.filename, card);
        return;
      }

      // Otherwise, open Lightbox
      openLightbox(index);
    });

    return card;
  }

  // --- Scroll Reveal Animations ---
  function setupScrollReveal() {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '100px 0px 100px 0px',
        threshold: 0.05,
      }
    );

    document.querySelectorAll('.photo-card.reveal').forEach((card, idx) => {
      // Stagger initial batch slightly
      if (idx < 20) {
        card.style.transitionDelay = `${(idx % 6) * 0.06}s`;
      }
      observer.observe(card);
    });
  }

  // --- Favorite Toggle ---
  function toggleFavorite(filename, btnElement) {
    const isFav = state.favorites.has(filename);
    if (isFav) {
      state.favorites.delete(filename);
    } else {
      state.favorites.add(filename);
      confetti.burst();
    }
    localStorage.setItem('bs_favorites', JSON.stringify([...state.favorites]));
    updateCounts();

    // Haptic feedback for mobile touch
    if (navigator.vibrate) {
      try { navigator.vibrate(12); } catch (e) {}
    }

    // Sync all matching buttons for this photo (both desktop overlay and mobile button)
    document.querySelectorAll(`[data-filename="${filename}"]`).forEach((btn) => {
      if (btn.classList.contains('btn-fav') || btn.classList.contains('card-mobile-fav')) {
        btn.classList.toggle('active', !isFav);
        const svg = btn.querySelector('svg');
        if (svg) {
          if (btn.classList.contains('card-mobile-fav')) {
            svg.setAttribute('fill', !isFav ? '#fff' : 'none');
          } else {
            svg.setAttribute('fill', !isFav ? '#e53e3e' : 'none');
          }
        }
      }
    });

    // Also update lightbox fav btn if currently viewing this photo
    if (state.lightboxOpen && state.filteredPhotos[state.currentIndex]?.filename === filename) {
      el.lbFavBtn.classList.toggle('active', !isFav);
      const lbSvg = el.lbFavBtn.querySelector('svg');
      if (lbSvg) lbSvg.setAttribute('fill', !isFav ? '#e53e3e' : 'none');
    }

    // If currently filtered by favorites, refresh view
    if (state.activeFilter === 'favorites') {
      applyFiltersAndSort();
    }
  }

  // --- Single Download Handler with Celebration ---
  function triggerDownload(photo, btnElement) {
    if (!photo) return;

    // Visual button feedback
    if (btnElement) {
      btnElement.classList.add('downloading');
      const originalHTML = btnElement.innerHTML;
      btnElement.innerHTML = `<span class="spinner"></span> <span>Downloading...</span>`;

      setTimeout(() => {
        btnElement.classList.remove('downloading');
        btnElement.innerHTML = `<span>✓ Saved!</span>`;
        setTimeout(() => {
          btnElement.innerHTML = originalHTML;
        }, 2200);
      }, 1200);
    }

    // Confetti burst
    const rect = btnElement ? btnElement.getBoundingClientRect() : null;
    const originX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const originY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    confetti.burst(originX, originY);

    // Toast notification
    showToast(
      `Downloading ${photo.filename}`,
      `Original full resolution (${photo.width}×${photo.height} • ${photo.sizeFormatted}) untouched file.`,
      '📸',
      4500
    );

    // Direct browser download of original untouched file
    const link = document.createElement('a');
    link.href = getOriginalUrl(photo);
    link.download = photo.filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- Batch Selection Mode ---
  function toggleSelectionMode(enable) {
    state.selectionMode = enable !== undefined ? enable : !state.selectionMode;
    document.body.classList.toggle('selection-mode', state.selectionMode);
    if (el.btnSelectMode) {
      el.btnSelectMode.classList.toggle('active', state.selectionMode);
      el.btnSelectMode.textContent = state.selectionMode ? '✕ Cancel' : '☑️ Select';
    }

    if (!state.selectionMode) {
      state.selectedPhotos.clear();
      document.querySelectorAll('.photo-card.selected').forEach((c) => c.classList.remove('selected'));
      updateBatchDrawer();
    }
  }

  function toggleCardSelection(filename, cardElement) {
    if (state.selectedPhotos.has(filename)) {
      state.selectedPhotos.delete(filename);
      cardElement.classList.remove('selected');
    } else {
      state.selectedPhotos.add(filename);
      cardElement.classList.add('selected');
      if (navigator.vibrate) navigator.vibrate(10);
    }
    updateBatchDrawer();
  }

  function updateBatchDrawer() {
    const count = state.selectedPhotos.size;
    if (count > 0) {
      document.body.classList.add('has-batch-drawer');
      let totalBytes = 0;
      state.allPhotos.forEach((p) => {
        if (state.selectedPhotos.has(p.filename)) {
          totalBytes += p.sizeBytes;
        }
      });
      const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
      if (el.batchCountText) {
        el.batchCountText.innerHTML = `<strong>${count}</strong> photo${count > 1 ? 's' : ''} selected (${totalMB} MB)`;
      }
      if (el.batchDrawer) el.batchDrawer.classList.add('active');
    } else {
      document.body.classList.remove('has-batch-drawer');
      if (el.batchDrawer) el.batchDrawer.classList.remove('active');
    }
  }

  async function downloadBatchSelected() {
    const selectedList = state.allPhotos.filter((p) => state.selectedPhotos.has(p.filename));
    if (selectedList.length === 0) return;

    if (el.batchDownloadBtn) {
      el.batchDownloadBtn.innerHTML = `<span class="spinner"></span> <span>Preparing Downloads...</span>`;
      el.batchDownloadBtn.disabled = true;
    }

    showToast(
      'Batch Download Started',
      `Downloading ${selectedList.length} original photos sequentially to preserve full quality.`,
      '🚀',
      5000
    );
    confetti.burst();

    for (let i = 0; i < selectedList.length; i++) {
      const photo = selectedList[i];
      const link = document.createElement('a');
      link.href = getOriginalUrl(photo);
      link.download = photo.filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 400ms delay between downloads to prevent browser throttle
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    if (el.batchDownloadBtn) {
      el.batchDownloadBtn.innerHTML = `<span>✓ Completed!</span>`;
      setTimeout(() => {
        toggleSelectionMode(false);
        el.batchDownloadBtn.disabled = false;
        el.batchDownloadBtn.innerHTML = `<span>⬇️ Download Selected</span>`;
      }, 2000);
    }
  }

  // --- Lightbox / Large Preview Engine ---
  function openLightbox(index) {
    if (!state.filteredPhotos[index]) return;
    state.currentIndex = index;
    state.lightboxOpen = true;
    state.isZoomed = false;
    el.lightbox.classList.remove('immersive');

    updateLightboxContent();
    renderFilmstrip();

    el.lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    state.lightboxOpen = false;
    stopSlideshow();
    el.lightbox.classList.remove('active');
    el.lightbox.classList.remove('immersive');
    document.body.style.overflow = '';
    resetZoom();
  }

  function nextPhoto() {
    if (state.currentIndex < state.filteredPhotos.length - 1) {
      state.currentIndex++;
    } else {
      state.currentIndex = 0;
    }
    if (navigator.vibrate) {
      try { navigator.vibrate(10); } catch (e) {}
    }
    updateLightboxContent();
    resetZoom();
  }

  function prevPhoto() {
    if (state.currentIndex > 0) {
      state.currentIndex--;
    } else {
      state.currentIndex = state.filteredPhotos.length - 1;
    }
    if (navigator.vibrate) {
      try { navigator.vibrate(10); } catch (e) {}
    }
    updateLightboxContent();
    resetZoom();
  }

  function updateLightboxContent() {
    const photo = state.filteredPhotos[state.currentIndex];
    if (!photo) return;

    el.lbTitle.textContent = photo.title;
    el.lbCounter.textContent = `${state.currentIndex + 1} of ${state.filteredPhotos.length}`;
    el.lbQualityPill.textContent = `Nikon Z6 III • ${photo.sizeFormatted}`;

    // Load preview with smooth cross-fade
    el.lbImg.style.opacity = '0.3';
    el.lbImg.src = encodeURI(photo.thumbUrl);

    // Progressive upgrade to full original if viewer zooms or image finishes
    const fullImg = new Image();
    fullImg.src = getOriginalUrl(photo);
    fullImg.onload = () => {
      // If still on the same photo, upgrade image source seamlessly
      if (state.lightboxOpen && state.filteredPhotos[state.currentIndex]?.filename === photo.filename) {
        el.lbImg.src = fullImg.src;
      }
    };

    el.lbImg.onload = () => {
      el.lbImg.style.opacity = '1';
    };

    // EXIF Metadata tags
    if (el.lbCameraMeta) el.lbCameraMeta.textContent = `📷 ${photo.camera}`;
    if (el.lbResMeta) el.lbResMeta.textContent = `📐 ${photo.width} × ${photo.height} (${(photo.width * photo.height / 1000000).toFixed(1)} MP)`;
    if (el.lbSizeMeta) el.lbSizeMeta.textContent = `💾 ${photo.sizeFormatted} (Original Bit-for-Bit)`;
    if (el.lbDateMeta) el.lbDateMeta.textContent = `📅 ${formatDate(photo.date)}`;

    // Update CTA button label
    if (el.lbDownloadCta) {
      el.lbDownloadCta.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span>Download Original (${photo.sizeFormatted})</span>
      `;
    }

    // Favorite button state
    const isFav = state.favorites.has(photo.filename);
    el.lbFavBtn.classList.toggle('active', isFav);
    const favSvg = el.lbFavBtn.querySelector('svg');
    if (favSvg) favSvg.setAttribute('fill', isFav ? '#e53e3e' : 'none');

    // Update filmstrip highlight
    highlightFilmstripActive();
  }

  function renderFilmstrip() {
    const filmstrip = el.lbFilmstrip;
    if (!filmstrip) return;
    filmstrip.innerHTML = '';

    // Show sliding window of thumbnails around currentIndex
    const windowSize = 14;
    const half = Math.floor(windowSize / 2);
    let start = Math.max(0, state.currentIndex - half);
    let end = Math.min(state.filteredPhotos.length, start + windowSize);
    if (end - start < windowSize) {
      start = Math.max(0, end - windowSize);
    }

    for (let i = start; i < end; i++) {
      const p = state.filteredPhotos[i];
      const thumb = document.createElement('img');
      thumb.className = `filmstrip-thumb ${i === state.currentIndex ? 'active' : ''}`;
      thumb.src = encodeURI(p.thumbUrl);
      thumb.alt = p.title;
      thumb.dataset.index = i;
      thumb.loading = 'lazy';
      thumb.addEventListener('click', () => {
        state.currentIndex = i;
        updateLightboxContent();
        resetZoom();
      });
      filmstrip.appendChild(thumb);
    }
  }

  function highlightFilmstripActive() {
    const thumbs = el.lbFilmstrip.querySelectorAll('.filmstrip-thumb');
    thumbs.forEach((thumb) => {
      const idx = parseInt(thumb.dataset.index, 10);
      thumb.classList.toggle('active', idx === state.currentIndex);
    });
  }

  // --- Zoom & Pan ---
  function toggleZoom() {
    state.isZoomed = !state.isZoomed;
    el.lbImg.classList.toggle('zoomed', state.isZoomed);
    el.lbZoomBtn.classList.toggle('active', state.isZoomed);

    if (state.isZoomed) {
      // Ensure full resolution is loaded
      const photo = state.filteredPhotos[state.currentIndex];
      if (photo) el.lbImg.src = getOriginalUrl(photo);
    } else {
      resetZoom();
    }
  }

  function resetZoom() {
    state.isZoomed = false;
    el.lbImg.classList.remove('zoomed');
    el.lbZoomBtn.classList.remove('active');
    el.lbImgContainer.style.transform = '';
  }

  // Pan logic for zoomed image
  let isDragging = false;
  let startX, startY, currentX = 0, currentY = 0;

  el.lbImgContainer.addEventListener('mousedown', (e) => {
    if (!state.isZoomed) return;
    isDragging = true;
    startX = e.clientX - currentX;
    startY = e.clientY - currentY;
    el.lbImg.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging || !state.isZoomed) return;
    currentX = e.clientX - startX;
    currentY = e.clientY - startY;
    el.lbImgContainer.style.transform = `translate(${currentX}px, ${currentY}px)`;
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      el.lbImg.style.cursor = 'grab';
    }
  });

  // --- Slideshow Mode ---
  function toggleSlideshow() {
    if (state.slideshowRunning) {
      stopSlideshow();
    } else {
      startSlideshow();
    }
  }

  function startSlideshow() {
    if (!state.lightboxOpen) {
      openLightbox(state.currentIndex);
    }
    state.slideshowRunning = true;
    el.lbSlideshowBtn.classList.add('active');
    if (el.btnSlideshow) el.btnSlideshow.classList.add('primary');

    showToast('Slideshow Started', 'Photos auto-advance every 3.5 seconds. Press Space to pause.', '▶️', 3000);

    state.slideshowTimer = setInterval(() => {
      nextPhoto();
    }, 3500);
  }

  function stopSlideshow() {
    state.slideshowRunning = false;
    if (state.slideshowTimer) clearInterval(state.slideshowTimer);
    el.lbSlideshowBtn.classList.remove('active');
    if (el.btnSlideshow) el.btnSlideshow.classList.remove('primary');
  }

  // --- Fullscreen Toggle ---
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  }

  // --- Keyboard Shortcuts ---
  window.addEventListener('keydown', (e) => {
    if (!state.lightboxOpen) {
      if (e.key === '/' && document.activeElement !== el.searchInput) {
        e.preventDefault();
        el.searchInput.focus();
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        closeLightbox();
        break;
      case 'ArrowRight':
      case 'l':
        nextPhoto();
        break;
      case 'ArrowLeft':
      case 'h':
        prevPhoto();
        break;
      case ' ':
        e.preventDefault();
        toggleSlideshow();
        break;
      case 'f':
      case 'F':
        toggleFullscreen();
        break;
      case 'z':
      case 'Z':
        toggleZoom();
        break;
      case 'd':
      case 'D':
        triggerDownload(state.filteredPhotos[state.currentIndex], el.lbDownloadCta);
        break;
    }
  });

  // --- Enhanced Mobile Touch & Gesture Engine for Lightbox ---
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  let lastTapTime = 0;
  let singleTapTimer = null;
  let initialPinchDistance = null;

  function initMobileTouchGestures() {
    if (!el.lightbox) return;

    el.lightbox.addEventListener(
      'touchstart',
      (e) => {
        if (!state.lightboxOpen) return;

        // Two-finger pinch to zoom
        if (e.touches.length === 2) {
          initialPinchDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          return;
        }

        if (e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          touchStartTime = Date.now();
          if (!state.isZoomed && el.lbImgContainer) {
            el.lbImgContainer.style.transition = 'none';
          }
        }
      },
      { passive: true }
    );

    el.lightbox.addEventListener(
      'touchmove',
      (e) => {
        if (!state.lightboxOpen) return;

        // Handle pinch zoom
        if (e.touches.length === 2 && initialPinchDistance) {
          const currentDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          const ratio = currentDistance / initialPinchDistance;
          if (ratio > 1.35 && !state.isZoomed) {
            toggleZoom();
            initialPinchDistance = null;
          } else if (ratio < 0.75 && state.isZoomed) {
            resetZoom();
            initialPinchDistance = null;
          }
          return;
        }

        if (e.touches.length === 1 && !state.isZoomed && el.lbImgContainer) {
          const currentX = e.touches[0].clientX;
          const currentY = e.touches[0].clientY;
          const diffX = currentX - touchStartX;
          const diffY = currentY - touchStartY;

          // Pull down to dismiss drag effect
          if (diffY > 15 && diffY > Math.abs(diffX) * 1.2) {
            const progress = Math.min(diffY / 280, 1);
            el.lbImgContainer.style.transform = `translateY(${diffY * 0.7}px) scale(${1 - progress * 0.15})`;
            el.lightbox.style.backgroundColor = `rgba(12, 10, 9, ${0.96 * (1 - progress * 0.6)})`;
            return;
          }

          // Horizontal swipe drag preview
          if (Math.abs(diffX) > 10 && Math.abs(diffX) > Math.abs(diffY)) {
            el.lbImgContainer.style.transform = `translateX(${diffX * 0.75}px)`;
          }
        }
      },
      { passive: true }
    );

    el.lightbox.addEventListener(
      'touchend',
      (e) => {
        if (!state.lightboxOpen) return;
        initialPinchDistance = null;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        const duration = Date.now() - touchStartTime;

        // Reset visual dragging transforms with smooth spring
        if (el.lbImgContainer) {
          el.lbImgContainer.style.transition = 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1)';
        }
        el.lightbox.style.backgroundColor = '';

        // Pull down to dismiss threshold
        if (!state.isZoomed && diffY > 75 && diffY > Math.abs(diffX) * 1.3) {
          if (el.lbImgContainer) {
            el.lbImgContainer.style.transform = 'translateY(100vh) scale(0.8)';
          }
          setTimeout(() => {
            closeLightbox();
            if (el.lbImgContainer) el.lbImgContainer.style.transform = '';
          }, 180);
          return;
        }

        // Horizontal swipe navigation threshold
        if (!state.isZoomed && Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY)) {
          if (el.lbImgContainer) el.lbImgContainer.style.transform = '';
          if (diffX < 0) {
            nextPhoto();
          } else {
            prevPhoto();
          }
          return;
        }

        // Reset container transform if swipe threshold was not met
        if (!state.isZoomed && el.lbImgContainer) {
          el.lbImgContainer.style.transform = '';
        }

        // Tap handling (when finger barely moved)
        if (Math.abs(diffX) < 12 && Math.abs(diffY) < 12 && duration < 280) {
          const target = e.target;
          if (
            target.closest('.lightbox-actions') ||
            target.closest('.lightbox-footer') ||
            target.closest('.lightbox-nav-btn') ||
            target.closest('.mobile-back-btn') ||
            target.closest('.lightbox-swipe-bar')
          ) {
            return;
          }

          const now = Date.now();
          if (now - lastTapTime < 300) {
            // Double tap -> Toggle zoom
            if (singleTapTimer) clearTimeout(singleTapTimer);
            lastTapTime = 0;
            toggleZoom();
          } else {
            // Single tap -> Toggle immersive full-screen view (hide/show header & footer)
            lastTapTime = now;
            singleTapTimer = setTimeout(() => {
              if (state.lightboxOpen && !state.isZoomed) {
                el.lightbox.classList.toggle('immersive');
              }
            }, 280);
          }
        }
      },
      { passive: true }
    );
  }

  // --- Scroll Effects & Back to Top ---
  window.addEventListener(
    'scroll',
    () => {
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;

      if (el.scrollProgress) {
        el.scrollProgress.style.width = `${scrolled}%`;
      }

      if (el.controlBar) {
        el.controlBar.classList.toggle('scrolled', winScroll > 150);
      }

      if (el.backToTop) {
        el.backToTop.classList.toggle('visible', winScroll > 400);
      }
    },
    { passive: true }
  );

  if (el.backToTop) {
    el.backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // --- Event Listeners Initialization ---
  function initEvents() {
    // Search input
    el.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      if (el.searchClearBtn) {
        el.searchClearBtn.classList.toggle('visible', state.searchQuery.length > 0);
      }
      applyFiltersAndSort();
    });

    // Clear search button
    if (el.searchClearBtn) {
      el.searchClearBtn.addEventListener('click', () => {
        el.searchInput.value = '';
        state.searchQuery = '';
        el.searchClearBtn.classList.remove('visible');
        el.searchInput.focus();
        applyFiltersAndSort();
      });
    }

    // Mobile back button in lightbox
    if (el.lbMobileBack) {
      el.lbMobileBack.addEventListener('click', closeLightbox);
    }

    // Filter tabs
    el.filterTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        el.filterTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        state.activeFilter = tab.dataset.filter;
        applyFiltersAndSort();
      });
    });

    // Layout switcher
    el.layoutBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        el.layoutBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.layout = btn.dataset.layout;
        renderGallery();
      });
    });

    // Sort select
    if (el.sortSelect) {
      el.sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        applyFiltersAndSort();
      });
    }

    // Select mode button
    if (el.btnSelectMode) {
      el.btnSelectMode.addEventListener('click', () => toggleSelectionMode());
    }

    // Slideshow button in header
    if (el.btnSlideshow) {
      el.btnSlideshow.addEventListener('click', () => {
        if (!state.lightboxOpen) openLightbox(0);
        startSlideshow();
      });
    }

    // Lightbox Controls
    el.lbClose.addEventListener('click', closeLightbox);
    el.lbNext.addEventListener('click', nextPhoto);
    el.lbPrev.addEventListener('click', prevPhoto);
    el.lbZoomBtn.addEventListener('click', toggleZoom);
    el.lbSlideshowBtn.addEventListener('click', toggleSlideshow);
    if (el.lbFullscreenBtn) {
      el.lbFullscreenBtn.addEventListener('click', toggleFullscreen);
    }

    el.lbFavBtn.addEventListener('click', () => {
      const photo = state.filteredPhotos[state.currentIndex];
      if (photo) toggleFavorite(photo.filename, el.lbFavBtn);
    });

    el.lbDownloadCta.addEventListener('click', () => {
      const photo = state.filteredPhotos[state.currentIndex];
      if (photo) triggerDownload(photo, el.lbDownloadCta);
    });

    // Batch Drawer buttons
    if (el.batchDownloadBtn) {
      el.batchDownloadBtn.addEventListener('click', downloadBatchSelected);
    }
    if (el.batchCancelBtn) {
      el.batchCancelBtn.addEventListener('click', () => toggleSelectionMode(false));
    }

    // Double click to zoom in Lightbox
    el.lbImg.addEventListener('dblclick', toggleZoom);

    // Initialize Mobile Touch Gestures
    initMobileTouchGestures();
  }

  // --- Bootstrap App ---
  function init() {
    initEvents();
    applyFiltersAndSort();
    console.log(`Baby Showers Gallery initialized with ${state.allPhotos.length} original photos.`);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

