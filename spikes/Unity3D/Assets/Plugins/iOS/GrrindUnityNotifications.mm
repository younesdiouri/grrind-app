#import <Foundation/Foundation.h>
extern "C" void GrrindUnitySceneReady() {
    [[NSNotificationCenter defaultCenter] postNotificationName:@"GrrindUnitySceneReady" object:nil];
}
extern "C" void GrrindUnityAvatarCaptured(const char *json) {
    NSString *payload = [NSString stringWithUTF8String:json];
    NSDictionary *result = [NSJSONSerialization JSONObjectWithData:[payload dataUsingEncoding:NSUTF8StringEncoding] options:0 error:NULL];
    dispatch_async(dispatch_get_main_queue(), ^{
        [[NSNotificationCenter defaultCenter] postNotificationName:@"GrrindUnityAvatarCaptured" object:nil userInfo:result];
    });
}
