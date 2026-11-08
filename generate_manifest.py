#!/usr/bin/env python3
"""
Baby Showers & Events Portal - Multi-Folder Manifest & Thumbnail Generator
Scans all event photo folders in the root directory, generates fast web thumbnails,
and updates photos-data.js with complete metadata, dimensions, and album manifests.
"""

import os
import struct
import subprocess
import json
import re
from concurrent.futures import ThreadPoolExecutor

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
THUMBS_ROOT = os.path.join(BASE_DIR, 'thumbnails')
MANIFEST_PATH = os.path.join(BASE_DIR, 'photos-data.js')

IGNORE_DIRS = {
    'thumbnails', '.git', '.github', 'node_modules', '__pycache__', '.system_generated'
}

VALID_EXTENSIONS = ('.JPG', '.JPEG', '.PNG', '.WEBP')

def slugify(text):
    return re.sub(r'[\W_]+', '-', text.lower()).strip('-')

def parse_photo_header(filepath, folder_name, filename, thumb_rel_path):
    size_bytes = os.path.getsize(filepath)
    width = 6048
    height = 4032
    orientation = 1
    date_str = None
    camera_model = "Nikon Z6 III"

    with open(filepath, 'rb') as f:
        data = f.read(65536)
        # Parse dimensions from JPEG SOF
        idx = 2
        while idx < len(data) - 8:
            if data[idx] != 0xff:
                idx += 1
                continue
            marker = data[idx+1]
            if marker in (0xc0, 0xc2):
                h, w = struct.unpack('>HH', data[idx+5:idx+9])
                width, height = w, h
                break
            elif marker in (0xd9, 0xda):
                break
            else:
                length = struct.unpack('>H', data[idx+2:idx+4])[0]
                idx += 2 + length

        # Parse EXIF metadata
        exif_idx = data.find(b'Exif\x00\x00')
        if exif_idx != -1:
            tiff_data = data[exif_idx+6:]
            if len(tiff_data) > 14:
                endian = tiff_data[:2]
                fmt = '<' if endian == b'II' else '>'
                try:
                    first_ifd = struct.unpack(fmt + 'I', tiff_data[4:8])[0]
                    if len(tiff_data) >= first_ifd + 2:
                        num_entries = struct.unpack(fmt + 'H', tiff_data[first_ifd:first_ifd+2])[0]
                        exif_sub_ifd_offset = None
                        for i in range(num_entries):
                            entry_offset = first_ifd + 2 + i * 12
                            if len(tiff_data) >= entry_offset + 10:
                                tag = struct.unpack(fmt + 'H', tiff_data[entry_offset:entry_offset+2])[0]
                                if tag == 0x0112:
                                    orientation = struct.unpack(fmt + 'H', tiff_data[entry_offset+8:entry_offset+10])[0]
                                elif tag == 0x0110: # Model
                                    val_offset = struct.unpack(fmt + 'I', tiff_data[entry_offset+8:entry_offset+12])[0]
                                    raw_model = tiff_data[val_offset:val_offset+16].decode('ascii', errors='ignore')
                                    clean_model = raw_model.split('\x00')[0].strip()
                                    if 'Z6_3' in clean_model:
                                        camera_model = 'Nikon Z6 III'
                                    elif clean_model:
                                        camera_model = clean_model
                                elif tag == 0x8769:
                                    exif_sub_ifd_offset = struct.unpack(fmt + 'I', tiff_data[entry_offset+8:entry_offset+12])[0]
                        if exif_sub_ifd_offset and len(tiff_data) >= exif_sub_ifd_offset + 2:
                            sub_entries = struct.unpack(fmt + 'H', tiff_data[exif_sub_ifd_offset:exif_sub_ifd_offset+2])[0]
                            for i in range(sub_entries):
                                entry_offset = exif_sub_ifd_offset + 2 + i * 12
                                tag = struct.unpack(fmt + 'H', tiff_data[entry_offset:entry_offset+2])[0]
                                if tag in (0x9003, 0x9004):
                                    val_offset = struct.unpack(fmt + 'I', tiff_data[entry_offset+8:entry_offset+12])[0]
                                    date_str = tiff_data[val_offset:val_offset+19].decode('ascii', errors='ignore')
                                    break
                except Exception:
                    pass

    is_portrait = orientation in (5, 6, 7, 8)
    disp_w = height if is_portrait else width
    disp_h = width if is_portrait else height

    # Ensure thumbnail exists
    thumb_full_path = os.path.join(BASE_DIR, thumb_rel_path)
    if not os.path.exists(thumb_full_path):
        os.makedirs(os.path.dirname(thumb_full_path), exist_ok=True)
        subprocess.run(['sips', '-Z', '1000', filepath, '--out', thumb_full_path],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    return {
        'filename': filename,
        'title': os.path.splitext(filename)[0],
        'folder': folder_name,
        'originalUrl': f'{folder_name}/{filename}',
        'thumbUrl': thumb_rel_path,
        'sizeBytes': size_bytes,
        'sizeFormatted': f'{size_bytes / (1024 * 1024):.1f} MB',
        'width': width,
        'height': height,
        'displayWidth': disp_w,
        'displayHeight': disp_h,
        'orientation': orientation,
        'isPortrait': is_portrait,
        'aspectRatio': round(disp_w / disp_h, 3),
        'date': date_str or 'Nov 2026',
        'camera': camera_model or 'Nikon Z6 III'
    }

def scan_albums():
    albums = []
    entries = sorted(os.listdir(BASE_DIR))
    for entry in entries:
        full_path = os.path.join(BASE_DIR, entry)
        if not os.path.isdir(full_path):
            continue
        if entry.startswith('.') or entry in IGNORE_DIRS:
            continue

        # Check for photo files
        files = sorted([f for f in os.listdir(full_path) if f.upper().endswith(VALID_EXTENSIONS)])
        if not files:
            continue

        album_id = slugify(entry)
        print(f'Found Album Folder "{entry}": {len(files)} photos')

        def process_one(filename):
            if entry == 'Baby Showers' and os.path.exists(os.path.join(THUMBS_ROOT, filename)):
                thumb_rel = f'thumbnails/{filename}'
            else:
                thumb_rel = f'thumbnails/{entry}/{filename}'
            src = os.path.join(full_path, filename)
            return parse_photo_header(src, entry, filename, thumb_rel)

        with ThreadPoolExecutor(max_workers=8) as executor:
            photos = list(executor.map(process_one, files))

        photos.sort(key=lambda x: x['filename'])
        for idx, p in enumerate(photos):
            p['id'] = idx + 1

        total_bytes = sum(p['sizeBytes'] for p in photos)
        total_mb = total_bytes / (1024 * 1024)
        total_formatted = f'{total_mb / 1024:.2f} GB' if total_mb >= 1024 else f'{total_mb:.1f} MB'

        cover_photo = photos[0] if photos else None

        album_meta = {
            'id': album_id,
            'title': entry,
            'folder': entry,
            'description': f'Preserved in 100% original uncompressed quality ({cover_photo["camera"] if cover_photo else "DSLR"}).',
            'date': cover_photo['date'] if cover_photo else '2026',
            'photoCount': len(photos),
            'portraitsCount': sum(1 for p in photos if p['isPortrait']),
            'landscapesCount': sum(1 for p in photos if not p['isPortrait']),
            'totalSizeBytes': total_bytes,
            'totalSizeFormatted': total_formatted,
            'coverThumb': cover_photo['thumbUrl'] if cover_photo else '',
            'coverOriginal': cover_photo['originalUrl'] if cover_photo else '',
            'camera': cover_photo['camera'] if cover_photo else 'Nikon Z6 III',
            'photos': photos
        }
        albums.append(album_meta)

    return albums

def main():
    albums = scan_albums()
    albums_dict = {a['id']: a for a in albums}

    with open(MANIFEST_PATH, 'w') as f:
        f.write('// Auto-generated Multi-Folder Albums Manifest\n')
        f.write('const ALBUMS_DATA = ')
        json.dump(albums_dict, f, indent=2)
        f.write(';\n\n')

        default_album = albums[0] if albums else None
        default_photos = default_album['photos'] if default_album else []
        f.write('const PHOTOS_DATA = ')
        json.dump(default_photos, f, indent=2)
        f.write(';\n')

    print(f'Successfully generated manifest with {len(albums)} album(s) at {MANIFEST_PATH}.')

if __name__ == '__main__':
    main()
