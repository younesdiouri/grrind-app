#!/bin/sh
set -eu

# Sources and scenes are versioned. Exported IL2CPP projects/frameworks stay local.
unity_cli="${UNITY_CLI:-$HOME/.unity/bin/unity}"
project="$(pwd)/spikes/Unity3D"
output="$(pwd)/artifacts/unity-spike"
frameworks="${UNITY_FRAMEWORKS_DIR:-$(pwd)/modules/grrind-unity/ios/Frameworks}"
mkdir -p "$output"
# UNITY_IOS_TARGETS=Device halves the build and skips ~4.5 GB of Simulator intermediates.
# The Simulator slice of the current framework is then reused as is: Maestro sees the old scene.
targets="${UNITY_IOS_TARGETS:-Simulator Device}"
for target in $targets; do
  "$unity_cli" build "$project" --target iOS --execute-method "MobileBuild.$target" \
    --timeout 900 --json >"$output/export-$target.log" 2>&1 || {
      tail -50 "$output/export-$target.log"; exit 1;
    }
  if [ "$target" = Simulator ]; then
    sdk=iphonesimulator
    destination='generic/platform=iOS Simulator'
  else
    sdk=iphoneos
    destination='generic/platform=iOS'
  fi
  xcodebuild -project "$project/Builds/iOS$target/Unity-iPhone.xcodeproj" \
    -scheme UnityFramework -configuration Release -sdk "$sdk" -destination "$destination" \
    -derivedDataPath "$project/Builds/DerivedData$target" \
    CODE_SIGNING_ALLOWED=NO BUILD_LIBRARY_FOR_DISTRIBUTION=YES SKIP_INSTALL=NO \
    build >"$output/framework-$target.log" 2>&1 || {
      tail -70 "$output/framework-$target.log"; exit 1;
    }
done
simulator="$project/Builds/DerivedDataSimulator/Build/Products/Release-iphonesimulator/UnityFramework.framework"
case " $targets " in
  *" Simulator "*) ;;
  *) simulator="$output/simulator/UnityFramework.framework"
     rm -rf "$simulator"; mkdir -p "$output/simulator"
     cp -R "$frameworks/UnityFramework.xcframework/ios-arm64-simulator/UnityFramework.framework" "$simulator" || {
       echo 'No Simulator slice to reuse: run once without UNITY_IOS_TARGETS.'; exit 1;
     } ;;
esac
mkdir -p "$frameworks"
staged="$frameworks/UnityFramework.next.xcframework"
rm -rf "$staged"
# Keep the working framework until its replacement has compiled successfully.
if ! xcodebuild -create-xcframework \
  -framework "$simulator" \
  -framework "$project/Builds/DerivedDataDevice/Build/Products/Release-iphoneos/UnityFramework.framework" \
  -output "$staged"; then
  rm -rf "$staged"
  exit 1
fi
rm -rf "$frameworks/UnityFramework.xcframework"
mv "$staged" "$frameworks/UnityFramework.xcframework"
printf '%s\n' 'Unity iOS framework ready for the shared development build.'
