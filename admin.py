#!/usr/bin/env python3
"""
Srivatsa's Photo Vault — Event Folder & Media Management Utility
Authorized exclusively for srivatsa.a.malali@gmail.com

Capabilities:
1. Create new event folders with optional SHA-256 password protection
2. Add, update, or remove folder passwords (empty = public)
3. Rename folders (preserves media & updates manifest)
4. Delete folders safely
5. Import photos & auto-extract .ZIP archives directly into target folders
6. Auto-generate thumbnails & photos-data.js manifest
7. One-step git push to both 'main' and 'gh-pages' branches
8. Local HTTP server for zero-latency testing
"""

import os
import sys
import json
import shutil
import hashlib
import zipfile
import subprocess
import urllib.parse
from pathlib import Path

WORKSPACE_ROOT = os.path.dirname(os.path.abspath(__file__))
THUMBS_ROOT = os.path.join(WORKSPACE_ROOT, 'thumbnails')
MANIFEST_PY = os.path.join(WORKSPACE_ROOT, 'generate_manifest.py')
DATA_JS = os.path.join(WORKSPACE_ROOT, 'photos-data.js')

OWNER_EMAIL = 'srivatsa.a.malali@gmail.com'
MASTER_PASSCODE = 'SrivatsaAdmin2026'

SYSTEM_FOLDERS = {'.git', 'thumbnails', '__pycache__', '.system_generated', 'scratch'}
IMAGE_EXTENSIONS = {'.JPG', '.JPEG', '.PNG', '.WEBP'}


def sha256_text(text: str) -> str:
    """Compute SHA-256 hash matching browser Web Crypto API."""
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def verify_admin_identity():
    """Ensure strictly srivatsa.a.malali@gmail.com can manage passwords/folders."""
    print("=" * 65)
    print(" 🛡️  SRIVATSA'S PHOTO VAULT — ADMINISTRATIVE AUTHENTICATION")
    print("=" * 65)
    email = input(f"Enter Owner Admin Email [{OWNER_EMAIL}]: ").strip()
    if not email:
        email = OWNER_EMAIL

    if email.lower() != OWNER_EMAIL.lower():
        print("\n❌ ACCESS DENIED: Administrative operations are strictly restricted.")
        print(f"   Only '{OWNER_EMAIL}' has permission to create/manage folders or passwords.")
        alert_body = urllib.parse.quote(
            f"Unauthorized user '{email}' attempted to execute admin operations on your Gallery at {WORKSPACE_ROOT}."
        )
        mailto_url = f"mailto:{OWNER_EMAIL}?subject=Security%20Alert%3A%20Unauthorized%20Admin%20Attempt&body={alert_body}"
        print(f"\n📧 Security Alert Triggered to {OWNER_EMAIL}!")
        print(f"   Mailto URI: {mailto_url}\n")
        sys.exit(1)

    passcode = input("Enter Master Admin Passcode: ").strip()
    if passcode != MASTER_PASSCODE:
        print("\n❌ Invalid Passcode. Access denied.")
        sys.exit(1)

    print("\n✅ Admin Verified. Welcome Srivatsa!\n")


def list_existing_folders():
    """List valid event photoshoot folders."""
    folders = []
    for item in sorted(os.listdir(WORKSPACE_ROOT)):
        full = os.path.join(WORKSPACE_ROOT, item)
        if os.path.isdir(full) and item not in SYSTEM_FOLDERS and not item.startswith('.'):
            # Count photos
            photos = [f for f in os.listdir(full) if Path(f).suffix.upper() in IMAGE_EXTENSIONS]
            folders.append((item, len(photos)))
    return folders


def create_folder():
    """Create a new event folder with optional password protection."""
    print("\n📁 --- CREATE NEW EVENT FOLDER ---")
    name = input("Enter new folder name (e.g. 'Pre Wedding Shoot', 'Reception'): ").strip()
    if not name:
        print("Aborted: folder name cannot be empty.")
        return

    folder_path = os.path.join(WORKSPACE_ROOT, name)
    if os.path.exists(folder_path):
        print(f"⚠️ Folder '{name}' already exists!")
        return

    os.makedirs(folder_path, exist_ok=True)
    thumb_path = os.path.join(THUMBS_ROOT, name)
    os.makedirs(thumb_path, exist_ok=True)

    pwd = input("Set password for this folder (leave EMPTY for 100% public access): ").strip()
    if pwd:
        pwd_hash = sha256_text(pwd)
        save_folder_password(name, pwd_hash)
        print(f"🔒 Folder '{name}' created with passcode protection!")
    else:
        print(f"🔓 Folder '{name}' created with public access (no password).")

    run_generate_manifest()


def set_folder_password():
    """Add, change, or remove password for an event folder."""
    folders = list_existing_folders()
    if not folders:
        print("No event folders found.")
        return

    print("\n🔑 --- SET / REMOVE FOLDER PASSWORD ---")
    for idx, (fname, pcount) in enumerate(folders, 1):
        has_pwd = check_folder_password(fname)
        status = "🔒 PASSWORD PROTECTED" if has_pwd else "🔓 PUBLIC (No Password)"
        print(f"  [{idx}] {fname} ({pcount} photos) — {status}")

    choice = input("\nSelect folder # to configure: ").strip()
    try:
        sel = int(choice) - 1
        target_name, _ = folders[sel]
    except (ValueError, IndexError):
        print("Invalid selection.")
        return

    print(f"\nConfiguring password for: {target_name}")
    pwd = input("Enter new password (leave EMPTY to REMOVE password and make public): ").strip()
    if not pwd:
        remove_folder_password(target_name)
        print(f"🔓 Passcode removed! '{target_name}' is now open to the public.")
    else:
        pwd_hash = sha256_text(pwd)
        save_folder_password(target_name, pwd_hash)
        print(f"🔒 Passcode active! '{target_name}' now requires password to view.")

    run_generate_manifest()


def rename_folder():
    """Rename an event folder."""
    folders = list_existing_folders()
    if not folders:
        print("No event folders found.")
        return

    print("\n✏️ --- RENAME EVENT FOLDER ---")
    for idx, (fname, pcount) in enumerate(folders, 1):
        print(f"  [{idx}] {fname} ({pcount} photos)")

    choice = input("\nSelect folder # to rename: ").strip()
    try:
        sel = int(choice) - 1
        old_name, _ = folders[sel]
    except (ValueError, IndexError):
        print("Invalid selection.")
        return

    new_name = input(f"Enter new name for '{old_name}': ").strip()
    if not new_name or new_name == old_name:
        print("Aborted: invalid or identical name.")
        return

    old_path = os.path.join(WORKSPACE_ROOT, old_name)
    new_path = os.path.join(WORKSPACE_ROOT, new_name)

    if os.path.exists(new_path):
        print(f"⚠️ Target folder '{new_name}' already exists.")
        return

    shutil.move(old_path, new_path)

    # Rename thumbnails if present
    old_thumb = os.path.join(THUMBS_ROOT, old_name)
    new_thumb = os.path.join(THUMBS_ROOT, new_name)
    if os.path.exists(old_thumb):
        shutil.move(old_thumb, new_thumb)

    # Update password config if present
    update_password_folder_name(old_name, new_name)

    print(f"✅ Renamed '{old_name}' -> '{new_name}'.")
    run_generate_manifest()


def delete_folder():
    """Delete an event folder."""
    folders = list_existing_folders()
    if not folders:
        print("No event folders found.")
        return

    print("\n🗑️ --- DELETE EVENT FOLDER ---")
    for idx, (fname, pcount) in enumerate(folders, 1):
        print(f"  [{idx}] {fname} ({pcount} photos)")

    choice = input("\nSelect folder # to delete: ").strip()
    try:
        sel = int(choice) - 1
        target_name, pcount = folders[sel]
    except (ValueError, IndexError):
        print("Invalid selection.")
        return

    confirm = input(f"⚠️ Are you sure you want to permanently delete '{target_name}' with {pcount} photo(s)? (yes/no): ").strip().lower()
    if confirm != 'yes':
        print("Deletion canceled.")
        return

    target_path = os.path.join(WORKSPACE_ROOT, target_name)
    shutil.rmtree(target_path, ignore_errors=True)

    thumb_path = os.path.join(THUMBS_ROOT, target_name)
    shutil.rmtree(thumb_path, ignore_errors=True)

    remove_folder_password(target_name)

    print(f"🗑️ Deleted folder '{target_name}'.")
    run_generate_manifest()


def import_photos_or_zip():
    """Import loose photos or extract a .ZIP archive directly into an event folder."""
    folders = list_existing_folders()
    if not folders:
        print("No event folders found. Create one first!")
        return

    print("\n📥 --- IMPORT PHOTOS OR EXTRACT .ZIP ARCHIVE ---")
    for idx, (fname, pcount) in enumerate(folders, 1):
        print(f"  [{idx}] {fname} ({pcount} photos)")

    choice = input("\nSelect destination folder #: ").strip()
    try:
        sel = int(choice) - 1
        dest_name, _ = folders[sel]
    except (ValueError, IndexError):
        print("Invalid selection.")
        return

    dest_folder = os.path.join(WORKSPACE_ROOT, dest_name)
    os.makedirs(dest_folder, exist_ok=True)

    src_input = input("Enter path to Photo file, Directory, or .ZIP archive: ").strip()
    src_path = os.path.expanduser(src_input.strip('\'"'))

    if not os.path.exists(src_path):
        print(f"❌ Path not found: {src_path}")
        return

    imported_count = 0

    # Case 1: ZIP Archive
    if zipfile.is_zipfile(src_path) or src_path.lower().endswith('.zip'):
        print(f"\n📦 Extracting ZIP archive: {os.path.basename(src_path)}...")
        with zipfile.ZipFile(src_path, 'r') as z:
            for member in z.namelist():
                # Skip macOS metadata and directories
                if member.startswith('__MACOSX') or member.startswith('.') or member.endswith('/'):
                    continue
                ext = Path(member).suffix.upper()
                if ext in IMAGE_EXTENSIONS:
                    filename = os.path.basename(member)
                    target_file = os.path.join(dest_folder, filename)
                    with z.open(member) as src_file, open(target_file, 'wb') as dst_file:
                        shutil.copyfileobj(src_file, dst_file)
                    imported_count += 1
                    print(f"  + Extracted: {filename}")

    # Case 2: Directory of Photos
    elif os.path.isdir(src_path):
        print(f"\n📁 Copying photos from directory: {src_path}...")
        for item in sorted(os.listdir(src_path)):
            if Path(item).suffix.upper() in IMAGE_EXTENSIONS:
                s = os.path.join(src_path, item)
                d = os.path.join(dest_folder, item)
                shutil.copy2(s, d)
                imported_count += 1
                print(f"  + Copied: {item}")

    # Case 3: Single Photo File
    elif os.path.isfile(src_path):
        ext = Path(src_path).suffix.upper()
        if ext in IMAGE_EXTENSIONS:
            filename = os.path.basename(src_path)
            shutil.copy2(src_path, os.path.join(dest_folder, filename))
            imported_count = 1
            print(f"  + Copied: {filename}")
        else:
            print("⚠️ Selected file is not an image (JPEG, PNG, WEBP).")

    print(f"\n🎉 Successfully imported {imported_count} photo(s) into '{dest_name}'!")
    run_generate_manifest()


def run_generate_manifest():
    """Regenerate photos-data.js manifest."""
    print("\n⚙️ Updating gallery manifest & thumbnails...")
    try:
        subprocess.run([sys.executable, MANIFEST_PY], check=True)
        # Apply password hashes to manifest
        apply_passwords_to_manifest()
    except Exception as e:
        print(f"Manifest generation error: {e}")


def apply_passwords_to_manifest():
    """Read saved passwords and write into photos-data.js."""
    pwds = load_passwords()
    if not pwds or not os.path.exists(DATA_JS):
        return

    try:
        with open(DATA_JS, 'r') as f:
            content = f.read()

        # Parse JSON
        prefix = 'const ALBUMS_DATA = '
        if prefix in content:
            parts = content.split(';\n\nconst PHOTOS_DATA = ')
            albums_json = parts[0].replace(prefix, '')
            albums = json.loads(albums_json)

            for aid, a in albums.items():
                folder = a.get('folder', '')
                if folder in pwds:
                    a['isPasswordProtected'] = True
                    a['passwordHash'] = pwds[folder]
                else:
                    a['isPasswordProtected'] = False
                    a['passwordHash'] = ''

            # Write back
            new_content = f"{prefix}{json.dumps(albums, indent=2)};\n\nconst PHOTOS_DATA = {parts[1]}"
            with open(DATA_JS, 'w') as f:
                f.write(new_content)
    except Exception as e:
        print(f"Note: Could not update manifest passwords: {e}")


# --- Password Storage Helpers ---
PASSWORDS_FILE = os.path.join(WORKSPACE_ROOT, '.folder_passwords.json')

def load_passwords():
    if os.path.exists(PASSWORDS_FILE):
        try:
            with open(PASSWORDS_FILE, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_folder_password(folder_name: str, pwd_hash: str):
    pwds = load_passwords()
    pwds[folder_name] = pwd_hash
    with open(PASSWORDS_FILE, 'w') as f:
        json.dump(pwds, f, indent=2)

def remove_folder_password(folder_name: str):
    pwds = load_passwords()
    if folder_name in pwds:
        del pwds[folder_name]
        with open(PASSWORDS_FILE, 'w') as f:
            json.dump(pwds, f, indent=2)

def check_folder_password(folder_name: str) -> bool:
    pwds = load_passwords()
    return folder_name in pwds

def update_password_folder_name(old_name: str, new_name: str):
    pwds = load_passwords()
    if old_name in pwds:
        pwds[new_name] = pwds.pop(old_name)
        with open(PASSWORDS_FILE, 'w') as f:
            json.dump(pwds, f, indent=2)


def sync_git():
    """Commit and push to main and gh-pages."""
    print("\n🚀 --- GIT REPOSITORY SYNC (MAIN & GH-PAGES) ---")
    msg = input("Enter commit message [feat: update gallery event folders and photos]: ").strip()
    if not msg:
        msg = "feat: update gallery event folders and photos"

    try:
        subprocess.run(["git", "add", "."], check=True)
        subprocess.run(["git", "commit", "-m", msg], check=False)
        print("Pushing to main branch...")
        subprocess.run(["git", "push", "origin", "main"], check=True)

        print("Updating gh-pages branch...")
        current_branch = subprocess.check_output(["git", "branch", "--show-current"]).decode().strip()
        subprocess.run(["git", "checkout", "gh-pages"], check=True)
        subprocess.run(["git", "merge", "main", "-m", f"merge: {msg}"], check=True)
        subprocess.run(["git", "push", "origin", "gh-pages"], check=True)
        subprocess.run(["git", "checkout", current_branch], check=True)

        print("\n✨ Sync complete! Both 'main' and 'gh-pages' are deployed.")
        print("🔗 Live URL: https://srivatsamalali.github.io/Gallery/\n")
    except Exception as e:
        print(f"❌ Git sync failed: {e}")


def launch_server():
    """Launch local testing server."""
    port = 8080
    print(f"\n🌐 Starting local gallery server on http://localhost:{port}...")
    print("Press Ctrl+C to stop.")
    try:
        from http.server import SimpleHTTPRequestHandler, HTTPServer
        server = HTTPServer(('127.0.0.1', port), SimpleHTTPRequestHandler)
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")


def main_menu():
    verify_admin_identity()

    while True:
        print("=" * 65)
        print(" 📸 SRIVATSA'S PHOTO VAULT — EVENT FOLDER MANAGEMENT")
        print("=" * 65)
        print("  [1] 📁 Create New Event Folder (with optional password)")
        print("  [2] 🔑 Set / Change / Remove Folder Password")
        print("  [3] ✏️  Rename Event Folder")
        print("  [4] 🗑️  Delete Event Folder")
        print("  [5] 📦 Import Photos or Extract .ZIP Archive into Folder")
        print("  [6] 🔄 Regenerate Manifest & Thumbnails")
        print("  [7] 🚀 Commit & Push to GitHub (main & gh-pages)")
        print("  [8] 🌐 Run Local Web Server (http://localhost:8080)")
        print("  [0] 🚪 Exit")
        print("-" * 65)

        choice = input("Select an option [0-8]: ").strip()

        if choice == '1':
            create_folder()
        elif choice == '2':
            set_folder_password()
        elif choice == '3':
            rename_folder()
        elif choice == '4':
            delete_folder()
        elif choice == '5':
            import_photos_or_zip()
        elif choice == '6':
            run_generate_manifest()
        elif choice == '7':
            sync_git()
        elif choice == '8':
            launch_server()
        elif choice == '0':
            print("\nGoodbye Srivatsa! 👋\n")
            break
        else:
            print("Invalid option. Please choose [0-8].")

        print("\n")


if __name__ == '__main__':
    # Make executable
    main_menu()

