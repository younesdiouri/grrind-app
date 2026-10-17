// Découpe mécanique de la prise : mêmes pixels que le corps, sans repeindre la main.
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

guard CommandLine.arguments.count == 3 else { fatalError("MANIFESTE PUBLIC") }
let records = try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))) as! [[String: Any]]
let root = CommandLine.arguments[2]
for avatar in records where avatar["kind"] as? String == "AVATAR" {
    let manifest = avatar["manifest"] as! [String: Any]
    for view in ["back", "front"] {
        let bodies = (manifest["imageUrls"] as! [String: Any])[view] as! [String: String]
        let targets = (manifest["foregroundUrls"] as! [String: Any])[view] as! [String: String]
        let hand = ((manifest["attachments"] as! [String: Any])[view] as! [String: Any])["hand"] as! [String: [String: Double]]
        for (pose, source) in bodies {
            let image = CGImageSourceCreateImageAtIndex(CGImageSourceCreateWithURL(URL(fileURLWithPath: root + source) as CFURL, nil)!, 0, nil)!
            let canvas = CGContext(data: nil, width: 256, height: 256, bitsPerComponent: 8, bytesPerRow: 1024,
                space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
            canvas.interpolationQuality = .none
            let point = hand[pose]!, half = avatar["key"] as? String == "RUNNER_V1" ? 5.0 : 6.0
            canvas.clip(to: CGRect(x: (point["x"]! * 256).rounded() - half, y: ((1 - point["y"]!) * 256).rounded() - half, width: half * 2, height: half * 2))
            canvas.draw(image, in: CGRect(x: 0, y: 0, width: 256, height: 256))
            let target = URL(fileURLWithPath: root + targets[pose]!)
            try FileManager.default.createDirectory(at: target.deletingLastPathComponent(), withIntermediateDirectories: true)
            let writer = CGImageDestinationCreateWithURL(target as CFURL, UTType.png.identifier as CFString, 1, nil)!
            CGImageDestinationAddImage(writer, canvas.makeImage()!, nil)
            guard CGImageDestinationFinalize(writer) else { fatalError("PNG incomplet") }
        }
    }
}
