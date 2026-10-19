#import <UIKit/UIKit.h>

@interface GrrindUnityHost : NSObject
+ (BOOL)isAvailable;
+ (BOOL)isSceneReady;
+ (BOOL)attachTo:(UIView *)view error:(NSError **)error;
+ (void)detachFrom:(UIView *)view;
+ (void)send:(NSString *)method payload:(NSString *)payload;
@end
