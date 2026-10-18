import ExpoModulesCore

public class GrrindUnityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("GrrindUnity")
    Function("isAvailable") { GrrindUnityHost.isAvailable() }
    AsyncFunction("setFrame") { (frame: String) in
      GrrindUnityHost.send("Present", payload: frame)
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
