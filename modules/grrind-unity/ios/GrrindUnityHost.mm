#import "GrrindUnityHost.h"
#if GRRIND_HAS_UNITY
#import <UnityFramework/UnityFramework.h>
#import <mach-o/ldsyms.h>
static UnityFramework *runtime;
static BOOL sceneReady;
static __weak UIView *activeHost;
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
@end
