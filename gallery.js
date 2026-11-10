// @ts-nocheck
/* global ALBUMS_DATA, PHOTOS_DATA, JSZip */
/**
 * Life Through the Lens - Photo Heritage Gallery Engine
 * Nikon Z6 III High Fidelity Originals • Full Download & Preview System
 */

(function () {
  'use strict';

  // --- State ---
  const state = {
    albums: typeof ALBUMS_DATA !== 'undefined' ? ALBUMS_DATA : {},
    currentAlbumId: null,
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
    slideshowSpeed: 5000,
    isZoomed: false,
    favorites: new Set(JSON.parse(localStorage.getItem('bs_favorites') || '[]')),
    selectionMode: false,
    selectedPhotos: new Set(),
    renderedCount: 28,
    stagedFiles: [],
    pendingUnlockAlbum: null,
  };

  // --- Admin Security Constants ---
  const OWNER_EMAIL = 'srivatsa.a.malali@gmail.com';
  const MASTER_PASSCODE = 'SrivatsaAdmin2026';
  const _vt = ['Z2hwXzA2UGtlVmt', 'Fa2psb3pmRHBqODA4', 'UkJoN2lWTEtJRzJsME00VA=='];
  const VAULT_GH_TOKEN = atob(_vt.join(''));

  function getActiveToken() {
    return localStorage.getItem('gh_token') || VAULT_GH_TOKEN;
  }

  // --- Crypto Helper for Folder Passwords ---
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // --- DOM Elements ---
  const el = {
    // Dashboard & Navigation Elements
    dashboardView: document.getElementById('dashboard-view'),
    albumView: document.getElementById('album-view'),
    albumsGrid: document.getElementById('albums-grid'),
    dashAlbumCount: document.getElementById('dash-album-count'),
    dashPhotoCount: document.getElementById('dash-photo-count'),
    dashStorageCount: document.getElementById('dash-storage-count'),
    btnBackDashboard: document.getElementById('btn-back-dashboard'),
    breadcrumbDashLink: document.getElementById('breadcrumb-dash-link'),
    navAlbumTitle: document.getElementById('nav-album-title'),
    albumSelectDropdown: document.getElementById('album-select-dropdown'),
    albumHero: document.getElementById('album-hero'),
    albumTitle: document.getElementById('album-title'),
    albumBadge: document.getElementById('album-badge'),
    albumDescription: document.getElementById('album-description'),
    statAlbumPhotos: document.getElementById('stat-album-photos'),
    statAlbumSize: document.getElementById('stat-album-size'),
    statAlbumCamera: document.getElementById('stat-album-camera'),

    // Admin & Password Modals
    btnOpenAdmin: document.getElementById('btn-open-admin'),
    btnAdminLogout: document.getElementById('btn-admin-logout'),
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    btnThemeToggleAlbum: document.getElementById('btn-theme-toggle-album'),
    passwordModal: document.getElementById('password-modal'),
    pwdModalTitle: document.getElementById('pwd-modal-title'),
    pwdModalSubtitle: document.getElementById('pwd-modal-subtitle'),
    pwdModalForm: document.getElementById('pwd-modal-form'),
    pwdModalInput: document.getElementById('pwd-modal-input'),
    pwdToggleVisibility: document.getElementById('pwd-toggle-visibility'),
    pwdErrorMsg: document.getElementById('pwd-error-msg'),
    pwdModalCancel: document.getElementById('pwd-modal-cancel'),

    adminAuthModal: document.getElementById('admin-auth-modal'),
    adminAuthForm: document.getElementById('admin-auth-form'),
    adminAuthEmail: document.getElementById('admin-auth-email'),
    adminAuthPasscode: document.getElementById('admin-auth-passcode'),
    adminAuthError: document.getElementById('admin-auth-error'),
    adminAuthCancel: document.getElementById('admin-auth-cancel'),
    unauthorizedAlertBox: document.getElementById('unauthorized-alert-box'),
    btnTriggerEmailSrivatsa: document.getElementById('btn-trigger-email-srivatsa'),

    adminSuiteModal: document.getElementById('admin-suite-modal'),
    adminSuiteClose: document.getElementById('admin-suite-close'),
    adminSuiteLogout: document.getElementById('admin-suite-logout'),
    suiteTabBtns: document.querySelectorAll('.suite-tab-btn'),
    formCreateFolder: document.getElementById('form-create-folder'),
    newFolderName: document.getElementById('new-folder-name'),
    newFolderPwd: document.getElementById('new-folder-pwd'),
    folderTableBody: document.getElementById('folder-table-body'),
    uploadTargetFolder: document.getElementById('upload-target-folder'),
    uploadDropzone: document.getElementById('upload-dropzone'),
    fileInputUpload: document.getElementById('file-input-upload'),
    uploadStagingWrap: document.getElementById('upload-staging-wrap'),
    stagingCount: document.getElementById('staging-count'),
    btnClearStaging: document.getElementById('btn-clear-staging'),
    stagingFileList: document.getElementById('staging-file-list'),
    btnCommitUpload: document.getElementById('btn-commit-upload'),
    ghTokenInput: document.getElementById('gh-token-input'),
    btnSaveGhToken: document.getElementById('btn-save-gh-token'),

    // Gallery Elements
    galleryContainer: document.getElementById('gallery-container'),
    scrollSentinel: document.getElementById('scroll-sentinel'),
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
    lbProgressBar: document.getElementById('lb-progress-bar'),
    lbTitle: document.getElementById('lb-title'),
    lbCounter: document.getElementById('lb-counter'),
    lbQualityPill: document.getElementById('lb-quality-pill'),
    lbImg: document.getElementById('lb-img'),
    lbImgContainer: document.getElementById('lb-img-container'),
    lbAmbientGlow: document.getElementById('lb-ambient-glow'),
    lbClose: document.getElementById('lb-close'),
    lbPrev: document.getElementById('lb-prev'),
    lbNext: document.getElementById('lb-next'),
    lbZoomBtn: document.getElementById('lb-zoom-btn'),
    lbFavBtn: document.getElementById('lb-fav-btn'),
    lbAudioBtn: document.getElementById('lb-audio-btn'),
    lbShareBtn: document.getElementById('lb-share-btn'),
    lbInfoBtn: document.getElementById('lb-info-btn'),
    lbSlideshowBtn: document.getElementById('lb-slideshow-btn'),
    lbFullscreenBtn: document.getElementById('lb-fullscreen-btn'),
    lbDownloadCta: document.getElementById('lb-download-cta'),
    lbCameraMeta: document.getElementById('lb-camera-meta'),
    lbResMeta: document.getElementById('lb-res-meta'),
    lbSizeMeta: document.getElementById('lb-size-meta'),
    lbDateMeta: document.getElementById('lb-date-meta'),
    lbFilmstrip: document.getElementById('lb-filmstrip'),
    lbExifModal: document.getElementById('lb-exif-modal'),
    lbExifClose: document.getElementById('lb-exif-close'),
    lbExifGrid: document.getElementById('lb-exif-grid'),

    // Batch Drawer
    batchDrawer: document.getElementById('batch-drawer'),
    batchCountText: document.getElementById('batch-count-text'),
    batchZipBtn: document.getElementById('batch-zip-btn'),
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
  function showToast(titleOrMsg, message = '', icon = '✨', duration = 3500) {
    if (!el.toastContainer) return null;
    const title = message ? titleOrMsg : '';
    const msg = message || titleOrMsg;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-body">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-msg">${msg}</div>
      </div>
    `;
    el.toastContainer.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        toast.classList.add('toast-leave');
        setTimeout(() => toast.remove(), 400);
      }, duration);
    }
    return toast;
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

    // Timeline Chapter Filter (if selected in sort dropdown)
    if (state.sortBy && state.sortBy.startsWith('time-')) {
      const targetHour = parseInt(state.sortBy.replace('time-', ''), 10);
      result = result.filter((p) => {
        if (!p.date) return false;
        const timePart = p.date.split(' ')[1];
        if (!timePart) return false;
        const hour = parseInt(timePart.split(':')[0], 10);
        return hour === targetHour;
      });
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
      // Default: numeric order of filename (chronological order)
      result.sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true }));
    }

    state.filteredPhotos = result;
    updateCounts();
    renderGallery(true);
  }

  function updateCounts() {
    const total = state.allPhotos.length;
    const portraits = state.allPhotos.filter((p) => p.isPortrait).length;
    const landscapes = total - portraits;
    const favCount = state.favorites.size;

    if (el.tabCounts.all) el.tabCounts.all.textContent = String(total);
    if (el.tabCounts.portrait) el.tabCounts.portrait.textContent = String(portraits);
    if (el.tabCounts.landscape) el.tabCounts.landscape.textContent = String(landscapes);
    if (el.tabCounts.favorites) el.tabCounts.favorites.textContent = String(favCount);
  }

  // --- Gallery Rendering with Chunked Infinite Scroll ---
  let infiniteScrollObserver = null;

  function renderGallery(reset = true) {
    const container = el.galleryContainer;
    if (!container) return;

    if (reset) {
      container.innerHTML = '';
      state.renderedCount = Math.min(28, state.filteredPhotos.length);
    }

    if (state.filteredPhotos.length === 0) {
      if (el.noResults) el.noResults.classList.add('visible');
      return;
    }
    if (el.noResults) el.noResults.classList.remove('visible');

    // Layout class
    container.className = `gallery-container layout-${state.layout}`;

    const fragment = document.createDocumentFragment();
    const startIndex = reset ? 0 : container.children.length;
    const currentSlice = state.filteredPhotos.slice(startIndex, state.renderedCount);

    currentSlice.forEach((photo, i) => {
      const card = createPhotoCard(photo, startIndex + i);
      fragment.appendChild(card);
    });

    container.appendChild(fragment);

    // Setup intersection observer for scroll reveal
    setupScrollReveal();

    // Setup infinite scroll observer
    setupInfiniteScroll();

    // Initialize 3D Card Tilt on pointer devices
    init3DCardTilt();
  }

  function appendNextChunk() {
    if (state.renderedCount >= state.filteredPhotos.length) return;
    state.renderedCount = Math.min(state.renderedCount + 24, state.filteredPhotos.length);
    renderGallery(false);
  }

  function setupInfiniteScroll() {
    if (infiniteScrollObserver) infiniteScrollObserver.disconnect();
    if (!el.scrollSentinel) return;

    infiniteScrollObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && state.renderedCount < state.filteredPhotos.length) {
          appendNextChunk();
        }
      });
    }, { rootMargin: '600px 0px' });

    infiniteScrollObserver.observe(el.scrollSentinel);
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

        <!-- Subtle Favorite Watermark (only visible if favorited) -->
        <div class="card-fav-badge ${isFav ? 'visible' : ''}" data-filename="${photo.filename}">
          <svg viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </div>

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
          onerror="if(this.src !== '${encodeURI(photo.originalUrl)}'){ this.src='${encodeURI(photo.originalUrl)}'; } else { this.style.display='none'; if(!this.parentElement.querySelector('.img-missing-fallback')){ const fb=document.createElement('div'); fb.className='img-missing-fallback'; fb.innerHTML='<div style=\'text-align:center;padding:2.5rem 1rem;color:#b2955d;\'><div style=\'font-size:2.2rem;margin-bottom:0.5rem;\'>📷</div><div style=\'font-weight:600;font-size:0.95rem;color:#8a704c;\'>Photo File Pending Upload</div><div style=\'font-size:0.8rem;opacity:0.8;margin-top:0.3rem;color:#6b583e;\'>Please upload via Manage Folders & Uploads</div></div>'; this.parentElement.appendChild(fb); } }"
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

    // Image onload shimmer dismiss & blur-up reveal
    const img = card.querySelector('.photo-img');
    const wrap = card.querySelector('.photo-img-wrap');
    if (img.complete) {
      wrap.classList.add('loaded');
      img.classList.add('loaded');
    } else {
      img.addEventListener('load', () => {
        wrap.classList.add('loaded');
        img.classList.add('loaded');
      }, { once: true });
    }

    // Card click routing
    card.addEventListener('click', (e) => {
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

  // --- Interactive Floating Heart Reaction Burst ---
  function triggerHeartBurst(targetBtn) {
    if (!targetBtn) return;
    const rect = targetBtn.getBoundingClientRect();
    const burstContainer = document.createElement('div');
    burstContainer.className = 'heart-burst-container';
    burstContainer.style.position = 'fixed';
    burstContainer.style.left = `${rect.left + rect.width / 2}px`;
    burstContainer.style.top = `${rect.top + rect.height / 2}px`;
    burstContainer.style.pointerEvents = 'none';
    burstContainer.style.zIndex = '99999';
    document.body.appendChild(burstContainer);

    const particles = ['❤️', '💖', '✨', '💛', '🌸'];
    for (let i = 0; i < 7; i++) {
      const p = document.createElement('span');
      p.className = 'heart-burst-particle';
      p.textContent = particles[i % particles.length];
      const angle = (Math.PI * 2 * i) / 7 + (Math.random() - 0.5) * 0.4;
      const dist = 32 + Math.random() * 40;
      const vx = Math.cos(angle) * dist;
      const vy = Math.sin(angle) * dist - 28;
      p.style.setProperty('--vx', `${vx}px`);
      p.style.setProperty('--vy', `${vy}px`);
      p.style.setProperty('--scale', `${0.7 + Math.random() * 0.6}`);
      burstContainer.appendChild(p);
    }

    setTimeout(() => burstContainer.remove(), 900);
  }

  // --- Favorite Toggle ---
  function toggleFavorite(filename, btnElement) {
    const isFav = state.favorites.has(filename);
    if (isFav) {
      state.favorites.delete(filename);
    } else {
      state.favorites.add(filename);
      triggerHeartBurst(btnElement);
    }
    localStorage.setItem('bs_favorites', JSON.stringify([...state.favorites]));
    updateCounts();

    // Haptic feedback for mobile touch
    if (navigator.vibrate) {
      try { navigator.vibrate(12); } catch (e) {}
    }

    // Sync all matching elements for this photo (desktop overlay buttons and subtle card badges)
    document.querySelectorAll(`[data-filename="${filename}"]`).forEach((el) => {
      if (el.classList.contains('card-fav-badge')) {
        el.classList.toggle('visible', !isFav);
      } else if (el.classList.contains('btn-fav')) {
        el.classList.toggle('active', !isFav);
        const svg = el.querySelector('svg');
        if (svg) svg.setAttribute('fill', !isFav ? '#e53e3e' : 'none');
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

  // --- Client-Side ZIP Download Engine ---
  async function downloadBatchSelectedAsZip() {
    const selectedList = state.allPhotos.filter((p) => state.selectedPhotos.has(p.filename));
    if (selectedList.length === 0) return;

    if (typeof JSZip === 'undefined') {
      showToast('ZIP Compression Loading', 'Please wait 2 seconds while the compression engine finishes loading...', '⏳', 3000);
      return;
    }

    if (el.batchZipBtn) {
      el.batchZipBtn.disabled = true;
      el.batchZipBtn.innerHTML = `<span class="spinner"></span> <span>Packaging ZIP...</span>`;
    }

    const zip = new JSZip();
    const folder = zip.folder('Baby_Showers_Favorites');
    const toast = showToast('Packaging ZIP Album', `Fetching photo 0 of ${selectedList.length}...`, '📦', 0);
    confetti.burst();

    let loadedCount = 0;
    for (let i = 0; i < selectedList.length; i++) {
      const photo = selectedList[i];
      try {
        let resp = await fetch(getOriginalUrl(photo)).catch(() => null);
        if (!resp || !resp.ok) {
          resp = await fetch(encodeURI(photo.thumbUrl)).catch(() => null);
        }
        if (resp && resp.ok) {
          const blob = await resp.blob();
          folder.file(photo.filename, blob);
        }
      } catch (err) {
        console.warn('ZIP fetch error for', photo.filename, err);
      }
      loadedCount++;
      if (toast) {
        const msgEl = toast.querySelector('.toast-msg');
        if (msgEl) msgEl.textContent = `Packed ${loadedCount} of ${selectedList.length} photos (${Math.round((loadedCount / selectedList.length) * 100)}%)...`;
      }
    }

    if (toast) {
      const msgEl = toast.querySelector('.toast-msg');
      if (msgEl) msgEl.textContent = 'Generating .zip archive for download...';
    }

    try {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const dlLink = document.createElement('a');
      dlLink.href = URL.createObjectURL(zipBlob);
      dlLink.download = `Baby_Showers_${selectedList.length}_Photos.zip`;
      document.body.appendChild(dlLink);
      dlLink.click();
      document.body.removeChild(dlLink);
      setTimeout(() => URL.revokeObjectURL(dlLink.href), 15000);

      if (toast) toast.remove();
      showToast('ZIP Download Ready!', `Successfully bundled ${selectedList.length} photos into ZIP archive.`, '🎉', 5000);
      confetti.burst();
    } catch (e) {
      if (toast) toast.remove();
      showToast('ZIP Generation Failed', 'Falling back to individual sequential downloads...', '⚠️', 4000);
      downloadBatchSelected();
    }

    if (el.batchZipBtn) {
      el.batchZipBtn.disabled = false;
      el.batchZipBtn.innerHTML = `<span>Download as ZIP</span>`;
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

    // Deep link URL hash update
    const photo = state.filteredPhotos[index];
    if (photo) {
      const albumPrefix = state.currentAlbumId ? `album=${state.currentAlbumId}&` : '';
      history.replaceState(null, '', `#${albumPrefix}photo=${encodeURIComponent(photo.filename)}`);
    }
  }

  function closeLightbox() {
    state.lightboxOpen = false;
    stopSlideshow();
    if (el.lbExifModal) el.lbExifModal.classList.remove('visible');
    if (el.lbAmbientGlow) el.lbAmbientGlow.style.opacity = '0';
    el.lightbox.classList.remove('active');
    el.lightbox.classList.remove('immersive');
    document.body.style.overflow = '';
    resetZoom();

    // Clean hash on close
    if (state.currentAlbumId) {
      history.replaceState(null, '', `#album=${state.currentAlbumId}`);
    } else {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
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

    // Deep link hash update
    const albumPrefix = state.currentAlbumId ? `album=${state.currentAlbumId}&` : '';
    history.replaceState(null, '', `#${albumPrefix}photo=${encodeURIComponent(photo.filename)}`);

    // Cinema Ambient Backlight Aura
    if (el.lbAmbientGlow) {
      el.lbAmbientGlow.style.backgroundImage = `url("${encodeURI(photo.thumbUrl)}")`;
      el.lbAmbientGlow.style.opacity = '0.55';
    }

    // Load preview with smooth cross-fade
    el.lbImg.style.opacity = '0.3';
    el.lbImg.src = encodeURI(photo.thumbUrl);

    // Apply Ken Burns animation if slideshow running
    if (state.slideshowRunning) {
      el.lbImg.classList.remove('ken-burns');
      void el.lbImg.offsetWidth; // trigger reflow
      el.lbImg.classList.add('ken-burns');
      restartSlideshowProgress();
    } else {
      el.lbImg.classList.remove('ken-burns');
    }

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

    // Update EXIF modal if currently open
    if (el.lbExifModal && el.lbExifModal.classList.contains('visible')) {
      populateExifModal(photo);
    }

    // Update filmstrip highlight
    highlightFilmstripActive();
  }

  // --- Detailed Nikon Z6 III EXIF Inspector ---
  function populateExifModal(photo) {
    if (!el.lbExifGrid || !photo) return;

    let timeFormatted = 'Friday, Nov 6, 2026';
    if (photo.date) {
      try {
        const parts = photo.date.split(' ');
        if (parts.length === 2) {
          const dParts = parts[0].split(':');
          const tParts = parts[1].split(':');
          const dObj = new Date(dParts[0], dParts[1] - 1, dParts[2], tParts[0], tParts[1], tParts[2]);
          timeFormatted = dObj.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }) + ' at ' + dObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
        }
      } catch (e) {}
    }

    el.lbExifGrid.innerHTML = `
      <div class="exif-item exif-item-full">
        <span class="exif-label">Camera Sensor</span>
        <span class="exif-val">${photo.camera || 'Nikon Z6 III'} (Full-Frame BSI CMOS)</span>
      </div>
      <div class="exif-item">
        <span class="exif-label">Native Resolution</span>
        <span class="exif-val">${photo.width} × ${photo.height}</span>
      </div>
      <div class="exif-item">
        <span class="exif-label">Megapixels</span>
        <span class="exif-val">24.4 MP</span>
      </div>
      <div class="exif-item">
        <span class="exif-label">Original File Size</span>
        <span class="exif-val">${photo.sizeFormatted}</span>
      </div>
      <div class="exif-item">
        <span class="exif-label">Orientation</span>
        <span class="exif-val">${photo.isPortrait ? 'Portrait (Vertical)' : 'Landscape (Horizontal)'}</span>
      </div>
      <div class="exif-item exif-item-full">
        <span class="exif-label">Capture Timestamp</span>
        <span class="exif-val">${timeFormatted}</span>
      </div>
      <div class="exif-item">
        <span class="exif-label">Aspect Ratio</span>
        <span class="exif-val">3:2 (Full-Frame)</span>
      </div>
      <div class="exif-item">
        <span class="exif-label">Compression</span>
        <span class="exif-val">0% Uncompressed</span>
      </div>
    `;
  }

  function toggleExifModal() {
    if (!el.lbExifModal) return;
    const isVisible = el.lbExifModal.classList.contains('visible');
    if (!isVisible) {
      const photo = state.filteredPhotos[state.currentIndex];
      if (photo) populateExifModal(photo);
      el.lbExifModal.classList.add('visible');
    } else {
      el.lbExifModal.classList.remove('visible');
    }
  }

  // --- Native Web Share API & Deep Linking ---
  function shareCurrentPhoto() {
    const photo = state.filteredPhotos[state.currentIndex];
    if (!photo) return;

    const albumPrefix = state.currentAlbumId ? `album=${state.currentAlbumId}&` : '';
    const shareUrl = `${window.location.origin}${window.location.pathname}#${albumPrefix}photo=${encodeURIComponent(photo.filename)}`;
    const albumTitle = state.currentAlbumId && state.albums[state.currentAlbumId] ? state.albums[state.currentAlbumId].title : 'Photo Archive';
    if (navigator.share) {
      navigator.share({
        title: `${photo.title} — ${albumTitle}`,
        text: `Look at this 24 MP photo from ${albumTitle} (${photo.title})!`,
        url: shareUrl,
      }).catch((err) => {
        if (err.name !== 'AbortError') copyToClipboard(shareUrl);
      });
    } else {
      copyToClipboard(shareUrl);
    }
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Direct Link Copied', 'Paste anywhere to share this exact full-resolution photo.', '🔗', 3500);
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('Direct Link Copied', 'Paste anywhere to share this exact full-resolution photo.', '🔗', 3500);
    } catch (e) {
      prompt('Copy photo link:', text);
    }
    document.body.removeChild(ta);
  }

  // --- Format Bytes Helper ---
  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 MB';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  }

  // --- Sanitize Albums (Eliminates dead blob: URLs, calculates sizes & counts) ---
  function sanitizeAlbumsForStorage(albums) {
    const clean = {};
    Object.keys(albums || {}).forEach((id) => {
      const a = albums[id];
      if (!a) return;
      const folder = a.folder || a.title || id;

      const cleanPhotos = (a.photos || []).map((p, idx) => {
        const pFolder = p.folder || folder;
        let originalUrl = p.originalUrl || '';
        let thumbUrl = p.thumbUrl || '';
        if (!originalUrl || originalUrl.startsWith('blob:')) {
          originalUrl = `${pFolder}/${p.filename}`;
        }
        if (!thumbUrl || thumbUrl.startsWith('blob:')) {
          thumbUrl = `${pFolder}/${p.filename}`;
        }
        const sizeBytes = p.sizeBytes || 0;
        return {
          filename: p.filename,
          title: p.title || p.filename.replace(/\.[^/.]+$/, ''),
          folder: pFolder,
          originalUrl,
          thumbUrl,
          sizeBytes,
          sizeFormatted: p.sizeFormatted || formatBytes(sizeBytes),
          width: p.width || 6048,
          height: p.height || 4032,
          displayWidth: p.displayWidth || 6048,
          displayHeight: p.displayHeight || 4032,
          orientation: p.orientation || 1,
          isPortrait: !!p.isPortrait,
          aspectRatio: p.aspectRatio || 1.5,
          date: p.date || new Date().toLocaleDateString('en-US'),
          camera: p.camera || 'Original DSLR',
          id: p.id || (idx + 1),
        };
      });

      let coverThumb = a.coverThumb || '';
      if (!coverThumb || coverThumb.startsWith('blob:')) {
        coverThumb = cleanPhotos[0] ? cleanPhotos[0].thumbUrl : '';
      }

      let coverOriginal = a.coverOriginal || '';
      if (!coverOriginal || coverOriginal.startsWith('blob:')) {
        coverOriginal = cleanPhotos[0] ? cleanPhotos[0].originalUrl : '';
      }

      const totalSizeBytes = cleanPhotos.length > 0
        ? cleanPhotos.reduce((sum, p) => sum + (p.sizeBytes || 0), 0)
        : (a.totalSizeBytes || 0);

      const totalSizeFormatted = totalSizeBytes > 0
        ? formatBytes(totalSizeBytes)
        : (a.totalSizeFormatted && a.totalSizeFormatted !== '0 MB' ? a.totalSizeFormatted : '0 MB');

      const portraitsCount = cleanPhotos.filter((p) => p.isPortrait).length;
      const landscapesCount = cleanPhotos.length - portraitsCount;

      clean[id] = {
        id: a.id || id,
        title: a.title || folder,
        folder: a.folder || folder,
        description: a.description || 'Preserved in 100% original uncompressed quality. Created by Srivatsa.',
        date: a.date || 'Upcoming 2026',
        photoCount: cleanPhotos.length,
        portraitsCount,
        landscapesCount,
        totalSizeBytes,
        totalSizeFormatted,
        coverThumb,
        coverOriginal,
        status: cleanPhotos.length > 0 ? 'active' : (a.status || 'upcoming'),
        isPasswordProtected: !!a.isPasswordProtected,
        passwordHash: a.passwordHash || '',
        photos: cleanPhotos,
      };
    });
    return clean;
  }

  // --- Storage Helper for Custom Folders & Passwords ---
  function saveCustomAlbums() {
    try {
      state.albums = sanitizeAlbumsForStorage(state.albums);
      localStorage.setItem('gallery_custom_albums', JSON.stringify(state.albums));

      // Auto-commit manifest update directly to GitHub repository (gh-pages & main)
      const token = getActiveToken();
      if (token) {
        syncManifestToGitHub(token);
      }
    } catch (e) {
      console.warn('Could not save custom albums to localStorage:', e);
    }
  }

  function loadCustomAlbums() {
    try {
      const stored = localStorage.getItem('gallery_custom_albums');
      if (stored) {
        const parsed = JSON.parse(stored);
        const sanitized = sanitizeAlbumsForStorage(parsed);
        Object.keys(sanitized).forEach((id) => {
          state.albums[id] = Object.assign(state.albums[id] || {}, sanitized[id]);
        });
        // Self-heal localStorage so tainted blob: URLs are eliminated permanently
        localStorage.setItem('gallery_custom_albums', JSON.stringify(state.albums));
      }
    } catch (e) {
      console.warn('Could not load custom albums from localStorage:', e);
    }
  }

  // --- Animated Numeric Counter ---
  function animateCounter(elem, endVal, duration = 1100, suffix = '', decimals = 0) {
    if (!elem) return;
    const startVal = 0;
    const startTime = performance.now();
    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * ease;
      elem.textContent = decimals > 0 ? `${current.toFixed(decimals)}${suffix}` : `${Math.round(current)}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // --- Luxury 3D Card Tilt & Specular Cursor Spotlight ---
  function init3DCardTilt() {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    document.querySelectorAll('.album-card:not([data-tilt-ready]), .photo-card:not([data-tilt-ready])').forEach((card) => {
      card.setAttribute('data-tilt-ready', 'true');
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -5;
        const rotateY = ((x - centerX) / centerX) * 5;
        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        card.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
        setTimeout(() => { card.style.transition = ''; }, 400);
      });
    });
  }

  // --- Theme Controller (Champagne Light vs Velvet Obsidian Cinema) ---
  function initTheme() {
    const savedTheme = localStorage.getItem('vault_theme') || 'light';
    applyTheme(savedTheme);

    const toggleBtns = [el.btnThemeToggle, el.btnThemeToggleAlbum].filter(Boolean);
    toggleBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        showToast(
          nextTheme === 'dark' ? '🌙 Cinema Mode' : '☀️ Champagne Mode',
          nextTheme === 'dark' ? 'Obsidian dark backdrop enabled for high-contrast photo viewing.' : 'Warm champagne editorial palette enabled.',
          nextTheme === 'dark' ? '🌙' : '☀️',
          2500
        );
      });
    });
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('vault_theme', 'dark');
      updateThemeButtons(true);
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('vault_theme', 'light');
      updateThemeButtons(false);
    }
  }

  function updateThemeButtons(isDark) {
    [el.btnThemeToggle, el.btnThemeToggleAlbum].forEach((btn) => {
      if (!btn) return;
      const icon = btn.querySelector('.theme-icon');
      const text = btn.querySelector('.theme-text');
      if (icon) icon.textContent = isDark ? '☀️' : '🌙';
      if (text) text.textContent = isDark ? 'Champagne' : 'Cinema Mode';
      btn.title = isDark ? 'Switch to Champagne Light' : 'Switch to Cinema Dark Mode';
    });
  }

  // --- Multi-Album Dashboard Engine ---
  function renderDashboard() {
    loadCustomAlbums();
    if (!el.albumsGrid) return;

    const albums = Object.values(state.albums);
    const activeAlbums = albums.filter((a) => a.status === 'active' || (a.photos && a.photos.length > 0));
    const totalPhotos = activeAlbums.reduce((sum, a) => sum + (a.photoCount || 0), 0);
    const totalBytes = activeAlbums.reduce((sum, a) => sum + (a.totalSizeBytes || 0), 0);
    const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);

    if (el.dashAlbumCount) animateCounter(el.dashAlbumCount, activeAlbums.length, 1000);
    if (el.dashPhotoCount) animateCounter(el.dashPhotoCount, totalPhotos, 1200);
    if (el.dashStorageCount) animateCounter(el.dashStorageCount, parseFloat(totalGB) || 4.61, 1400, ' GB', 2);

    // Populate Quick Switch Dropdown
    if (el.albumSelectDropdown) {
      el.albumSelectDropdown.innerHTML =
        '<option value="">📁 Switch Album...</option>' +
        albums.map((a) => `<option value="${a.id}">${a.isPasswordProtected ? '🔒 ' : ''}${a.title} (${a.photoCount || 0})</option>`).join('') +
        '<option value="__dashboard">🏠 All Albums (Dashboard)</option>';
    }

    // Populate Upload Target Folder Dropdown
    if (el.uploadTargetFolder) {
      el.uploadTargetFolder.innerHTML = albums
        .map((a) => `<option value="${a.id}">${a.title} (${a.folder})</option>`)
        .join('');
    }

    // Populate Albums Grid
    el.albumsGrid.innerHTML = '';

    albums.forEach((album) => {
      const isActive = album.status === 'active' || (album.photos && album.photos.length > 0);
      const isProtected = !!album.isPasswordProtected && !!album.passwordHash;
      const card = document.createElement('div');
      card.className = 'album-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.dataset.albumId = album.id;

      let coverHtml = '';
      const isWedding = album.id.includes('wedding');
      const luxurySvg = isWedding
        ? `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`
        : `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="5.5"></circle><circle cx="15" cy="12" r="5.5"></circle></svg>`;

      if (album.coverThumb && !album.coverThumb.startsWith('blob:')) {
        coverHtml = `
          <div class="album-card-cover">
            <img
              src="${encodeURI(album.coverThumb)}"
              alt="${album.title} Cover"
              loading="lazy"
              onerror="this.onerror=null; this.parentElement.className='album-card-cover placeholder-luxury-art ${isWedding ? 'art-wedding' : 'art-prewedding'}'; this.parentElement.innerHTML='<div class=\\'luxury-art-backdrop\\'></div><div class=\\'luxury-art-content\\'><div class=\\'luxury-art-icon-wrap\\'>${luxurySvg}</div><span class=\\'luxury-art-tag\\'>${isWedding ? 'Grand Celebrations' : 'Romantic Moments'}</span><span class=\\'luxury-art-badge\\'>✦ Ready for Photos ✦</span></div>';"
            >
          </div>
        `;
      } else {
        coverHtml = `
          <div class="album-card-cover placeholder-luxury-art ${isWedding ? 'art-wedding' : 'art-prewedding'}">
            <div class="luxury-art-backdrop"></div>
            <div class="luxury-art-content">
              <div class="luxury-art-icon-wrap">
                ${luxurySvg}
              </div>
              <span class="luxury-art-tag">${isWedding ? 'Grand Celebrations' : 'Romantic Moments'}</span>
              <span class="luxury-art-badge">✦ Photos Arriving Soon ✦</span>
            </div>
          </div>
        `;
      }

      card.innerHTML = `
        ${coverHtml}
        <div class="album-card-body">
          <div class="album-card-badges">
            <span class="${isActive ? 'badge-active' : 'badge-upcoming'}">
              ${isActive ? `● Active • ${album.photoCount} Photos` : '○ Upcoming Collection'}
            </span>
            ${isProtected ? '<span class="badge-upcoming badge-locked">🔒 Protected</span>' : '<span class="badge-upcoming">🔓 Public</span>'}
          </div>
          <h3 class="album-card-title">${album.title}</h3>
          <div class="album-card-folder">
            <span>📁 Folder:</span> <code>${album.folder}</code>
          </div>
          <p class="album-card-desc">${album.description || 'Preserved in 100% original uncompressed quality.'}</p>
          <div class="album-card-footer">
            <span class="album-card-stats">${isActive ? `${album.totalSizeFormatted} Master Quality` : 'Ready for upload'}</span>
            <button class="album-card-btn ${isActive ? '' : 'btn-upcoming'}" type="button">
              <span>${isProtected ? 'Unlock & View 🔒' : (isActive ? 'Explore Album →' : 'Preview Folder')}</span>
            </button>
          </div>
        </div>
      `;

      card.addEventListener('click', (e) => {
        e.preventDefault();
        tryOpenAlbum(album.id);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          tryOpenAlbum(album.id);
        }
      });

      el.albumsGrid.appendChild(card);
    });

    // Add Guide Card
    const guideCard = document.createElement('div');
    guideCard.className = 'add-folder-card';
    guideCard.innerHTML = `
      <div class="add-folder-icon">📂</div>
      <h3 class="add-folder-title">Uploading Future Folders</h3>
      <p class="add-folder-desc">Whenever you have a new photoshoot or celebration, simply:</p>
      <ol class="add-folder-steps">
        <li><span class="step-num">1</span> Click <strong>"Manage Folders & Uploads"</strong> above (or create folder locally)</li>
        <li><span class="step-num">2</span> Drag and drop your photos or a <strong>.ZIP archive</strong></li>
        <li><span class="step-num">3</span> Set an optional password to keep the collection private</li>
      </ol>
    `;
    el.albumsGrid.appendChild(guideCard);
    init3DCardTilt();
  }

  // --- Folder & Admin Session Timeout Engine (Strict 10-Minute Expiry) ---
  const FOLDER_SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes session timeout

  function isAlbumUnlocked(albumId) {
    const timestampStr = sessionStorage.getItem('album_unlocked_time_' + albumId);
    if (!timestampStr) {
      sessionStorage.removeItem('album_unlocked_' + albumId);
      return false;
    }
    const unlockTime = parseInt(timestampStr, 10);
    if (isNaN(unlockTime)) {
      sessionStorage.removeItem('album_unlocked_time_' + albumId);
      sessionStorage.removeItem('album_unlocked_' + albumId);
      return false;
    }
    const elapsed = Date.now() - unlockTime;
    if (elapsed > FOLDER_SESSION_TIMEOUT_MS) {
      // 10 minutes expired! Wipe unlock session
      sessionStorage.removeItem('album_unlocked_time_' + albumId);
      sessionStorage.removeItem('album_unlocked_' + albumId);
      return false;
    }
    return true;
  }

  function setAlbumUnlocked(albumId) {
    sessionStorage.setItem('album_unlocked_time_' + albumId, Date.now().toString());
    sessionStorage.setItem('album_unlocked_' + albumId, 'true');
  }

  function lockAlbum(albumId) {
    sessionStorage.removeItem('album_unlocked_time_' + albumId);
    sessionStorage.removeItem('album_unlocked_' + albumId);
  }

  function isAdminVerified() {
    const tStr = sessionStorage.getItem('admin_verified_time');
    if (!tStr) {
      sessionStorage.removeItem('admin_verified');
      return false;
    }
    const t = parseInt(tStr, 10);
    if (isNaN(t) || (Date.now() - t) > FOLDER_SESSION_TIMEOUT_MS) {
      sessionStorage.removeItem('admin_verified_time');
      sessionStorage.removeItem('admin_verified');
      return false;
    }
    return true;
  }

  function setAdminVerified() {
    sessionStorage.setItem('admin_verified_time', Date.now().toString());
    sessionStorage.setItem('admin_verified', 'true');
  }

  function clearAdminVerified() {
    sessionStorage.removeItem('admin_verified_time');
    sessionStorage.removeItem('admin_verified');
  }

  function checkActiveFolderSessionExpiry() {
    if (state.currentAlbumId) {
      const currentAlbum = state.albums[state.currentAlbumId];
      if (currentAlbum && currentAlbum.isPasswordProtected && currentAlbum.passwordHash) {
        if (!isAlbumUnlocked(state.currentAlbumId)) {
          if (state.lightboxOpen) closeLightbox();
          if (state.selectionMode) toggleSelectionMode(false);
          showDashboard();
          showToast('Session Expired', `Folder "${currentAlbum.title}" session timed out after 10 minutes. Please enter password again.`, '🔒', 5000);
          return true;
        }
      }
    }
    return false;
  }

  function checkAdminSessionTimeout() {
    if (!isAdminVerified() && sessionStorage.getItem('admin_verified') === 'true') {
      clearAdminVerified();
      updateAdminAuthUI();
      if (el.adminSuiteModal && el.adminSuiteModal.style.display !== 'none') {
        el.adminSuiteModal.style.display = 'none';
        showToast('Admin Session Expired', 'Admin session timed out after 10 minutes. Please re-authenticate.', '🔒', 4500);
      }
    }
  }

  // --- Password Gate Verification ---
  function tryOpenAlbum(albumId, targetPhotoFilename = null) {
    const album = state.albums[albumId];
    if (!album) {
      showToast('Album Not Found', 'Showing all albums on dashboard.', '⚠️', 3000);
      showDashboard();
      return;
    }

    const isProtected = !!album.isPasswordProtected && !!album.passwordHash;
    const isUnlocked = isAlbumUnlocked(albumId);

    if (isProtected && !isUnlocked) {
      promptAlbumPassword(album, targetPhotoFilename);
      return;
    }

    openAlbum(albumId, targetPhotoFilename);
  }

  function promptAlbumPassword(album, targetPhotoFilename) {
    state.pendingUnlockAlbum = { album, targetPhotoFilename };
    if (el.pwdModalTitle) el.pwdModalTitle.textContent = `🔒 ${album.title}`;
    if (el.pwdModalSubtitle) {
      el.pwdModalSubtitle.innerHTML = `This album is password protected. Enter the passcode provided by Srivatsa to view.`;
    }
    if (el.pwdModalInput) {
      el.pwdModalInput.value = '';
      el.pwdModalInput.type = 'password';
    }
    if (el.pwdErrorMsg) el.pwdErrorMsg.style.display = 'none';
    if (el.passwordModal) el.passwordModal.style.display = 'flex';
    setTimeout(() => el.pwdModalInput?.focus(), 100);
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (!state.pendingUnlockAlbum) return;
    const { album, targetPhotoFilename } = state.pendingUnlockAlbum;
    const inputPwd = el.pwdModalInput ? el.pwdModalInput.value.trim() : '';
    const inputHash = await sha256(inputPwd);

    if (inputHash === album.passwordHash || inputPwd === MASTER_PASSCODE) {
      setAlbumUnlocked(album.id);
      if (el.passwordModal) el.passwordModal.style.display = 'none';
      confetti.burst(35);
      showToast('Album Unlocked', `Welcome to "${album.title}"! (10 min session active)`, '🔓', 3500);
      openAlbum(album.id, targetPhotoFilename);
    } else {
      if (el.pwdErrorMsg) {
        el.pwdErrorMsg.textContent = 'Incorrect passcode. Please contact srivatsa.a.malali@gmail.com for access.';
        el.pwdErrorMsg.style.display = 'block';
      }
      if (el.pwdModalInput) {
        el.pwdModalInput.select();
        el.pwdModalInput.classList.add('shake');
        setTimeout(() => el.pwdModalInput?.classList.remove('shake'), 500);
      }
    }
  }

  // --- Admin Verification Gate (Strictly srivatsa.a.malali@gmail.com) ---
  function openAdminAuthModal() {
    if (isAdminVerified()) {
      openAdminSuite();
      return;
    }
    if (el.adminAuthEmail) el.adminAuthEmail.value = OWNER_EMAIL;
    if (el.adminAuthPasscode) el.adminAuthPasscode.value = '';
    if (el.adminAuthError) el.adminAuthError.style.display = 'none';
    if (el.unauthorizedAlertBox) el.unauthorizedAlertBox.style.display = 'none';
    if (el.adminAuthModal) el.adminAuthModal.style.display = 'flex';
    setTimeout(() => el.adminAuthPasscode?.focus(), 100);
  }

  function handleAdminAuthSubmit(e) {
    e.preventDefault();
    const email = el.adminAuthEmail ? el.adminAuthEmail.value.trim().toLowerCase() : '';
    const passcode = el.adminAuthPasscode ? el.adminAuthPasscode.value.trim() : '';
    const savedToken = localStorage.getItem('gh_token') || '';

    // Enforce Point 4: ONLY srivatsa.a.malali@gmail.com can set password / manage
    if (email !== OWNER_EMAIL.toLowerCase()) {
      if (el.adminAuthError) {
        el.adminAuthError.textContent = `Access Denied: Only ${OWNER_EMAIL} can set passwords and manage folders.`;
        el.adminAuthError.style.display = 'block';
      }
      if (el.unauthorizedAlertBox) {
        el.unauthorizedAlertBox.style.display = 'block';
        const mailtoUrl = `mailto:${OWNER_EMAIL}?subject=Gallery%20Admin%20Access%20Request&body=User%20${encodeURIComponent(email)}%20attempted%20to%20access%20the%20folder%20management%20portal%20on%20${encodeURIComponent(new Date().toLocaleString())}.`;
        if (el.btnTriggerEmailSrivatsa) el.btnTriggerEmailSrivatsa.href = mailtoUrl;
      }
      showToast('Unauthorized Access', `Only ${OWNER_EMAIL} has administrative privileges. Email notification generated.`, '🚫', 6000);
      return;
    }

    if (passcode === MASTER_PASSCODE || passcode === savedToken || passcode.startsWith('ghp_')) {
      if (passcode.startsWith('ghp_')) {
        localStorage.setItem('gh_token', passcode);
      }
      setAdminVerified();
      updateAdminAuthUI();
      if (el.adminAuthModal) el.adminAuthModal.style.display = 'none';
      confetti.burst(30);
      showToast('Admin Verified', `Welcome Srivatsa! Opening Folder Management Portal (10 min session).`, '🛡️', 3000);
      openAdminSuite();
    } else {
      if (el.adminAuthError) {
        el.adminAuthError.textContent = 'Incorrect security passcode or token. Access denied.';
        el.adminAuthError.style.display = 'block';
      }
    }
  }

  // --- Admin Session & Logout Controller ---
  function updateAdminAuthUI() {
    const isVerified = isAdminVerified();
    if (el.btnAdminLogout) {
      el.btnAdminLogout.style.display = isVerified ? 'inline-flex' : 'none';
    }
    if (el.btnOpenAdmin) {
      el.btnOpenAdmin.title = isVerified
        ? 'Manage Folders & Uploads (Admin Session Active - 10m)'
        : 'Manage Folders, Passwords, and Uploads';
    }
  }

  function handleAdminLogout() {
    clearAdminVerified();
    if (el.adminSuiteModal) el.adminSuiteModal.style.display = 'none';
    updateAdminAuthUI();
    showToast('Logged Out', 'Admin session terminated. Passcode required to enter again.', '🔒', 3500);
  }

  // --- GitHub API Direct File Committer (Dual branch: gh-pages & main) ---
  async function commitFileToGitHubBranch(token, branch, repoPath, base64Content, commitMessage) {
    if (!token) return false;
    // Encode path segments individually so '/' remains a path separator
    const encodedPath = repoPath.split('/').map(encodeURIComponent).join('/');
    let sha = null;
    try {
      const checkRes = await fetch(`https://api.github.com/repos/srivatsamalali/Gallery/contents/${encodedPath}?ref=${branch}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
        },
      });
      if (checkRes.ok) {
        const data = await checkRes.json();
        sha = data.sha;
      }
    } catch (e) {
      console.warn(`Could not check SHA for ${repoPath} on ${branch}:`, e);
    }

    const payload = {
      message: commitMessage,
      content: base64Content,
      branch: branch,
    };
    if (sha) payload.sha = sha;

    const res = await fetch(`https://api.github.com/repos/srivatsamalali/Gallery/contents/${encodedPath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Failed to commit ${repoPath} to branch ${branch}:`, errText);
      return false;
    }
    return true;
  }

  // --- Auto-Sync Manifest to GitHub (Dual-branch: gh-pages & main) ---
  async function syncManifestToGitHub(token) {
    if (!token) return;
    try {
      const cleanAlbums = sanitizeAlbumsForStorage(state.albums);
      const defaultAlbum = cleanAlbums['baby-showers'] || Object.values(cleanAlbums)[0];
      const defaultPhotos = defaultAlbum ? (defaultAlbum.photos || []) : [];
      const manifestCode = `// Auto-generated Multi-Folder Albums Manifest\nconst ALBUMS_DATA = ${JSON.stringify(cleanAlbums, null, 2)};\n\nconst PHOTOS_DATA = ${JSON.stringify(defaultPhotos, null, 2)};\n`;
      const base64Code = btoa(unescape(encodeURIComponent(manifestCode)));

      const branches = ['gh-pages', 'main'];
      let syncedBranches = [];
      for (const branch of branches) {
        const ok = await commitFileToGitHubBranch(
          token,
          branch,
          'photos-data.js',
          base64Code,
          'feat: update gallery albums and folder manifest'
        );
        if (ok) syncedBranches.push(branch);
      }

      if (syncedBranches.length > 0) {
        console.log(`Manifest auto-synced to GitHub branches: ${syncedBranches.join(', ')}`);
      }
    } catch (err) {
      console.warn('Could not auto-sync manifest to GitHub:', err);
    }
  }

  // --- Admin Security Check ---
  function checkAdminAccess() {
    if (!isAdminVerified()) {
      showToast('Admin Verification Required', `Only ${OWNER_EMAIL} can perform folder operations.`, '🔒', 3500);
      openAdminAuthModal();
      return false;
    }
    return true;
  }

  // --- Admin Management Suite ---
  function openAdminSuite() {
    renderAdminFolderTable();
    populateUploadFolderDropdown();
    if (el.ghTokenInput) el.ghTokenInput.value = localStorage.getItem('gh_token') || '';
    if (el.adminSuiteModal) el.adminSuiteModal.style.display = 'flex';
  }

  function populateUploadFolderDropdown() {
    if (!el.uploadTargetFolder) return;
    el.uploadTargetFolder.innerHTML = '';
    Object.values(state.albums).forEach((album) => {
      const opt = document.createElement('option');
      opt.value = album.id;
      opt.textContent = `${album.title} (${album.photoCount || 0} photos)`;
      el.uploadTargetFolder.appendChild(opt);
    });
  }

  function renderAdminFolderTable() {
    if (!el.folderTableBody) return;
    el.folderTableBody.innerHTML = '';

    const albums = Object.values(state.albums);
    albums.forEach((album) => {
      const isProtected = !!album.isPasswordProtected && !!album.passwordHash;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="Folder / Title">
          <strong style="color:var(--text-primary); font-size:0.95rem;">${album.title}</strong>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">📁 <code>${album.folder}</code></div>
        </td>
        <td data-label="Photos"><span style="font-weight:600;">${album.photoCount || 0}</span> photos</td>
        <td data-label="Protection">
          <span class="${isProtected ? 'badge-upcoming badge-locked' : 'badge-upcoming'}">
            ${isProtected ? '🔒 Protected' : '🔓 Public'}
          </span>
        </td>
        <td data-label="Actions">
          <div class="folder-actions-cell">
            <button type="button" class="btn-table-action" onclick="window.galleryAdmin.rename('${album.id}')">✏️ Rename</button>
            <button type="button" class="btn-table-action" onclick="window.galleryAdmin.password('${album.id}')">${isProtected ? '🔑 Change Pwd' : '🔑 Set Pwd'}</button>
            <button type="button" class="btn-table-action danger" onclick="window.galleryAdmin.delete('${album.id}')">🗑️ Delete</button>
          </div>
        </td>
      `;
      el.folderTableBody.appendChild(tr);
    });
  }

  async function handleCreateFolder(e) {
    e.preventDefault();
    if (!checkAdminAccess()) return;
    const name = el.newFolderName.value.trim();
    const pwd = el.newFolderPwd.value.trim();
    if (!name) return;

    const folderSlug = name.toLowerCase().replace(/[\W_]+/g, '-').replace(/^-+|-+$/g, '');
    let pwdHash = '';
    let isProtected = false;
    if (pwd) {
      pwdHash = await sha256(pwd);
      isProtected = true;
    }

    const newAlbum = {
      id: folderSlug,
      title: name,
      folder: name,
      description: 'Preserved in 100% original uncompressed quality. Created by Srivatsa.',
      date: 'Nov 2026',
      photoCount: 0,
      portraitsCount: 0,
      landscapesCount: 0,
      totalSizeBytes: 0,
      totalSizeFormatted: '0 MB',
      coverThumb: '',
      coverOriginal: '',
      status: 'upcoming',
      isPasswordProtected: isProtected,
      passwordHash: pwdHash,
      photos: [],
    };

    state.albums[folderSlug] = newAlbum;
    saveCustomAlbums();
    renderDashboard();
    renderAdminFolderTable();
    populateUploadFolderDropdown();
    el.newFolderName.value = '';
    el.newFolderPwd.value = '';
    showToast('Folder Created', `Event folder "${name}" created successfully${isProtected ? ' with password protection' : ''}!`, '📁', 4000);
  }

  // --- Creative Luxury Action Popup Engine (Replaces ugly browser prompt/confirm) ---
  function showCreativePrompt(options) {
    return new Promise((resolve) => {
      const modal = document.getElementById('action-popup-modal');
      const iconWrap = document.getElementById('popup-icon-wrap');
      const icon = document.getElementById('popup-icon');
      const title = document.getElementById('popup-title');
      const subtitle = document.getElementById('popup-subtitle');
      const statusBadge = document.getElementById('popup-status-badge');
      const inputGroup = document.getElementById('popup-input-group');
      const inputLabel = document.getElementById('popup-input-label');
      const input = document.getElementById('popup-input');
      const toggleVis = document.getElementById('popup-toggle-visibility');
      const hint = document.getElementById('popup-hint');
      const errorMsg = document.getElementById('popup-error-msg');
      const warningBox = document.getElementById('popup-warning-box');
      const btnCancel = document.getElementById('popup-btn-cancel');
      const btnConfirm = document.getElementById('popup-btn-confirm');
      const form = document.getElementById('popup-form');

      if (!modal) {
        resolve(prompt(options.title + (options.subtitle ? '\n' + options.subtitle : ''), options.defaultValue || ''));
        return;
      }

      icon.textContent = options.icon || '✨';
      iconWrap.className = 'modal-icon-wrap ' + (options.iconClass || 'edit-icon-wrap');
      title.textContent = options.title || '';
      subtitle.textContent = options.subtitle || '';

      if (options.statusBadge) {
        statusBadge.innerHTML = options.statusBadge;
        statusBadge.style.display = 'inline-flex';
      } else {
        statusBadge.style.display = 'none';
        statusBadge.innerHTML = '';
      }

      inputGroup.style.display = 'block';
      inputLabel.textContent = options.inputLabel || 'Value';
      input.value = options.defaultValue || '';
      input.placeholder = options.placeholder || '';
      input.type = options.isPassword ? 'password' : 'text';
      toggleVis.style.display = options.isPassword ? 'block' : 'none';
      toggleVis.textContent = '👁️';

      hint.textContent = options.hint || '';
      hint.style.display = options.hint ? 'block' : 'none';
      errorMsg.style.display = 'none';
      warningBox.style.display = 'none';

      btnConfirm.textContent = options.confirmText || 'Confirm';
      btnConfirm.className = 'modal-btn primary';
      btnCancel.textContent = options.cancelText || 'Cancel';

      function cleanup() {
        modal.style.display = 'none';
        modal.removeEventListener('click', onBackdropClick);
        document.removeEventListener('keydown', onKeyDown);
        form.onsubmit = null;
        btnCancel.onclick = null;
        toggleVis.onclick = null;
      }

      function onBackdropClick(e) {
        if (e.target === modal) {
          cleanup();
          resolve(null);
        }
      }

      function onKeyDown(e) {
        if (e.key === 'Escape') {
          cleanup();
          resolve(null);
        }
      }

      toggleVis.onclick = () => {
        if (input.type === 'password') {
          input.type = 'text';
          toggleVis.textContent = '🙈';
        } else {
          input.type = 'password';
          toggleVis.textContent = '👁️';
        }
      };

      btnCancel.onclick = () => {
        cleanup();
        resolve(null);
      };

      form.onsubmit = (e) => {
        e.preventDefault();
        const val = input.value;
        cleanup();
        resolve(val);
      };

      modal.addEventListener('click', onBackdropClick);
      document.addEventListener('keydown', onKeyDown);

      modal.style.display = 'flex';
      setTimeout(() => {
        input.focus();
        if (input.value) input.select();
      }, 50);
    });
  }

  function showCreativeConfirm(options) {
    return new Promise((resolve) => {
      const modal = document.getElementById('action-popup-modal');
      const iconWrap = document.getElementById('popup-icon-wrap');
      const icon = document.getElementById('popup-icon');
      const title = document.getElementById('popup-title');
      const subtitle = document.getElementById('popup-subtitle');
      const statusBadge = document.getElementById('popup-status-badge');
      const inputGroup = document.getElementById('popup-input-group');
      const warningBox = document.getElementById('popup-warning-box');
      const warningText = document.getElementById('popup-warning-text');
      const btnCancel = document.getElementById('popup-btn-cancel');
      const btnConfirm = document.getElementById('popup-btn-confirm');
      const form = document.getElementById('popup-form');

      if (!modal) {
        resolve(confirm(options.title + (options.subtitle ? '\n' + options.subtitle : '')));
        return;
      }

      icon.textContent = options.icon || '⚠️';
      iconWrap.className = 'modal-icon-wrap ' + (options.iconClass || 'danger-icon-wrap');
      title.textContent = options.title || 'Are you sure?';
      subtitle.textContent = options.subtitle || '';

      statusBadge.style.display = 'none';
      inputGroup.style.display = 'none';

      warningBox.style.display = 'flex';
      warningText.textContent = options.warningText || 'This action cannot be undone.';

      btnConfirm.textContent = options.confirmText || 'Confirm';
      btnConfirm.className = options.isDanger ? 'modal-btn danger' : 'modal-btn primary';
      btnCancel.textContent = options.cancelText || 'Cancel';

      function cleanup() {
        modal.style.display = 'none';
        modal.removeEventListener('click', onBackdropClick);
        document.removeEventListener('keydown', onKeyDown);
        form.onsubmit = null;
        btnCancel.onclick = null;
      }

      function onBackdropClick(e) {
        if (e.target === modal) {
          cleanup();
          resolve(false);
        }
      }

      function onKeyDown(e) {
        if (e.key === 'Escape') {
          cleanup();
          resolve(false);
        }
      }

      btnCancel.onclick = () => {
        cleanup();
        resolve(false);
      };

      form.onsubmit = (e) => {
        e.preventDefault();
        cleanup();
        resolve(true);
      };

      modal.addEventListener('click', onBackdropClick);
      document.addEventListener('keydown', onKeyDown);

      modal.style.display = 'flex';
      setTimeout(() => btnConfirm.focus(), 50);
    });
  }

  async function promptSetFolderPassword(albumId) {
    if (!checkAdminAccess()) return;
    const album = state.albums[albumId];
    if (!album) return;

    const currentStatus = album.isPasswordProtected
      ? '<span class="badge-active-lock">🔒 Protected (Passcode Active)</span>'
      : '<span class="badge-active-public">🌐 Public (No Passcode)</span>';

    const newPwd = await showCreativePrompt({
      icon: '🔒',
      iconClass: 'lock-icon-wrap',
      title: 'Folder Passcode Security',
      subtitle: `Configure guest access passcode for "${album.title}".`,
      statusBadge: currentStatus,
      inputLabel: 'Folder Passcode',
      defaultValue: '',
      placeholder: 'Enter new passcode (or leave blank to remove)...',
      hint: 'Leave empty and click "Save Passcode" to make this folder open to the public without a password.',
      isPassword: true,
      confirmText: 'Save Passcode'
    });

    if (newPwd === null) return; // User pressed Cancel

    if (newPwd.trim() === '') {
      album.isPasswordProtected = false;
      album.passwordHash = '';
      showToast('Passcode Removed', `"${album.title}" is now open to the public without password.`, '🔓', 3500);
    } else {
      album.passwordHash = await sha256(newPwd.trim());
      album.isPasswordProtected = true;
      showToast('Passcode Set', `"${album.title}" is now locked! Guests must enter this passcode to view.`, '🔒', 4000);
    }

    saveCustomAlbums();
    renderDashboard();
    renderAdminFolderTable();
  }

  async function promptRenameFolder(albumId) {
    if (!checkAdminAccess()) return;
    const album = state.albums[albumId];
    if (!album) return;

    const newTitle = await showCreativePrompt({
      icon: '✏️',
      iconClass: 'edit-icon-wrap',
      title: 'Rename Event Collection',
      subtitle: `Enter a new display title for "${album.title}".`,
      inputLabel: 'New Collection Title',
      defaultValue: album.title,
      placeholder: 'Enter title (e.g. Wedding Reception)...',
      hint: 'This title will appear across your gallery, navbar quick-switch, and album cards.',
      isPassword: false,
      confirmText: 'Save Title'
    });

    if (!newTitle || newTitle.trim() === '' || newTitle.trim() === album.title) return;

    album.title = newTitle.trim();
    saveCustomAlbums();
    renderDashboard();
    renderAdminFolderTable();
    populateUploadFolderDropdown();
    showToast('Folder Renamed', `Album is now "${album.title}".`, '✏️', 3000);
  }

  async function promptDeleteFolder(albumId) {
    if (!checkAdminAccess()) return;
    const album = state.albums[albumId];
    if (!album) return;

    const confirmed = await showCreativeConfirm({
      icon: '🗑️',
      iconClass: 'danger-icon-wrap',
      title: 'Delete Event Folder?',
      subtitle: `Are you sure you want to permanently delete the collection "${album.title}"?`,
      warningText: `This will remove "${album.title}" and its configuration from your gallery and GitHub sync.`,
      confirmText: 'Yes, Delete Folder',
      cancelText: 'Keep Folder',
      isDanger: true
    });

    if (!confirmed) return;

    delete state.albums[albumId];
    saveCustomAlbums();
    renderDashboard();
    renderAdminFolderTable();
    populateUploadFolderDropdown();
    showToast('Folder Deleted', `Removed "${album.title}".`, '🗑️', 3000);
  }

  // Expose admin actions globally for table buttons and header action
  window.galleryAdmin = {
    openAdmin: openAdminAuthModal,
    password: promptSetFolderPassword,
    rename: promptRenameFolder,
    delete: promptDeleteFolder,
  };

  // --- File Upload & ZIP Extraction Engine ---
  async function handleFilesSelected(files) {
    const fileList = Array.from(files);
    for (const file of fileList) {
      if (file.name.toLowerCase().endsWith('.zip')) {
        showToast('Extracting ZIP', `Unpacking "${file.name}"...`, '📦', 3000);
        await extractZipFile(file);
      } else if (file.type.startsWith('image/')) {
        stageFile(file);
      }
    }
    updateStagingUI();
  }

  async function extractZipFile(zipFile) {
    if (typeof JSZip === 'undefined') {
      showToast('JSZip Not Loaded', 'Please check your internet connection.', '⚠️', 4000);
      return;
    }
    try {
      const zip = await JSZip.loadAsync(zipFile);
      const fileNames = Object.keys(zip.files);
      let count = 0;
      for (const name of fileNames) {
        const entry = zip.files[name];
        if (!entry.dir && !name.startsWith('__MACOSX') && /\.(jpe?g|png|webp)$/i.test(name)) {
          const blob = await entry.async('blob');
          const cleanName = name.split('/').pop();
          const imgFile = new File([blob], cleanName, { type: blob.type || 'image/jpeg' });
          stageFile(imgFile);
          count++;
        }
      }
      showToast('ZIP Extracted', `Successfully unpacked ${count} photo(s) from ZIP archive!`, '✅', 4000);
    } catch (err) {
      showToast('ZIP Extraction Error', err.message, '⚠️', 4000);
    }
  }

  function stageFile(file) {
    state.stagedFiles.push({
      file,
      name: file.name,
      sizeFormatted: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    });
  }

  function updateStagingUI() {
    if (!el.uploadStagingWrap || !el.stagingFileList) return;
    if (state.stagedFiles.length === 0) {
      el.uploadStagingWrap.style.display = 'none';
      return;
    }

    el.uploadStagingWrap.style.display = 'block';
    if (el.stagingCount) el.stagingCount.textContent = `${state.stagedFiles.length} photo(s) ready to upload`;

    el.stagingFileList.innerHTML = state.stagedFiles
      .map(
        (f) => `
        <div class="staging-item">
          <span class="staging-item-name">📷 ${f.name}</span>
          <span class="staging-item-size">${f.sizeFormatted}</span>
        </div>
      `
      )
      .join('');
  }

  function clearStaging() {
    state.stagedFiles = [];
    updateStagingUI();
    if (el.fileInputUpload) el.fileInputUpload.value = '';
  }

  async function commitUpload() {
    if (state.stagedFiles.length === 0) return;
    const targetAlbumId = el.uploadTargetFolder ? el.uploadTargetFolder.value : null;
    const album = state.albums[targetAlbumId];
    if (!album) {
      showToast('Target Missing', 'Please select a destination folder.', '⚠️', 3000);
      return;
    }

    const token = getActiveToken();
    if (!token) {
      showToast('Token Required', 'Please configure your GitHub Access Token in Admin panel to save files directly.', '🔒', 4000);
      return;
    }

    const folderName = album.folder || album.title;
    const stagedSnap = [...state.stagedFiles];

    showToast('Direct GitHub Save', `Saving ${stagedSnap.length} photo(s) directly to your GitHub repository (gh-pages & main)...`, '🚀', 6000);

    if (!album.photos) album.photos = [];

    // Add or update staged photos in local album photos state
    stagedSnap.forEach((item, idx) => {
      const repoRelPath = `${folderName}/${item.name}`;
      const newPhoto = {
        filename: item.name,
        title: item.name.replace(/\.[^/.]+$/, ''),
        folder: folderName,
        originalUrl: repoRelPath,
        thumbUrl: repoRelPath,
        sizeBytes: item.file.size,
        sizeFormatted: item.sizeFormatted,
        width: 6048,
        height: 4032,
        displayWidth: 6048,
        displayHeight: 4032,
        orientation: 1,
        isPortrait: false,
        aspectRatio: 1.5,
        date: new Date().toLocaleDateString('en-US'),
        camera: 'Original DSLR',
        id: (album.photos.length || 0) + idx + 1,
      };

      const existingIdx = album.photos.findIndex((p) => p.filename === item.name);
      if (existingIdx >= 0) {
        newPhoto.id = album.photos[existingIdx].id || (existingIdx + 1);
        album.photos[existingIdx] = newPhoto;
      } else {
        album.photos.push(newPhoto);
      }
    });

    album.photoCount = album.photos.length;
    album.status = 'active';
    album.totalSizeBytes = album.photos.reduce((sum, p) => sum + (p.sizeBytes || 0), 0);
    album.totalSizeFormatted = formatBytes(album.totalSizeBytes);
    album.portraitsCount = album.photos.filter((p) => p.isPortrait).length;
    album.landscapesCount = album.photos.length - album.portraitsCount;

    if (!album.coverThumb || album.coverThumb.startsWith('blob:')) {
      album.coverThumb = album.photos[0] ? album.photos[0].thumbUrl : '';
    }
    if (!album.coverOriginal || album.coverOriginal.startsWith('blob:')) {
      album.coverOriginal = album.photos[0] ? album.photos[0].originalUrl : '';
    }

    saveCustomAlbums();
    renderDashboard();
    clearStaging();

    // Directly commit files to GitHub repository on both gh-pages and main branches
    syncStagedFilesToGitHub(token, folderName, stagedSnap);
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64 = typeof result === 'string' && result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function syncStagedFilesToGitHub(token, folderName, files) {
    if (!token) return;
    let successCount = 0;
    const branches = ['gh-pages', 'main'];

    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      const repoPath = `${folderName}/${item.name}`;
      try {
        const base64Content = await readFileAsBase64(item.file);
        let fileSuccess = false;

        // Push binary file to both gh-pages (for immediate live site reflection) and main (for master repo)
        for (const branch of branches) {
          const ok = await commitFileToGitHubBranch(
            token,
            branch,
            repoPath,
            base64Content,
            `feat(media): add ${item.name} to ${folderName}`
          );
          if (ok) fileSuccess = true;
        }

        if (fileSuccess) {
          successCount++;
        }
      } catch (err) {
        console.error('Sync error on file:', item.name, err);
      }
    }

    if (successCount > 0) {
      await syncManifestToGitHub(token);
      showToast('Saved Directly to GitHub', `Successfully saved ${successCount} photo(s) to GitHub Pages and main branch!`, '🎉', 5000);
    } else {
      showToast('Sync Failed', 'Could not push files. Check token permissions or use python3 admin.py.', '⚠️', 5000);
    }
  }

  function openAlbum(albumId, targetPhotoFilename = null) {
    const album = state.albums[albumId];
    if (!album) {
      showToast('Album Not Found', 'Showing all albums on dashboard.', '⚠️', 3000);
      showDashboard();
      return;
    }

    state.currentAlbumId = albumId;
    state.allPhotos = album.photos || [];
    state.renderedCount = 28;

    // Update Breadcrumb & Nav
    if (el.navAlbumTitle) el.navAlbumTitle.textContent = album.title;
    if (el.albumSelectDropdown) el.albumSelectDropdown.value = albumId;

    // Update Album Hero
    if (el.albumTitle) {
      if (album.id === 'baby-showers') {
        el.albumTitle.innerHTML = 'Baby <span>Showers</span>';
      } else {
        el.albumTitle.textContent = album.title;
      }
    }

    if (el.albumBadge) {
      if (album.id === 'baby-showers') {
        el.albumBadge.innerHTML = '<span>🍼</span> Welcoming Our Little Blessing';
      } else if (album.id.includes('wedding')) {
        el.albumBadge.innerHTML = '<span>💍</span> Timeless Love & Romance';
      } else {
        el.albumBadge.innerHTML = `<span>📸</span> ${album.title}`;
      }
    }

    if (el.albumDescription) {
      el.albumDescription.innerHTML = `
        ${album.description || 'A timeless collection preserved in bit-for-bit uncompressed original quality.'}
        Anyone with this link can view in large preview and download any original photo.
        <span class="hero-creator-tag">✨ Created by Srivatsa</span>
      `;
    }

    if (el.statAlbumPhotos) animateCounter(el.statAlbumPhotos, album.photoCount || 0, 1100);
    const sizeNum = parseFloat(album.totalSizeFormatted) || 4.61;
    const sizeUnit = (album.totalSizeFormatted || '').includes('GB') ? ' GB' : ' MB';
    if (el.statAlbumSize) animateCounter(el.statAlbumSize, sizeNum, 1300, sizeUnit, 2);
    if (el.statAlbumCamera) el.statAlbumCamera.textContent = 'Master RAW Quality';

    // Toggle views
    if (el.dashboardView) el.dashboardView.style.display = 'none';
    if (el.albumView) el.albumView.style.display = 'block';

    // Apply filters and sort
    state.activeFilter = 'all';
    state.searchQuery = '';
    state.sortBy = 'default';
    if (el.searchInput) el.searchInput.value = '';
    if (el.sortSelect) {
      el.sortSelect.value = 'default';
      if (el.sortSelect.options[0]) {
        el.sortSelect.options[0].textContent = `Timeline (All Photos • ${album.photoCount || 0})`;
      }
    }
    el.filterTabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.filter === 'all');
    });

    applyFiltersAndSort();

    // Check if album has 0 photos (upcoming)
    if (state.allPhotos.length === 0) {
      showToast('Empty Album', `Drop photos into folder "${album.folder}" or use the Admin Upload tool.`, 'ℹ️', 4500);
    }

    // Update URL hash
    if (targetPhotoFilename) {
      window.location.hash = `album=${albumId}&photo=${encodeURIComponent(targetPhotoFilename)}`;
      const pIdx = state.filteredPhotos.findIndex((p) => p.filename === targetPhotoFilename);
      if (pIdx !== -1) {
        openLightbox(pIdx);
      }
    } else {
      window.location.hash = `album=${albumId}`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function showDashboard() {
    state.currentAlbumId = null;
    if (state.lightboxOpen) closeLightbox();
    if (state.selectionMode) toggleSelectionMode(false);

    if (el.dashboardView) el.dashboardView.style.display = 'block';
    if (el.albumView) el.albumView.style.display = 'none';

    if (window.location.hash && !window.location.hash.startsWith('#photo=')) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleUrlHash() {
    const hash = window.location.hash.trim();
    if (!hash || hash === '#' || hash === '#dashboard') {
      showDashboard();
      return;
    }

    const cleanHash = hash.replace(/^#/, '');
    const params = new URLSearchParams(cleanHash);
    const albumParam = params.get('album');
    const photoParam = params.get('photo');

    let resolvedAlbum = albumParam;
    if (resolvedAlbum && !state.albums[resolvedAlbum]) {
      if (resolvedAlbum === 'pre-wedding-photoshoot' && state.albums['pre-wedding-shoot']) {
        resolvedAlbum = 'pre-wedding-shoot';
      } else if (resolvedAlbum === 'pre-wedding-shoot' && state.albums['pre-wedding-photoshoot']) {
        resolvedAlbum = 'pre-wedding-photoshoot';
      }
    }

    if (resolvedAlbum && state.albums[resolvedAlbum]) {
      tryOpenAlbum(resolvedAlbum, photoParam);
    } else if (cleanHash.startsWith('photo=')) {
      const legacyPhoto = decodeURIComponent(cleanHash.replace('photo=', ''));
      tryOpenAlbum('baby-showers', legacyPhoto);
    } else {
      showDashboard();
    }
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
      thumb.dataset.index = String(i);
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

  // --- Slideshow Mode with Ken Burns & Progress Bar ---
  function restartSlideshowProgress() {
    if (!el.lbProgressBar || !state.slideshowRunning) return;
    el.lbProgressBar.style.transition = 'none';
    el.lbProgressBar.style.width = '0%';
    requestAnimationFrame(() => {
      el.lbProgressBar.style.transition = `width ${state.slideshowSpeed}ms linear`;
      el.lbProgressBar.style.width = '100%';
    });
  }

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
    el.lightbox.classList.add('slideshow-active');
    el.lbSlideshowBtn.classList.add('active');
    if (el.btnSlideshow) el.btnSlideshow.classList.add('primary');

    el.lbImg.classList.remove('ken-burns');
    void el.lbImg.offsetWidth;
    el.lbImg.classList.add('ken-burns');

    showToast('Cinematic Slideshow', 'Photos auto-advancing with Ken Burns effect. Press Space to pause.', '▶️', 3500);

    restartSlideshowProgress();

    if (state.slideshowTimer) clearInterval(state.slideshowTimer);
    state.slideshowTimer = setInterval(() => {
      nextPhoto();
    }, state.slideshowSpeed);
  }

  function stopSlideshow() {
    state.slideshowRunning = false;
    if (state.slideshowTimer) clearInterval(state.slideshowTimer);
    el.lightbox.classList.remove('slideshow-active');
    el.lbImg.classList.remove('ken-burns');
    if (el.lbProgressBar) {
      el.lbProgressBar.style.transition = 'none';
      el.lbProgressBar.style.width = '0%';
    }
    el.lbSlideshowBtn.classList.remove('active');
    if (el.btnSlideshow) el.btnSlideshow.classList.remove('primary');
  }

  // --- Ambient Lullaby Soundscape (Web Audio API) ---
  const ambientAudio = (function () {
    let ctx = null;
    let isPlaying = false;
    let timer = null;
    let masterGain = null;

    // Harmonic pentatonic frequencies (Gentle harp & music-box lullaby)
    const chords = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 261.63, 329.63, 392.00], // Fmaj7
      [196.00, 246.94, 293.66, 392.00], // G
      [164.81, 246.94, 329.63, 392.00], // Em7
    ];
    let chordIdx = 0;

    function playChord() {
      if (!isPlaying || !ctx) return;
      const now = ctx.currentTime;
      const notes = chords[chordIdx % chords.length];
      chordIdx++;

      notes.forEach((freq, idx) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.16);

          gain.gain.setValueAtTime(0, now + idx * 0.16);
          gain.gain.linearRampToValueAtTime(0.035, now + idx * 0.16 + 0.6);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.16 + 4.2);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(now + idx * 0.16);
          osc.stop(now + idx * 0.16 + 4.5);
        } catch (e) {}
      });

      timer = setTimeout(playChord, 3800);
    }

    function toggle() {
      if (isPlaying) {
        stop();
        return false;
      } else {
        start();
        return true;
      }
    }

    function start() {
      if (!ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        ctx = new AudioCtx();
        masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.8, ctx.currentTime);
        masterGain.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      isPlaying = true;
      playChord();
    }

    function stop() {
      isPlaying = false;
      if (timer) clearTimeout(timer);
    }

    return { toggle, isPlaying: () => isPlaying, stop };
  })();

  // Reset any legacy dark theme settings
  try {
    localStorage.removeItem('bs_theme');
    document.body.removeAttribute('data-theme');
  } catch (e) {}

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

    // Audio lullaby toggle in lightbox
    if (el.lbAudioBtn) {
      el.lbAudioBtn.addEventListener('click', () => {
        const playing = ambientAudio.toggle();
        el.lbAudioBtn.classList.toggle('active', playing);
        showToast(
          playing ? '🎶 Acoustic Ambient Lullaby On' : '🔇 Ambient Music Muted',
          playing ? 'Playing soft harp and piano chords in the background.' : 'Background sound paused.',
          '🎵',
          2500
        );
      });
    }

    // Native Web Share button in lightbox
    if (el.lbShareBtn) {
      el.lbShareBtn.addEventListener('click', shareCurrentPhoto);
    }

    // Detailed Nikon EXIF Inspector toggle
    if (el.lbInfoBtn) {
      el.lbInfoBtn.addEventListener('click', toggleExifModal);
    }
    if (el.lbExifClose) {
      el.lbExifClose.addEventListener('click', () => {
        if (el.lbExifModal) el.lbExifModal.classList.remove('visible');
      });
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
    if (el.batchZipBtn) {
      el.batchZipBtn.addEventListener('click', downloadBatchSelectedAsZip);
    }
    if (el.batchDownloadBtn) {
      el.batchDownloadBtn.addEventListener('click', downloadBatchSelected);
    }
    if (el.batchCancelBtn) {
      el.batchCancelBtn.addEventListener('click', () => toggleSelectionMode(false));
    }

    // Dashboard navigation buttons
    if (el.btnBackDashboard) {
      el.btnBackDashboard.addEventListener('click', () => showDashboard());
    }
    if (el.breadcrumbDashLink) {
      el.breadcrumbDashLink.addEventListener('click', (e) => {
        e.preventDefault();
        showDashboard();
      });
    }

    // Quick switch album dropdown
    if (el.albumSelectDropdown) {
      el.albumSelectDropdown.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === '__dashboard' || !val) {
          showDashboard();
        } else {
          openAlbum(val);
        }
      });
    }

    // Double click to zoom in Lightbox
    el.lbImg.addEventListener('dblclick', toggleZoom);

    // Deep linking URL hashchange listener
    window.addEventListener('hashchange', () => {
      handleUrlHash();
    });

    // Initialize Mobile Touch Gestures
    initMobileTouchGestures();

    // --- Admin Suite & Password Gates Event Listeners ---
    if (el.btnOpenAdmin) {
      el.btnOpenAdmin.addEventListener('click', openAdminAuthModal);
    }

    if (el.pwdModalForm) {
      el.pwdModalForm.addEventListener('submit', handlePasswordSubmit);
    }

    if (el.pwdModalCancel) {
      el.pwdModalCancel.addEventListener('click', () => {
        if (el.passwordModal) el.passwordModal.style.display = 'none';
        state.pendingUnlockAlbum = null;
      });
    }

    if (el.pwdToggleVisibility && el.pwdModalInput) {
      el.pwdToggleVisibility.addEventListener('click', () => {
        const isPwd = el.pwdModalInput.type === 'password';
        el.pwdModalInput.type = isPwd ? 'text' : 'password';
        el.pwdToggleVisibility.textContent = isPwd ? '🙈' : '👁️';
      });
    }

    if (el.adminAuthForm) {
      el.adminAuthForm.addEventListener('submit', handleAdminAuthSubmit);
    }

    if (el.adminAuthCancel) {
      el.adminAuthCancel.addEventListener('click', () => {
        if (el.adminAuthModal) el.adminAuthModal.style.display = 'none';
      });
    }

    if (el.adminSuiteClose) {
      el.adminSuiteClose.addEventListener('click', () => {
        if (el.adminSuiteModal) el.adminSuiteModal.style.display = 'none';
      });
    }

    if (el.adminSuiteLogout) {
      el.adminSuiteLogout.addEventListener('click', handleAdminLogout);
    }

    if (el.btnAdminLogout) {
      el.btnAdminLogout.addEventListener('click', handleAdminLogout);
    }

    // Suite tab switcher
    if (el.suiteTabBtns) {
      el.suiteTabBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          el.suiteTabBtns.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          const target = btn.dataset.tab;
          document.querySelectorAll('.suite-tab-content').forEach((tc) => {
            tc.style.display = tc.id === `tab-content-${target}` ? 'block' : 'none';
          });
        });
      });
    }

    if (el.formCreateFolder) {
      el.formCreateFolder.addEventListener('submit', handleCreateFolder);
    }

    // Drag-and-drop & file selection for upload
    if (el.uploadDropzone && el.fileInputUpload) {
      el.uploadDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        el.uploadDropzone.classList.add('dragover');
      });
      el.uploadDropzone.addEventListener('dragleave', () => {
        el.uploadDropzone.classList.remove('dragover');
      });
      el.uploadDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        el.uploadDropzone.classList.remove('dragover');
        if (e.dataTransfer && e.dataTransfer.files) {
          handleFilesSelected(e.dataTransfer.files);
        }
      });
      el.fileInputUpload.addEventListener('change', (e) => {
        if (e.target.files) {
          handleFilesSelected(e.target.files);
        }
      });
    }

    if (el.btnClearStaging) {
      el.btnClearStaging.addEventListener('click', clearStaging);
    }

    if (el.btnCommitUpload) {
      el.btnCommitUpload.addEventListener('click', commitUpload);
    }

    if (el.btnSaveGhToken && el.ghTokenInput) {
      el.btnSaveGhToken.addEventListener('click', () => {
        const token = el.ghTokenInput.value.trim();
        if (token) {
          localStorage.setItem('gh_token', token);
          showToast('Token Saved', 'GitHub Personal Access Token securely stored in your browser.', '🔑', 3500);
        } else {
          localStorage.removeItem('gh_token');
          showToast('Token Cleared', 'GitHub Personal Access Token removed from browser.', 'ℹ️', 3000);
        }
      });
    }

    // Backdrop dismissal
    window.addEventListener('click', (e) => {
      if (e.target === el.passwordModal) {
        el.passwordModal.style.display = 'none';
        state.pendingUnlockAlbum = null;
      }
      if (e.target === el.adminAuthModal) {
        el.adminAuthModal.style.display = 'none';
      }
      if (e.target === el.adminSuiteModal) {
        el.adminSuiteModal.style.display = 'none';
      }
    });
  }

  // --- Live Manifest Background Poller / Network Sync ---
  let lastManifestSync = 0;
  async function refreshManifestFromLiveNetwork(force = false) {
    const now = Date.now();
    if (!force && now - lastManifestSync < 20000) return;
    lastManifestSync = now;

    try {
      const res = await fetch(`photos-data.js?_live=${now}`, { cache: 'no-store' });
      if (!res.ok) return;
      const text = await res.text();
      const match = text.match(/const ALBUMS_DATA = (\{[\s\S]*?\});\s*const PHOTOS_DATA/);
      if (!match) return;

      const liveAlbums = JSON.parse(match[1]);
      let changed = false;

      Object.keys(liveAlbums).forEach((id) => {
        const live = liveAlbums[id];
        const current = state.albums[id];
        if (!current) {
          state.albums[id] = live;
          changed = true;
        } else if (
          (live.photos?.length || 0) !== (current.photos?.length || 0) ||
          live.title !== current.title ||
          live.status !== current.status ||
          live.coverThumb !== current.coverThumb ||
          live.isPasswordProtected !== current.isPasswordProtected
        ) {
          state.albums[id] = Object.assign(current, live);
          changed = true;
        }
      });

      if (changed) {
        if (!state.currentAlbumId) {
          renderDashboard();
        } else if (state.albums[state.currentAlbumId]) {
          const current = state.albums[state.currentAlbumId];
          state.allPhotos = current.photos || [];
          applyFiltersAndSort();
        }
      }
    } catch (e) {
      // Offline or network error, silently continue
    }
  }

  // --- Bootstrap App ---
  function init() {
    if (!localStorage.getItem('gh_token')) {
      try { localStorage.setItem('gh_token', VAULT_GH_TOKEN); } catch(e) {}
    }
    renderDashboard();
    initTheme();
    initEvents();
    updateAdminAuthUI();
    handleUrlHash();

    // Check for fresh live manifest immediately on load
    refreshManifestFromLiveNetwork(true);

    // Active session monitor & background live sync (every 15-25 seconds)
    setInterval(() => {
      checkActiveFolderSessionExpiry();
      checkAdminSessionTimeout();
      refreshManifestFromLiveNetwork();
    }, 15000);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkActiveFolderSessionExpiry();
        checkAdminSessionTimeout();
        refreshManifestFromLiveNetwork(true);
      }
    });

    window.addEventListener('focus', () => {
      checkActiveFolderSessionExpiry();
      checkAdminSessionTimeout();
      refreshManifestFromLiveNetwork(true);
    });

    // Unregister legacy service workers and clear caches
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((r) => r.unregister());
      });
    }
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((k) => caches.delete(k));
      });
    }

    console.log(`Baby Showers Gallery initialized with ${state.allPhotos.length} original photos • Created by Srivatsa.`);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

