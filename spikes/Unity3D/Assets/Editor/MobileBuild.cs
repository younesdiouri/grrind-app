using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.iOS.Xcode;
using UnityEngine;

public static class MobileBuild
{
    public static void Simulator()=>Export(true);
    public static void Device()=>Export(false);
    static void Export(bool simulator)
    {
        PlayerSettings.companyName="GRRIND";PlayerSettings.productName="GRRIND Combat";
        PlayerSettings.SetApplicationIdentifier(UnityEditor.Build.NamedBuildTarget.iOS,"app.grrind.unity");
        PlayerSettings.iOS.targetOSVersionString="16.4";
        PlayerSettings.iOS.sdkVersion=simulator?iOSSdkVersion.SimulatorSDK:iOSSdkVersion.DeviceSDK;
        PlayerSettings.iOS.simulatorSdkArchitecture=AppleMobileArchitectureSimulator.ARM64;
        PlayerSettings.defaultInterfaceOrientation=UIOrientation.LandscapeLeft;
        PlayerSettings.runInBackground=false;
        var path="Builds/"+(simulator?"iOSSimulator":"iOSDevice");
        var result=BuildPipeline.BuildPlayer(new BuildPlayerOptions{
            scenes=new[]{"Assets/Spike/Arena.unity"},target=BuildTarget.iOS,locationPathName=path,
            // Recreate the generated project: append retained a stale Burst source reference.
            // All framework changes are applied below, and Xcode DerivedData remains reusable.
            options=BuildOptions.None
        });
        if(result.summary.result!=BuildResult.Succeeded)throw new Exception("Unity iOS export failed: "+result.summary.result);
        var projectPath=PBXProject.GetPBXProjectPath(path);var project=new PBXProject();project.ReadFromFile(projectPath);
        var framework=project.GetUnityFrameworkTargetGuid();
        var data=project.FindFileGuidByProjectPath("Data");
        project.AddFileToBuild(framework,data);
        project.SetBuildProperty(framework,"SKIP_INSTALL","NO");
        project.SetBuildProperty(framework,"BUILD_LIBRARY_FOR_DISTRIBUTION","YES");
        project.SetBuildProperty(framework,"IPHONEOS_DEPLOYMENT_TARGET","16.4");
        project.WriteToFile(projectPath);
        File.WriteAllText(Path.Combine(path,"grrind-export.json"),JsonUtility.ToJson(new ExportProof{platform=simulator?"simulator-arm64":"iphone-arm64",bytes=result.summary.totalSize}));
    }
    [Serializable] class ExportProof {public string platform;public ulong bytes;}
}
