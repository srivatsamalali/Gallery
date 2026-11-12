import Cocoa
import Vision
import Foundation

struct RawFace {
    let albumId: String
    let photoFilename: String
    let thumbRelPath: String
    let featurePrint: VNFeaturePrintObservation
    let quality: Float
    let cgImage: CGImage
    let faceRect: CGRect // Vision normalized (0..1)
}

struct PersonInfo {
    let id: String
    var name: String
    let avatar: String
    var photoCount: Int
}

let fm = FileManager.default
let baseDir = fm.currentDirectoryPath
let thumbsDir = "\(baseDir)/thumbnails"
let facesOutputDir = "\(thumbsDir)/faces"
let manifestPath = "\(baseDir)/photos-data.js"
let facesConfigPath = "\(baseDir)/faces-config.json"

try? fm.createDirectory(atPath: facesOutputDir, withIntermediateDirectories: true, attributes: nil)

// Load existing custom names and anchor configurations if present
var customNames: [String: String] = [
    "person_srivatsa": "Srivatsa",
    "person_suman": "Suman"
]
var anchorAlbumMapping: [String: String] = [
    "srivatsa": "person_srivatsa",
    "suman": "person_suman"
]

if let cfgData = try? Data(contentsOf: URL(fileURLWithPath: facesConfigPath)),
   let json = try? JSONSerialization.jsonObject(with: cfgData) as? [String: Any] {
    if let names = json["names"] as? [String: String] {
        for (k, v) in names { customNames[k] = v }
    }
    if let anchors = json["anchors"] as? [String: String] {
        for (k, v) in anchors { anchorAlbumMapping[k] = v }
    }
}

// Read photos-data.js to discover all albums and photos
guard let manifestContent = try? String(contentsOfFile: manifestPath, encoding: .utf8) else {
    print("Error: Could not read \(manifestPath)")
    exit(1)
}

guard let regex = try? NSRegularExpression(pattern: "const ALBUMS_DATA = (\\{[\\s\\S]*?\\n\\});"),
      let match = regex.firstMatch(in: manifestContent, range: NSRange(manifestContent.startIndex..., in: manifestContent)),
      let r = Range(match.range(at: 1), in: manifestContent) else {
    print("Error: Could not extract ALBUMS_DATA JSON from manifest")
    exit(1)
}

let jsonStr = String(manifestContent[r])
guard let jsonData = jsonStr.data(using: .utf8),
      let albumsDict = try? JSONSerialization.jsonObject(with: jsonData) as? [String: [String: Any]] else {
    print("Error: Failed to parse ALBUMS_DATA JSON")
    exit(1)
}

print("AI Face Scanner: Discovered \(albumsDict.count) album(s). Scanning for faces...")

var allFaces: [RawFace] = []
let faceReq = VNDetectFaceRectanglesRequest()
let printReq = VNGenerateImageFeaturePrintRequest()

for (albumId, albumMeta) in albumsDict {
    guard let photos = albumMeta["photos"] as? [[String: Any]] else { continue }
    var albumFaceCount = 0
    
    for p in photos {
        guard let filename = p["filename"] as? String,
              let thumbRel = p["thumbUrl"] as? String else { continue }
        
        let cleanThumbRel = thumbRel.components(separatedBy: "?")[0]
        let fullThumbPath = "\(baseDir)/\(cleanThumbRel)"
        
        guard let img = NSImage(contentsOfFile: fullThumbPath),
              let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
        
        let h = VNImageRequestHandler(cgImage: cg, options: [:])
        try? h.perform([faceReq])
        guard let results = faceReq.results else { continue }
        
        for face in results where face.confidence > 0.68 && face.boundingBox.width > 0.055 {
            let w = CGFloat(cg.width)
            let ch = CGFloat(cg.height)
            let bb = face.boundingBox
            
            // Expand crop for facial structure & hair recognition
            let pad: CGFloat = 0.20
            let bx = max(0, bb.minX - bb.width * pad)
            let by = max(0, bb.minY - bb.height * pad)
            let bw = min(1.0 - bx, bb.width * (1.0 + pad * 2))
            let bh = min(1.0 - by, bb.height * (1.0 + pad * 2))
            
            let rect = CGRect(x: bx * w, y: (1.0 - by - bh) * ch, width: bw * w, height: bh * ch)
            guard let cropped = cg.cropping(to: rect) else { continue }
            
            let chHandler = VNImageRequestHandler(cgImage: cropped, options: [:])
            try? chHandler.perform([printReq])
            if let printObs = printReq.results?.first as? VNFeaturePrintObservation {
                let quality = Float(face.confidence) * Float(bb.width * bb.height)
                allFaces.append(RawFace(
                    albumId: albumId,
                    photoFilename: filename,
                    thumbRelPath: cleanThumbRel,
                    featurePrint: printObs,
                    quality: quality,
                    cgImage: cg,
                    faceRect: bb
                ))
                albumFaceCount += 1
            }
        }
    }
    print("Album '\(albumId)': detected \(albumFaceCount) high-confidence faces")
}

print("Total faces detected: \(allFaces.count). Performing Neural Feature Clustering...")

// Helper to crop and save circular/square face avatar
func saveAvatar(face: RawFace, outputPath: String) -> Bool {
    let cg = face.cgImage
    let w = CGFloat(cg.width)
    let ch = CGFloat(cg.height)
    let bb = face.faceRect
    
    let faceCenterX = (bb.minX + bb.maxX) / 2.0 * w
    let faceCenterY = (1.0 - (bb.minY + bb.maxY) / 2.0) * ch
    let faceSize = max(bb.width * w, bb.height * ch) * 1.6
    
    let cropX = max(0, min(w - faceSize, faceCenterX - faceSize / 2.0))
    let cropY = max(0, min(ch - faceSize, faceCenterY - faceSize / 2.0))
    let cropRect = CGRect(x: cropX, y: cropY, width: min(faceSize, w - cropX), height: min(faceSize, ch - cropY))
    
    guard let cropped = cg.cropping(to: cropRect) else { return false }
    
    let targetSize = CGSize(width: 180, height: 180)
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard let ctx = CGContext(
        data: nil,
        width: Int(targetSize.width),
        height: Int(targetSize.height),
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else { return false }
    
    ctx.interpolationQuality = .high
    ctx.draw(cropped, in: CGRect(origin: .zero, size: targetSize))
    
    guard let resizedCG = ctx.makeImage() else { return false }
    let rep = NSBitmapImageRep(cgImage: resizedCG)
    guard let jpegData = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.90]) else { return false }
    
    try? jpegData.write(to: URL(fileURLWithPath: outputPath))
    return true
}

// 1. Separate faces into Anchor Profiles (Srivatsa, Suman, etc.) and Non-Anchor Event faces
var anchorProfiles: [String: [RawFace]] = [:]
var unanchoredFaces: [RawFace] = []

for face in allFaces {
    if let personId = anchorAlbumMapping[face.albumId] {
        anchorProfiles[personId, default: []].append(face)
    } else {
        unanchoredFaces.append(face)
    }
}

// 2. Classify unanchored event faces (e.g. from Baby Showers) against Anchor Profiles
var finalFaceClusters: [String: [RawFace]] = [:]
var remainingUnassigned: [RawFace] = []

for (personId, anchorFaces) in anchorProfiles {
    finalFaceClusters[personId] = anchorFaces
}

for face in unanchoredFaces {
    var bestPersonId: String? = nil
    var minDistance: Float = 999.0
    
    for (personId, anchorFaces) in anchorProfiles {
        for af in anchorFaces {
            var d: Float = 0
            try? face.featurePrint.computeDistance(&d, to: af.featurePrint)
            if d < minDistance {
                minDistance = d
                bestPersonId = personId
            }
        }
    }
    
    // Nearest neighbor threshold to an anchor profile exemplar
    if let bestId = bestPersonId, minDistance < 0.68 {
        finalFaceClusters[bestId, default: []].append(face)
    } else {
        remainingUnassigned.append(face)
    }
}

// 3. Cluster remaining unassigned faces (guests/family) using average linkage at 0.65
var guestClusters: [[RawFace]] = []
let guestThreshold: Float = 0.65

for face in remainingUnassigned {
    var bestIdx = -1
    var bestDist: Float = 999.0
    for (idx, cl) in guestClusters.enumerated() {
        var sumDist: Float = 0
        for cf in cl {
            var d: Float = 0
            try? face.featurePrint.computeDistance(&d, to: cf.featurePrint)
            sumDist += d
        }
        let avgDist = sumDist / Float(cl.count)
        if avgDist < guestThreshold && avgDist < bestDist {
            bestDist = avgDist
            bestIdx = idx
        }
    }
    if bestIdx >= 0 {
        guestClusters[bestIdx].append(face)
    } else {
        guestClusters.append([face])
    }
}

// Sort guest clusters by photo count descending
guestClusters.sort {
    let s1 = Set($0.map { "\($0.albumId)/\($0.photoFilename)" }).count
    let s2 = Set($1.map { "\($0.albumId)/\($0.photoFilename)" }).count
    return s1 > s2
}

var nextGuestId = 1
for cl in guestClusters {
    let personId = "person_\(nextGuestId)"
    finalFaceClusters[personId] = cl
    nextGuestId += 1
}

// 4. Build Person Registry and save avatars
var peopleRegistry: [String: PersonInfo] = [:]
var photoToPeople: [String: Set<String>] = [:]

for (personId, faces) in finalFaceClusters {
    let uniquePhotos = Set(faces.map { "\($0.albumId)/\($0.photoFilename)" })
    var name = customNames[personId]
    if name == nil {
        if personId == "person_srivatsa" { name = "Srivatsa" }
        else if personId == "person_suman" { name = "Suman" }
        else if let num = personId.components(separatedBy: "person_").last {
            name = "Person \(num)"
        } else {
            name = "Person"
        }
    }
    
    let avatarFilename = "\(personId).jpg"
    let avatarDiskPath = "\(facesOutputDir)/\(avatarFilename)"
    let avatarRelUrl = "thumbnails/faces/\(avatarFilename)"
    
    if let repFace = faces.max(by: { $0.quality < $1.quality }) {
        _ = saveAvatar(face: repFace, outputPath: avatarDiskPath)
    }
    
    peopleRegistry[personId] = PersonInfo(
        id: personId,
        name: name!,
        avatar: avatarRelUrl,
        photoCount: uniquePhotos.count
    )
    
    for f in faces {
        let key = "\(f.albumId)/\(f.photoFilename)"
        photoToPeople[key, default: []].insert(personId)
    }
    
    print("Person '\(name!)' (\(personId)): \(uniquePhotos.count) photo(s), avatar: \(avatarRelUrl)")
}

// 5. Update ALBUMS_DATA structure
var updatedAlbums: [String: Any] = [:]

for (albumId, albumMeta) in albumsDict {
    var updatedMeta = albumMeta
    var updatedPhotos: [[String: Any]] = []
    guard let photos = albumMeta["photos"] as? [[String: Any]] else { continue }
    
    // For anchor personal albums, ensure every photo is tagged with that person
    let anchorPersonId = anchorAlbumMapping[albumId]
    var albumPeopleSet: Set<String> = []
    
    for var p in photos {
        let filename = p["filename"] as? String ?? ""
        let key = "\(albumId)/\(filename)"
        var assigned = Array(photoToPeople[key] ?? [])
        if let anchorId = anchorPersonId {
            // In personal album, every photo belongs to this person
            if !assigned.contains(anchorId) {
                assigned.append(anchorId)
            }
        }
        assigned.sort()
        p["people"] = assigned
        for pid in assigned { albumPeopleSet.insert(pid) }
        updatedPhotos.append(p)
    }
    
    updatedMeta["photos"] = updatedPhotos
    
    // People list for this album
    let albumPeopleList: [[String: Any]] = albumPeopleSet.compactMap { pid in
        guard let person = peopleRegistry[pid] else { return nil }
        let countInAlbum = updatedPhotos.filter {
            let pList = $0["people"] as? [String] ?? []
            return pList.contains(pid)
        }.count
        
        // In personal albums, don't show phantom secondary noise
        if let anchorId = anchorPersonId, pid != anchorId && countInAlbum < 3 {
            return nil
        }
        
        // In event albums, filter out 1-photo guest noise from the top filter list unless custom named
        let hasCustomName = (customNames[pid] != nil) && !person.name.hasPrefix("Person ")
        if anchorPersonId == nil && countInAlbum < 2 && !hasCustomName {
            return nil
        }
        
        return [
            "id": person.id,
            "name": person.name,
            "avatar": person.avatar,
            "photoCount": countInAlbum
        ]
    }.sorted { ($0["photoCount"] as? Int ?? 0) > ($1["photoCount"] as? Int ?? 0) }
    
    updatedMeta["people"] = albumPeopleList
    updatedAlbums[albumId] = updatedMeta
    print("Album '\(albumId)': registered \(albumPeopleList.count) people")
}

// 6. Re-serialize photos-data.js
let defaultAlbum = (updatedAlbums["baby-showers"] as? [String: Any]) ?? (updatedAlbums.values.first as? [String: Any])
let defaultPhotos = (defaultAlbum?["photos"] as? [[String: Any]]) ?? []

guard let albumsDataJson = try? JSONSerialization.data(withJSONObject: updatedAlbums, options: [.prettyPrinted, .sortedKeys]),
      let albumsJsonStr = String(data: albumsDataJson, encoding: .utf8),
      let defaultPhotosJson = try? JSONSerialization.data(withJSONObject: defaultPhotos, options: [.prettyPrinted, .sortedKeys]),
      let defaultPhotosJsonStr = String(data: defaultPhotosJson, encoding: .utf8) else {
    print("Error: Could not serialize manifest")
    exit(1)
}

let newManifestContent = """
// Auto-generated Multi-Folder Albums Manifest
const ALBUMS_DATA = \(albumsJsonStr);

const PHOTOS_DATA = \(defaultPhotosJsonStr);

"""

try? newManifestContent.write(toFile: manifestPath, atomically: true, encoding: .utf8)

// Also save faces-config.json
var configNames: [String: String] = [:]
for (pid, p) in peopleRegistry {
    configNames[pid] = p.name
}
let configObj: [String: Any] = [
    "names": configNames,
    "anchors": anchorAlbumMapping
]
if let configData = try? JSONSerialization.data(withJSONObject: configObj, options: [.prettyPrinted, .sortedKeys]) {
    try? configData.write(to: URL(fileURLWithPath: facesConfigPath))
}

print("AI Face Segmentation Complete! Manifest and face avatars saved successfully.")
