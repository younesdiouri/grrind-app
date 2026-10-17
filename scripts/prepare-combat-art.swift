// Recalage mécanique uniquement : même échelle pour tout le pack, alpha conservé, pieds à 930.
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let poses = ["idle", "attack", "hit", "critical", "dodge", "combo", "replay"]
let size = 1024
let baseline = 930
let margin = 32

struct Sprite {
    let pose: String
    let image: CGImage
    let bounds: CGRect
}

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data((message + "\n").utf8))
    exit(1)
}

func context(_ width: Int, _ height: Int) -> CGContext {
    guard let value = CGContext(data: nil, width: width, height: height,
        bitsPerComponent: 8, bytesPerRow: width * 4, space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { fail("Contexte RGBA indisponible") }
    return value
}

func boundsOf(_ image: CGImage) -> CGRect {
    let canvas = context(image.width, image.height)
    canvas.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))
    let bytes = canvas.data!.assumingMemoryBound(to: UInt8.self)
    var left = image.width, top = image.height, right = -1, bottom = -1
    var transparent = false
    for y in 0..<image.height {
        for x in 0..<image.width {
            let alpha = bytes[(y * image.width + x) * 4 + 3]
            if alpha == 0 { transparent = true }
            if alpha > 220 {
                left = min(left, x); right = max(right, x)
                top = min(top, y); bottom = max(bottom, y)
            }
        }
    }
    guard transparent, right >= left else { fail("Le sprite doit contenir un personnage opaque et une vraie transparence") }
    return CGRect(x: left, y: top, width: right - left + 1, height: bottom - top + 1)
}

guard CommandLine.arguments.count == 3 else {
    fail("Usage : swift scripts/prepare-combat-art.swift DOSSIER_SOURCE DOSSIER_DESTINATION")
}
let input = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true).standardizedFileURL
let output = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true).standardizedFileURL
guard input != output else { fail("Conserver les sources : choisir un autre dossier de destination") }
let sprites = poses.map { pose -> Sprite in
    let url = input.appendingPathComponent(pose + ".png")
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil), image.width == image.height else {
        fail("PNG carré manquant ou illisible : \(url.path)")
    }
    return Sprite(pose: pose, image: image, bounds: boundsOf(image))
}
guard Set(sprites.map { $0.image.width }).count == 1 else { fail("Les sources d’un pack doivent partager le même canevas") }
let sourceSize = sprites[0].image.width
let widest = sprites.map { $0.bounds.width }.max()!
let tallest = sprites.map { $0.bounds.height }.max()!
let scale = min(Double(size) / Double(sourceSize), Double(size - margin * 2) / widest, Double(baseline - margin) / tallest)
let horizontal = (Double(size) - Double(sourceSize) * scale) / 2
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
for sprite in sprites {
    let canvas = context(size, size)
    canvas.interpolationQuality = .high
    let top = Double(baseline + 1) - sprite.bounds.maxY * scale
    // Le canevas CoreGraphics place l’origine en bas ; les lignes RGBA se lisent depuis le haut.
    canvas.draw(sprite.image, in: CGRect(x: horizontal,
        y: Double(size) - top - Double(sourceSize) * scale,
        width: Double(sourceSize) * scale, height: Double(sourceSize) * scale))
    guard let image = canvas.makeImage() else { fail("Rendu impossible") }
    let bounds = boundsOf(image)
    guard bounds.minX >= 1, bounds.maxX < Double(size), bounds.minY >= 1,
        abs(bounds.maxY - Double(baseline + 1)) <= 2 else { fail("Recalage invalide : \(sprite.pose), \(bounds)") }
    let target = output.appendingPathComponent(sprite.pose + ".png")
    guard let destination = CGImageDestinationCreateWithURL(target as CFURL, UTType.png.identifier as CFString, 1, nil) else { fail("Écriture impossible") }
    CGImageDestinationAddImage(destination, image, nil)
    guard CGImageDestinationFinalize(destination) else { fail("PNG incomplet : \(target.path)") }
    print("\(sprite.pose): RGBA \(size)², sol \(Int(bounds.maxY) - 1), échelle \(String(format: "%.4f", scale))")
}
