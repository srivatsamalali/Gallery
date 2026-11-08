# 🛡️ Srivatsa's Photo Vault — Confidential Security & Passwords Reference

> **CONFIDENTIAL**: This document contains the administrative master credentials and security configurations for **Srivatsa's Photo Vault**. Keep this document safe for future reference.

---

## 🔑 1. Master Administrative Credentials

| Credential | Value | Purpose |
| :--- | :--- | :--- |
| **Authorized Admin Email** | `srivatsa.a.malali@gmail.com` | Strictly enforced identity. Only this email can open the management suite, set folder passwords, or create/delete folders. |
| **Master Admin Passcode** | `SrivatsaAdmin2026` | Master key to unlock the Web Management Suite and the `admin.py` CLI tool. |
| **GitHub Token (Optional)** | `ghp_...` | Any personal GitHub Access Token with repo scope can also be used as an admin key for direct web-to-repo commits. |

---

## 🔒 2. Folder Password Architecture

- **Public Folders (`🔓 Public`)**:
  - When creating or editing a folder, leaving the password field **blank** makes the event collection **100% public**. Anyone with the gallery link can browse and download all photos without any prompt.
- **Protected Folders (`🔒 Protected`)**:
  - When you set a passcode, the system calculates a cryptographic **SHA-256 hash** (`crypto.subtle.digest`).
  - Guests clicking on a locked folder are prompted for the passcode.
  - Upon entering the correct passcode, the browser saves the session in `sessionStorage` (`album_unlocked_<folder_id> = true`), so guests don't have to re-enter it repeatedly while browsing.
  - You can remove or change a folder passcode anytime from the Web Suite or by running `python3 admin.py`.

---

## 📁 3. Local Command Center (`admin.py`)

Whenever you have new photoshoot photos, RAW files, or large `.ZIP` archives:

```bash
# 1. Open Terminal in the project directory
cd /Users/srivatsamalali/projects/photos

# 2. Launch the interactive Admin Command Center
python3 admin.py
```

### Available Menu Options:
1. `[1] 📁 Create New Event Folder`: Creates directory with optional password protection.
2. `[2] 🔑 Set / Change / Remove Folder Password`: Toggle folders between public and passcode protected.
3. `[3] ✏️ Rename Event Folder`: Safely renames folder, thumbnails, and updates manifest.
4. `[4] 🗑️ Delete Event Folder`: Permanently removes event folder and thumbnails.
5. `[5] 📦 Import Photos or Extract .ZIP Archive`: Unpacks `.zip` files (or loose photos), strips macOS system junk, and places photos directly into the chosen folder.
6. `[6] 🔄 Regenerate Manifest & Thumbnails`: Refreshes `photos-data.js`.
7. `[7] 🚀 Commit & Push to GitHub`: Deploys updates to both `main` and `gh-pages` in one command.
8. `[8] 🌐 Run Local Web Server`: Starts local preview at `http://localhost:8080`.

---

## 🌐 4. Live Gallery URLs

- **Live GitHub Pages URL**: [https://srivatsamalali.github.io/Gallery/](https://srivatsamalali.github.io/Gallery/)
- **GitHub Repository**: [https://github.com/srivatsamalali/Gallery](https://github.com/srivatsamalali/Gallery)
- **Repository Branch Structure**:
  - `main`: Master development branch containing all high-resolution originals, manifests, and tooling.
  - `gh-pages`: Production deployment branch serving the live web gallery.

---
*Created and maintained by Srivatsa.*
