#import <Foundation/Foundation.h>
extern "C" void GrrindUnitySceneReady() {
    [[NSNotificationCenter defaultCenter] postNotificationName:@"GrrindUnitySceneReady" object:nil];
}
