#import "GrrindUnityHost.h"
#if GRRIND_HAS_UNITY
#import <UnityFramework/UnityFramework.h>
#import <mach-o/ldsyms.h>
static UnityFramework *runtime;
static BOOL sceneReady;
static __weak UIView *activeHost;
static UIView *captureHost;
static NSString *captureID;
static void (^captureCompletion)(NSString *, NSError *);
#endif

@implementation GrrindUnityHost
+ (BOOL)isSceneReady {
#if GRRIND_HAS_UNITY
  return sceneReady;
#else
  return NO;
#endif
}
+ (BOOL)isAvailable {
#if GRRIND_HAS_UNITY
  return [[NSFileManager defaultManager] fileExistsAtPath:[NSBundle.mainBundle.privateFrameworksPath stringByAppendingPathComponent:@"UnityFramework.framework"]];
#else
  return NO;
#endif
}
+ (BOOL)attachTo:(UIView *)view error:(NSError **)error {
  NSAssert(NSThread.isMainThread, @"Unity lifecycle must run on main");
#if GRRIND_HAS_UNITY
  if (captureHost && captureHost != view) [self finishCapture:nil message:@"Preview interrupted by fullscreen Unity"];
  if (!runtime) {
    [[NSNotificationCenter defaultCenter] addObserverForName:@"GrrindUnitySceneReady" object:nil queue:NSOperationQueue.mainQueue usingBlock:^(NSNotification *note) {
      sceneReady = YES;
      dispatch_async(dispatch_get_main_queue(), ^{
        runtime.appController.window.hidden = YES;
        [activeHost.window makeKeyAndVisible];
      });
    }];
    [[NSNotificationCenter defaultCenter] addObserverForName:UIApplicationWillResignActiveNotification object:nil queue:NSOperationQueue.mainQueue usingBlock:^(NSNotification *note) { [runtime pause:YES]; }];
    [[NSNotificationCenter defaultCenter] addObserverForName:UIApplicationDidBecomeActiveNotification object:nil queue:NSOperationQueue.mainQueue usingBlock:^(NSNotification *note) { if (activeHost.window) [runtime pause:NO]; }];
    NSString *path = [NSBundle.mainBundle.privateFrameworksPath stringByAppendingPathComponent:@"UnityFramework.framework"];
    NSBundle *bundle = [NSBundle bundleWithPath:path];
    if (![bundle loadAndReturnError:error]) return NO;
    runtime = [bundle.principalClass getInstance];
#ifdef DEBUG
    [runtime setExecuteHeader:&_mh_dylib_header];
#else
    [runtime setExecuteHeader:&_mh_execute_header];
#endif
    [runtime setDataBundleId:"com.unity3d.framework"];
    NSArray<NSString *> *arguments = NSProcessInfo.processInfo.arguments;
    char **argv = (char **)calloc(arguments.count + 1, sizeof(char *));
    for (NSUInteger i = 0; i < arguments.count; i++) argv[i] = strdup(arguments[i].UTF8String);
    // Unity can retain argv during startup; keep the process-sized allocation alive.
    UIWindow *hostWindow = view.window;
    [runtime runEmbeddedWithArgc:(int)arguments.count argv:argv appLaunchOpts:nil];
    runtime.appController.window.hidden = YES;
    [hostWindow makeKeyAndVisible];
  }
  UIView *unityView = runtime.appController.rootView;
  activeHost = view;
  unityView.frame = view.bounds;
  unityView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
  [view addSubview:unityView];
  [runtime pause:NO];
  return YES;
#else
  if (error) *error = [NSError errorWithDomain:@"GRRIND.Unity" code:1 userInfo:@{NSLocalizedDescriptionKey: @"UnityFramework absent. Run the local Unity iOS export and rebuild the development app."}];
  return NO;
#endif
}
+ (void)detachFrom:(UIView *)view {
#if GRRIND_HAS_UNITY
  if (runtime.appController.rootView.superview == view) {
    [runtime pause:YES];
    [runtime.appController.rootView removeFromSuperview];
    activeHost = nil;
  }
#endif
}
+ (void)send:(NSString *)method payload:(NSString *)payload {
#if GRRIND_HAS_UNITY
  if (runtime.appController) [runtime sendMessageToGOWithName:"BattleBridge" functionName:method.UTF8String message:payload.UTF8String];
#endif
}
+ (void)captureAvatar:(NSString *)configuration completion:(void (^)(NSString *, NSError *))completion {
#if GRRIND_HAS_UNITY
  if (activeHost || captureHost) {
    completion(nil, [NSError errorWithDomain:@"GRRIND.Unity" code:2 userInfo:@{NSLocalizedDescriptionKey: @"Unity is busy"}]);
    return;
  }
  UIWindow *window = nil;
  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if (scene.activationState != UISceneActivationStateForegroundActive || ![scene isKindOfClass:UIWindowScene.class]) continue;
    for (UIWindow *candidate in ((UIWindowScene *)scene).windows) if (candidate.isKeyWindow) window = candidate;
  }
  if (!window) { completion(nil, [NSError errorWithDomain:@"GRRIND.Unity" code:3 userInfo:nil]); return; }
  captureID = NSUUID.UUID.UUIDString;
  NSString *requestID = captureID;
  NSMutableDictionary *config = [[NSJSONSerialization JSONObjectWithData:[configuration dataUsingEncoding:NSUTF8StringEncoding] options:0 error:NULL] mutableCopy];
  config[@"previewId"] = requestID;
  NSString *payload = [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:config options:0 error:NULL] encoding:NSUTF8StringEncoding];
  // Unity always owns a fullscreen surface. Small cards receive an offscreen render only.
  captureHost = [[UIView alloc] initWithFrame:window.bounds];
  captureHost.userInteractionEnabled = NO;
  [window insertSubview:captureHost atIndex:0];
  __block id readyObserver = nil;
  __block id imageObserver = nil;
  void (^start)(void) = ^{ if ([captureID isEqual:requestID]) [self send:@"CaptureAvatar" payload:payload]; };
  readyObserver = [NSNotificationCenter.defaultCenter addObserverForName:@"GrrindUnitySceneReady" object:nil queue:NSOperationQueue.mainQueue usingBlock:^(NSNotification *note) { start(); }];
  imageObserver = [NSNotificationCenter.defaultCenter addObserverForName:@"GrrindUnityAvatarCaptured" object:nil queue:NSOperationQueue.mainQueue usingBlock:^(NSNotification *note) {
    if ([note.userInfo[@"id"] isEqual:requestID] && [captureID isEqual:requestID])
      [self finishCapture:note.userInfo[@"image"] message:note.userInfo[@"error"]];
  }];
  captureCompletion = ^(NSString *image, NSError *error) {
    [NSNotificationCenter.defaultCenter removeObserver:readyObserver];
    [NSNotificationCenter.defaultCenter removeObserver:imageObserver];
    completion(image, error);
  };
  NSError *error = nil;
  if (![self attachTo:captureHost error:&error]) { [self finishCapture:nil message:error.localizedDescription]; return; }
  if (sceneReady) start();
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 15 * NSEC_PER_SEC), dispatch_get_main_queue(), ^{
    if ([captureID isEqual:requestID]) [self finishCapture:nil message:@"Avatar preview timed out"];
  });
#else
  completion(nil, [NSError errorWithDomain:@"GRRIND.Unity" code:1 userInfo:nil]);
#endif
}
#if GRRIND_HAS_UNITY
+ (void)finishCapture:(NSString *)image message:(NSString *)message {
  [self send:@"CancelPreview" payload:@""];
  [self detachFrom:captureHost];
  [captureHost removeFromSuperview];
  captureHost = nil; captureID = nil;
  void (^done)(NSString *, NSError *) = captureCompletion;
  captureCompletion = nil;
  NSError *error = image.length ? nil : [NSError errorWithDomain:@"GRRIND.Unity" code:4 userInfo:@{NSLocalizedDescriptionKey: message ?: @"Avatar preview unavailable"}];
  if (done) done(image, error);
}
#endif
@end
