// Planches de contrôle : chaque objet, avatar, pose et orientation, avec les vrais calques.
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

func fail(_ message: String) -> Never { FileHandle.standardError.write(Data((message+"\n").utf8));exit(1) }
func context(_ width:Int,_ height:Int)->CGContext {
    let value=CGContext(data:nil,width:width,height:height,bitsPerComponent:8,bytesPerRow:width*4,
        space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
    value.interpolationQuality = .none;return value
}
guard CommandLine.arguments.count >= 4 else { fail("Usage : MANIFESTE PUBLIC SORTIE [ITEM]") }
let records=try! JSONSerialization.jsonObject(with:Data(contentsOf:URL(fileURLWithPath:CommandLine.arguments[1]))) as! [[String:Any]]
let root=URL(fileURLWithPath:CommandLine.arguments[2]).standardizedFileURL.path
let out=URL(fileURLWithPath:CommandLine.arguments[3])
try! FileManager.default.createDirectory(at:out,withIntermediateDirectories:true)
let avatars=records.filter{$0["kind"] as? String == "AVATAR"}
var items=records.filter{$0["kind"] as? String == "EQUIPMENT"}
// Composition simultanée : une seule coiffe, puis tous les autres emplacements.
let combined=items.filter{($0["manifest"] as! [String:Any])["slot"] as? String != "HEAD" || $0["key"] as? String == "PURSUIT_GOGGLES"}
items.append(["key":"ALL", "manifest":["layers":combined.flatMap{($0["manifest"] as! [String:Any])["layers"] as! [[String:Any]]}]])
let poses=["idle","attack","hit","critical","dodge","combo","replay"]
var images:[String:CGImage]=[:]
func load(_ path:String)->CGImage {
    if let value=images[path]{return value}
    let url=URL(fileURLWithPath:root+path).standardizedFileURL
    guard url.path.hasPrefix(root+"/"),let source=CGImageSourceCreateWithURL(url as CFURL,nil),
        let image=CGImageSourceCreateImageAtIndex(source,0,nil) else {fail("Image invalide : "+path)}
    images[path]=image;return image
}
func number(_ value:Any?)->Double { (value as! NSNumber).doubleValue }
let overview=context(1024,768)
overview.setFillColor(CGColor(red:0.02,green:0.03,blue:0.09,alpha:1));overview.fill(CGRect(x:0,y:0,width:1024,height:768))
for (index,avatar) in avatars.enumerated() {
    let manifest=avatar["manifest"] as! [String:Any]
    let urls=manifest["imageUrls"] as! [String:[String:String]]
    overview.draw(load(urls["back"]!["idle"]!),in:CGRect(x:index*256,y:512,width:256,height:256))
}
for item in items {
    let key=item["key"] as! String
    if CommandLine.arguments.count == 5 && CommandLine.arguments[4] != key {continue}
    let sheet=context(2048,1792),guardSheet=context(2048,256)
    guardSheet.setFillColor(CGColor(red:0.02,green:0.03,blue:0.09,alpha:1));guardSheet.fill(CGRect(x:0,y:0,width:2048,height:256))
    sheet.setFillColor(CGColor(red:0.02,green:0.03,blue:0.09,alpha:1));sheet.fill(CGRect(x:0,y:0,width:2048,height:1792))
    let manifest=item["manifest"] as! [String:Any],layers=manifest["layers"] as! [[String:Any]]
    for (avatarIndex,avatar) in avatars.enumerated() {for (viewIndex,view) in ["back","front"].enumerated() {
        let body=avatar["manifest"] as! [String:Any],urls=(body["imageUrls"] as! [String:Any])[view] as! [String:String]
        let attachments=(body["attachments"] as! [String:Any])[view] as! [String:Any]
        for (row,pose) in poses.enumerated() {
            let tile=context(256,256)
            func draw(_ layer:[String:Any]) {
                let series=attachments[layer["attachment"] as! String] as! [String:Any],point=(series[pose] ?? series["idle"]) as! [String:Any]
                let pivot=layer["pivot"] as! [String:Any]
                let px=view == "front" ? 1-number(pivot["x"]) : number(pivot["x"]),py=number(pivot["y"])
                let width=number(point["span"])*number(layer["scale"])*256,height=width/number(layer["aspectRatio"])
                let sources=layer["sourceUrls"] as! [String:String]
                tile.saveGState();tile.translateBy(x:number(point["x"])*256,y:(1-number(point["y"]))*256)
                tile.rotate(by:-number(point["rotate"])*Double.pi/180)
                tile.draw(load(sources[view]!),in:CGRect(x:-px*width,y:-(1-py)*height,width:width,height:height))
                tile.restoreGState()
            }
            for layer in layers where layer["plane"] as? String == "behind" {draw(layer)}
            tile.draw(load(urls[pose] ?? urls["idle"]!),in:CGRect(x:0,y:0,width:256,height:256))
            for layer in layers where layer["plane"] as? String == "front" {draw(layer)}
            if let foreground = body["foregroundUrls"] as? [String:[String:String]],let path=foreground[view]?[pose] {
                tile.draw(load(path),in:CGRect(x:0,y:0,width:256,height:256))
            }
            sheet.draw(tile.makeImage()!,in:CGRect(x:(avatarIndex*2+viewIndex)*256,y:(6-row)*256,width:256,height:256))
            if row == 0 {
                guardSheet.draw(tile.makeImage()!,in:CGRect(x:(avatarIndex*2+viewIndex)*256,y:0,width:256,height:256))
                if key == "ALL" {overview.draw(tile.makeImage()!,in:CGRect(x:avatarIndex*256,y:(1-viewIndex)*256,width:256,height:256))}
            }
        }
    }}
    let target=out.appendingPathComponent(key.lowercased()+".png")
    let writer=CGImageDestinationCreateWithURL(target as CFURL,UTType.png.identifier as CFString,1,nil)!
    CGImageDestinationAddImage(writer,sheet.makeImage()!,nil)
    guard CGImageDestinationFinalize(writer) else {fail("PNG incomplet")}
    let strip=out.appendingPathComponent(key.lowercased()+"-guards.png")
    let stripWriter=CGImageDestinationCreateWithURL(strip as CFURL,UTType.png.identifier as CFString,1,nil)!
    CGImageDestinationAddImage(stripWriter,guardSheet.makeImage()!,nil)
    guard CGImageDestinationFinalize(stripWriter) else {fail("PNG incomplet")}
    print(key+": 56 superpositions → "+target.path)
}
let overviewWriter=CGImageDestinationCreateWithURL(out.appendingPathComponent("overview.png") as CFURL,UTType.png.identifier as CFString,1,nil)!
CGImageDestinationAddImage(overviewWriter,overview.makeImage()!,nil)
guard CGImageDestinationFinalize(overviewWriter) else {fail("PNG incomplet")}
