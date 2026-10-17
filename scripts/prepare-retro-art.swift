// Export mécanique : alpha binaire, grille 256, miroir et PNG à l’échelle entière.
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let poses = ["idle", "attack", "hit", "critical", "dodge", "combo", "replay"]
func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data((message + "\n").utf8)); exit(1)
}
func context(_ width: Int, _ height: Int) -> CGContext {
    guard let value = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8,
        bytesPerRow: width * 4, space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { fail("Contexte RGBA indisponible") }
    value.interpolationQuality = .none
    return value
}
func load(_ path: String) -> CGImage {
    guard let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { fail("Image absente : " + path) }
    return image
}
func pixels(_ image: CGImage) -> CGContext {
    let canvas = context(image.width, image.height)
    canvas.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))
    return canvas
}
func bounds(_ image: CGImage) -> CGRect {
    let canvas = pixels(image), data = canvas.data!.assumingMemoryBound(to: UInt8.self)
    var left=image.width, top=image.height, right = -1, bottom = -1, clear=0
    for y in 0..<image.height { for x in 0..<image.width {
        let alpha=data[(y*image.width+x)*4+3]
        if alpha == 0 { clear += 1 }
        if alpha >= 220 { left=min(left,x); right=max(right,x); top=min(top,y); bottom=max(bottom,y) }
    }}
    guard clear > 0, right >= left else { fail("Alpha réel et sujet opaque requis") }
    return CGRect(x:left,y:top,width:right-left+1,height:bottom-top+1)
}
func hardAlpha(_ canvas: CGContext) -> CGImage {
    let data=canvas.data!.assumingMemoryBound(to:UInt8.self)
    for index in 0..<(canvas.width*canvas.height) {
        let offset=index*4, alpha=Int(data[offset+3])
        if alpha < 220 {
            data[offset]=0; data[offset+1]=0; data[offset+2]=0; data[offset+3]=0
        } else {
            for channel in 0..<3 { data[offset+channel]=UInt8(min(255,Int(data[offset+channel])*255/alpha)) }
            data[offset+3]=255
        }
    }
    return canvas.makeImage()!
}
func mirror(_ image: CGImage) -> CGImage {
    let canvas=context(image.width,image.height)
    canvas.translateBy(x:CGFloat(image.width),y:0); canvas.scaleBy(x:-1,y:1)
    canvas.draw(image,in:CGRect(x:0,y:0,width:image.width,height:image.height))
    return canvas.makeImage()!
}
func save(_ image: CGImage, _ path: String, scale: Int = 1) {
    let target=URL(fileURLWithPath:path)
    try! FileManager.default.createDirectory(at:target.deletingLastPathComponent(),withIntermediateDirectories:true)
    let canvas=context(image.width*scale,image.height*scale)
    canvas.draw(image,in:CGRect(x:0,y:0,width:canvas.width,height:canvas.height))
    guard let writer=CGImageDestinationCreateWithURL(target as CFURL,UTType.png.identifier as CFString,1,nil) else { fail("Écriture impossible") }
    CGImageDestinationAddImage(writer,canvas.makeImage()!,nil)
    guard CGImageDestinationFinalize(writer) else { fail("PNG incomplet") }
}
guard CommandLine.arguments.count == 4 else {
    fail("Usage : swift scripts/prepare-retro-art.swift avatar|guard|item SOURCE DESTINATION")
}
let mode=CommandLine.arguments[1], input=CommandLine.arguments[2], output=CommandLine.arguments[3]
guard URL(fileURLWithPath:input).standardizedFileURL != URL(fileURLWithPath:output).standardizedFileURL else { fail("Conserver les sources") }
if mode == "avatar" || mode == "guard" {
    // Le mode guard reste disponible pour les archives ; avatar exporte les sept dessins.
    let exportedPoses = mode == "guard" ? ["idle"] : poses
    let images=exportedPoses.map { load(mode == "guard" ? input : input+"/"+$0+".png") }
    guard images.allSatisfy({ $0.width == $0.height }) else { fail("Chaque source doit avoir un canevas carré") }
    let boxes=images.map(bounds), size=256.0, baseline=233.0
    // Hauteurs explicites : une esquive accroupie ne doit pas être agrandie comme une garde.
    let calibrationURL=URL(fileURLWithPath:input+"/normalization.json")
    let heights=(try? Data(contentsOf:calibrationURL)).flatMap {try? JSONSerialization.jsonObject(with:$0) as? [String:Double]} ?? [:]
    var layout:[String:[String:Double]]=[:]
    for (index,pose) in exportedPoses.enumerated() {
        let height=heights[pose] ?? 225
        guard height>=100 && height<=225 else {fail("Hauteur de pose invalide")}
        let scale=min(size/Double(images[index].width),240.0/boxes[index].width,height/boxes[index].height)
        let horizontal=(size-Double(images[index].width)*scale)/2
        let top=baseline+1-boxes[index].maxY*scale
        let canvas=context(256,256)
        canvas.draw(images[index],in:CGRect(x:horizontal,y:size-top-Double(images[index].height)*scale,
            width:Double(images[index].width)*scale,height:Double(images[index].height)*scale))
        let back=hardAlpha(canvas), front=mirror(back), box=bounds(back)
        guard box.minX>=1,box.maxX<256,box.minY>=1,abs(box.maxY-234)<=2 else { fail("Cadrage invalide : "+pose) }
        save(back,output+"/back/"+pose+".png",scale:2);save(front,output+"/front/"+pose+".png",scale:2)
        save(back,output+"/thumb/back/"+pose+".png");save(front,output+"/thumb/front/"+pose+".png")
        layout[pose]=["scale":scale*Double(images[index].width)/size,"x":horizontal/size,"y":top/size]
    }
    let json=try! JSONSerialization.data(withJSONObject:layout,options:[.prettyPrinted,.sortedKeys])
    try! json.write(to:URL(fileURLWithPath:output+"/layout.json"))
    print("\(exportedPoses.count) pose(s), 2 orientations, PNG 512 et miniatures 256 : "+output)
} else if mode == "item" {
    let image=load(input),box=bounds(image)
    let maxSide=128.0,scale=min(1,maxSide/max(box.width,box.height))
    let width=max(1,Int(ceil(box.width*scale))),height=max(1,Int(ceil(box.height*scale)))
    let canvas=context(width,height)
    canvas.draw(image,in:CGRect(x:-box.minX*scale,y:Double(height)-(Double(image.height)-box.minY)*scale,
        width:Double(image.width)*scale,height:Double(image.height)*scale))
    let back=hardAlpha(canvas),front=mirror(back)
    save(back,output+"/back.png",scale:2);save(front,output+"/front.png",scale:2);save(back,output+"/icon.png",scale:2)
    print("\(width*2)x\(height*2), ratio \(Double(width)/Double(height)) : "+output)
} else { fail("Mode inconnu") }
