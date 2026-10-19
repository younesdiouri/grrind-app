using System;
using System.IO;
using System.Threading.Tasks;
using UnityEditor;
using UnityEngine;

// Editor-only evidence from the actual prefab, rig, clip sampler and equipment roots.
public static class ReviewAvatars
{
    static int index,wait,lastFrame;
    static bool sweep;
    static BattleBridge bridge;
    static string folder;
    public static async Task<string> VerifyPlacement()
    {
        if(!Application.isPlaying)throw new Exception("Enter Play in Arena first.");
        Application.runInBackground=true;
        var arena=UnityEngine.Object.FindFirstObjectByType<BattleBridge>();
        arena.Configure(JsonUtility.ToJson(new BattleBridge.Configuration{
            player=new BattleBridge.AvatarConfig{weapon=true,glasses=true},
            enemy=new BattleBridge.AvatarConfig{body="female",weapon=true,glasses=true}
        }));
        arena.Present(JsonUtility.ToJson(new BattleBridge.Frame{
            player=new BattleBridge.ActorFrame{phase=.5f},enemy=new BattleBridge.ActorFrame{phase=.5f}
        }));
        await Frames();
        var actors=UnityEngine.Object.FindObjectsByType<MuscuPose>(FindObjectsSortMode.None);
        if(actors.Length!=2)throw new Exception("Expected both avatar bodies in the arena.");
        foreach(var pose in actors)
        {
            var head=pose.actor.GetBoneTransform(HumanBodyBones.Head);
            var hand=pose.actor.GetBoneTransform(HumanBodyBones.RightHand);
            var beforeHead=pose.actor.transform.InverseTransformPoint(head.position);
            var beforeHand=pose.actor.transform.InverseTransformPoint(hand.position);
            pose.facing+=60;pose.placement+=Vector3.right*.3f;
            await Frames();
            if(Vector3.Distance(beforeHead,pose.actor.transform.InverseTransformPoint(head.position))>.005f||
               Vector3.Distance(beforeHand,pose.actor.transform.InverseTransformPoint(hand.position))>.005f)
                throw new Exception("Head/hand pose compensated the arena rotation or placement: "+pose.name);
        }
        return "Both equipped bodies preserve their head and hand pose after a 60-degree turn and 30-cm translation.";
    }
    static async Task Frames()
    {
        int target=Time.frameCount+4;float deadline=Time.realtimeSinceStartup+10;
        while(Time.frameCount<target){if(Time.realtimeSinceStartup>deadline)throw new Exception("Game frames did not advance.");await Task.Yield();}
    }
    public static string Capture()
    {sweep=false;return Begin();}
    public static string Sweep()
    {sweep=true;return Begin();}
    static string Begin()
    {
        if(!Application.isPlaying)throw new Exception("Enter Play in Arena first.");
        bridge=UnityEngine.Object.FindFirstObjectByType<BattleBridge>();
        if(bridge==null)throw new Exception("Arena bridge missing.");
        Application.runInBackground=true;
        folder=Path.GetFullPath("../../artifacts/unity-spike/"+(sweep?"sweep":"review"));Directory.CreateDirectory(folder);
        index=0;wait=0;EditorApplication.update-=Tick;EditorApplication.update+=Tick;
        return "Capturing 84 full-body, face and grip views for both bodies / seven poses / two orientations.";
    }
    static void Tick()
    {
        try
        {
            if(index>=(sweep?35:84)){EditorApplication.update-=Tick;File.WriteAllText(Path.Combine(folder,"complete.txt"),DateTime.UtcNow.ToString("O"));return;}
            int body=sweep?0:index/42,pose=sweep?index/5:index/6%7,view=sweep?0:index/2%3,side=sweep?0:index%2;
            if(wait==0)
            {
                bridge.Configure(JsonUtility.ToJson(new BattleBridge.Configuration{
                    player=new BattleBridge.AvatarConfig{body=body==0?"male":"female",weapon=true,glasses=true},
                    enemy=new BattleBridge.AvatarConfig{visible=false},inspection=true,view=view,azimuth=side==0?32:-32
                }));
                bridge.Present(JsonUtility.ToJson(new BattleBridge.Frame{
                    player=new BattleBridge.ActorFrame{pose=pose,phase=sweep?new[]{.05f,.15f,.30f,.5f,.75f}[index%5]:.5f},enemy=new BattleBridge.ActorFrame{visible=false}
                }));wait=1;lastFrame=Time.frameCount;return;
            }
            if(lastFrame==Time.frameCount)return;lastFrame=Time.frameCount;
            if(wait++<4)return;
            var camera=bridge.arenaCamera;
            var rt=new RenderTexture(480,600,24);var previous=RenderTexture.active;var target=camera.targetTexture;
            var pixels=new Texture2D(480,600,TextureFormat.RGB24,false);
            try
            {
                camera.targetTexture=rt;camera.Render();RenderTexture.active=rt;
                pixels.ReadPixels(new Rect(0,0,480,600),0,0);pixels.Apply();
                File.WriteAllBytes(Path.Combine(folder,sweep?$"{pose}-{index%5}.png":$"{body}-{pose}-{view}-{side}.png"),pixels.EncodeToPNG());
            }
            finally{camera.targetTexture=target;RenderTexture.active=previous;UnityEngine.Object.DestroyImmediate(pixels);rt.Release();UnityEngine.Object.DestroyImmediate(rt);}
            index++;wait=0;
        }
        catch(Exception e){EditorApplication.update-=Tick;Debug.LogException(e);}
    }
}
