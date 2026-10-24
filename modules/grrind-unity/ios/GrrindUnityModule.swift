import ExpoModulesCore

public class GrrindUnityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("GrrindUnity")
    Function("isAvailable") { GrrindUnityHost.isAvailable() }
    AsyncFunction("setFrame") { (frame: String) in
      GrrindUnityHost.send("Present", payload: frame)
    }.runOnQueue(.main)
    AsyncFunction("captureAvatar") { (configuration: String, promise: Promise) in
      GrrindUnityHost.captureAvatar(configuration) { image, error in
        if let image { promise.resolve(image) }
        else { promise.reject("AVATAR_PREVIEW", error?.localizedDescription ?? "Avatar preview unavailable") }
      }
    }.runOnQueue(.main)
    View(GrrindUnityView.self) {
      Events("onReady", "onFailure")
      Prop("configuration") { (view: GrrindUnityView, configuration: String) in
        view.configuration = configuration
      }
    }
  }
}

final class GrrindUnityView: ExpoView {
  let onReady = EventDispatcher()
  let onFailure = EventDispatcher()
  private var attached = false
  private var observer: NSObjectProtocol?
  var configuration = "{}" {
    didSet { if attached && GrrindUnityHost.isSceneReady() { GrrindUnityHost.send("Configure", payload: configuration) } }
  }
  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil {
      if attached { GrrindUnityHost.detach(from: self); attached = false }
      if let observer { NotificationCenter.default.removeObserver(observer); self.observer = nil }
      return
    }
    guard !attached else { return }
    observer = NotificationCenter.default.addObserver(forName: Notification.Name("GrrindUnitySceneReady"), object: nil, queue: .main) { [weak self] _ in
      self?.ready()
    }
    do {
      try GrrindUnityHost.attach(to: self)
      attached = true
      if GrrindUnityHost.isSceneReady() { ready() }
    } catch {
      NSLog("GRRIND Unity attach failed: %@", error.localizedDescription)
      onFailure(["message": error.localizedDescription])
    }
  }
  private func ready() {
    guard attached else { return }
    GrrindUnityHost.send("Configure", payload: configuration)
    onReady([:])
  }
  deinit { if let observer { NotificationCenter.default.removeObserver(observer) } }
}
