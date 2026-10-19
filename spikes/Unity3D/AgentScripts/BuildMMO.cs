using System;
using System.Linq;
using System.IO;
using System.Threading.Tasks;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class BuildMMO
{
    const string Folder="Assets/Spike/MMOAthlete";
    const string Source="Assets/Characters/MMOAthlete";
    static Material Material(string name,Color color,Texture texture=null)
    {
        string path=Folder+"/"+name+".mat";
        var mat=AssetDatabase.LoadAssetAtPath<Material>(path);
        var shader=Shader.Find("GRRIND/Painted Toon");
        if(mat==null){mat=new Material(shader);AssetDatabase.CreateAsset(mat,path);}
        mat.shader=shader;
        mat.SetColor("_BaseColor",color);
        mat.SetTexture("_BaseMap",texture);
        EditorUtility.SetDirty(mat);return mat;
    }
    public static string Create()
    {
        if(Application.isPlaying)throw new Exception("Stop Play before rebuilding candidate.");
        if(!AssetDatabase.IsValidFolder(Folder))AssetDatabase.CreateFolder("Assets/Spike","MMOAthlete");
        var actor=UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(Source+"/Athlete.fbx"));actor.name="MMO athlete";
        var animator=actor.GetComponent<Animator>();
        if(!animator.isHuman||!animator.avatar.isValid)throw new Exception("Invalid Humanoid");
        var texture=AssetDatabase.LoadAssetAtPath<Texture2D>(Source+"/athlete-basecolor.png")??AssetDatabase.LoadAssetAtPath<Texture2D>(Source+"/athlete-basecolor.jpg");
        var body=Material("Painted body",Color.white,texture);
        var skin=Material("Hands",Color.white,texture);
        foreach(var renderer in actor.GetComponentsInChildren<SkinnedMeshRenderer>())
        {renderer.sharedMaterials=new[]{body,skin};renderer.updateWhenOffscreen=true;}
        var original=AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Spike/Muscu/Avatar.prefab").GetComponent<MuscuPose>();
        var pose=actor.AddComponent<MuscuPose>();pose.actor=animator;pose.clips=original.clips;
        SplitFeet(actor.GetComponentInChildren<SkinnedMeshRenderer>(),pose);
        pose.shoes=new[]{HumanBodyBones.LeftFoot,HumanBodyBones.RightFoot}.Select((bone,i)=>{
            var foot=animator.GetBoneTransform(bone);var shoe=Gear("SprintSemelle"+(i==0?"Left":"Right"),foot);
            shoe.SetPositionAndRotation(foot.position,Quaternion.Euler(0,180,0)*Quaternion.Euler(-90,0,0));
            shoe.localScale=Vector3.one*100/foot.lossyScale.x;
            SkinShoe(shoe,foot,animator.GetBoneTransform(i==0?HumanBodyBones.LeftLowerLeg:HumanBodyBones.RightLowerLeg));return shoe;
        }).ToArray();pose.SetShoes(false);
        var head=animator.GetBoneTransform(HumanBodyBones.Head);
        pose.glasses=Gear("CoursePoursuite",head);
        pose.glasses.SetPositionAndRotation(new Vector3(0,1.398f,-.140f),Quaternion.Euler(0,180,0)*Quaternion.Euler(-90,0,0));
        pose.glasses.localScale=Vector3.one*100/head.lossyScale.x;
        var hand=animator.GetBoneTransform(HumanBodyBones.RightHand);
        pose.weapon=Gear("HaltereEgo",hand);
        var index=animator.GetBoneTransform(HumanBodyBones.RightIndexProximal).position;
        var little=animator.GetBoneTransform(HumanBodyBones.RightLittleProximal).position;
        var centre=Vector3.Lerp(hand.position,(index+little)*.5f,.85f)-hand.forward*.020f;
        pose.weapon.SetPositionAndRotation(centre,Quaternion.FromToRotation(Vector3.right,(index-little).normalized)*Quaternion.Euler(-90,0,0));
        pose.weapon.localScale=Vector3.one*100/hand.lossyScale.x;
        // Calibrated from the four closed finger arcs on this rig; one socket for every gesture.
        pose.weapon.localPosition=new Vector3(-.00024193f,.00085120f,-.00002653f);
        pose.weapon.gameObject.SetActive(false);pose.glasses.gameObject.SetActive(false);
        pose.gripCurl=-.93f;pose.thumbBase=-.45f;pose.thumbSpread=-.7f;pose.headViewOffset=.19f;pose.headViewSize=.29f;pose.inspect=false;pose.debugControls=false;
        var prefab=PrefabUtility.SaveAsPrefabAsset(actor,Folder+"/Avatar.prefab");UnityEngine.Object.DestroyImmediate(actor);
        EditorSceneManager.OpenScene("Assets/Spike/Arena.unity",OpenSceneMode.Single);
        var bridge=UnityEngine.Object.FindFirstObjectByType<BattleBridge>();bridge.malePrefab=prefab;bridge.femalePrefab=prefab;
        EditorSceneManager.SaveScene(bridge.gameObject.scene,Folder+"/Candidate.unity");AssetDatabase.SaveAssets();
        return "Candidate saved, pending movement/contact QA.";
    }
    static Mesh Store(string name,Mesh mesh)
    {
        // Recreate native mesh buffers when topology/vertex layout changes between exports.
        var path=Folder+"/"+name+".asset";AssetDatabase.CreateAsset(mesh,path);return mesh;
    }
    static void SplitFeet(SkinnedMeshRenderer renderer,MuscuPose pose)
    {
        var source=renderer.sharedMesh;var positions=source.vertices;
        var feet=new System.Collections.Generic.List<int>();var body=new System.Collections.Generic.List<int>();
        var indices=source.GetTriangles(0);
        for(int i=0;i<indices.Length;i+=3)
        {
            float height=0;for(int j=0;j<3;j++)height+=renderer.transform.TransformPoint(positions[indices[i+j]]).y/3;
            var target=height<.145f?feet:body;target.AddRange(new[]{indices[i],indices[i+1],indices[i+2]});
        }
        if(feet.Count==0||body.Count==0)throw new Exception("Cannot separate the bare feet");
        var main=UnityEngine.Object.Instantiate(source);main.SetTriangles(body,0);renderer.sharedMesh=Store("Body",main);
        var mesh=UnityEngine.Object.Instantiate(source);mesh.subMeshCount=1;mesh.SetTriangles(feet,0);
        var obj=new GameObject("Bare feet",typeof(SkinnedMeshRenderer));obj.transform.SetParent(renderer.transform,false);
        var r=obj.GetComponent<SkinnedMeshRenderer>();r.sharedMesh=Store("BareFeet",mesh);r.sharedMaterial=renderer.sharedMaterials[0];r.bones=renderer.bones;r.rootBone=renderer.rootBone;r.updateWhenOffscreen=true;
        pose.bareFeet=obj;
    }
    static void SkinShoe(Transform shoe,Transform foot,Transform calf)
    {
        int index=0;
        foreach(var filter in shoe.GetComponentsInChildren<MeshFilter>())
        {
            var mesh=UnityEngine.Object.Instantiate(filter.sharedMesh);var vertices=mesh.vertices;
            mesh.bindposes=new[]{foot.worldToLocalMatrix*filter.transform.localToWorldMatrix,calf.worldToLocalMatrix*filter.transform.localToWorldMatrix};
            mesh.boneWeights=vertices.Select(v=>{
                float calfWeight=Mathf.InverseLerp(.11f,.155f,filter.transform.TransformPoint(v).y);
                return new BoneWeight{boneIndex0=0,weight0=1-calfWeight,boneIndex1=1,weight1=calfWeight};
            }).ToArray();
            var rigid=filter.GetComponent<MeshRenderer>();var materials=rigid.sharedMaterials;
            var obj=filter.gameObject;UnityEngine.Object.DestroyImmediate(rigid);UnityEngine.Object.DestroyImmediate(filter);
            var skin=obj.AddComponent<SkinnedMeshRenderer>();skin.sharedMesh=Store(shoe.name+"-"+index++,mesh);skin.sharedMaterials=materials;skin.bones=new[]{foot,calf};skin.rootBone=foot;skin.updateWhenOffscreen=true;
        }
    }
    static Transform Gear(string name,Transform parent)
    {
        var root=UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(Source+"/Gear/"+name+".fbx"),parent,false).transform;
        // Imported FBX roots express metres; bone transforms may include FBX conversion scale.
        root.localScale=Vector3.one/parent.lossyScale.x;
        foreach(var renderer in root.GetComponentsInChildren<MeshRenderer>())
        {
            var imported=renderer.sharedMaterial;var color=imported!=null?imported.color:Color.white;
            var mat=Material("Gear-"+(imported!=null?imported.name:"Default"),color);
            if(imported!=null&&imported.name.Contains("Amber"))
            {
                mat.shader=Shader.Find("Universal Render Pipeline/Lit");
                mat.SetFloat("_Smoothness",.6f);
                color.a=.24f;mat.SetColor("_BaseColor",color);mat.SetFloat("_Surface",1);mat.SetFloat("_SrcBlend",5);mat.SetFloat("_DstBlend",10);mat.SetFloat("_ZWrite",0);mat.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");mat.renderQueue=3000;EditorUtility.SetDirty(mat);
            }
            renderer.sharedMaterial=mat;
        }
        return root;
    }
    public static async Task<string> Capture(string name,int stance=0,int view=0,bool equipment=true,float azimuth=32,float phase=.5f)
    {
        if(!Application.isPlaying)throw new Exception("Enter Play first");
        Application.runInBackground=true;
        var bridge=UnityEngine.Object.FindFirstObjectByType<BattleBridge>();
        bridge.Configure(JsonUtility.ToJson(new BattleBridge.Configuration{player=new BattleBridge.AvatarConfig{weapon=equipment,glasses=equipment,boots=equipment},enemy=new BattleBridge.AvatarConfig{visible=false},inspection=true,view=view,azimuth=azimuth}));
        bridge.Present(JsonUtility.ToJson(new BattleBridge.Frame{player=new BattleBridge.ActorFrame{pose=stance,phase=phase},enemy=new BattleBridge.ActorFrame{visible=false}}));
        int target=Time.frameCount+4;float deadline=Time.realtimeSinceStartup+10;
        while(Time.frameCount<target){if(Time.realtimeSinceStartup>deadline)throw new Exception("Frames stalled");await Task.Yield();}
        var camera=bridge.arenaCamera;var rt=new RenderTexture(640,900,24){antiAliasing=4};
        var prev=RenderTexture.active;var old=camera.targetTexture;var pixels=new Texture2D(640,900,TextureFormat.RGB24,false);
        string path=Path.GetFullPath("../../artifacts/unity-spike/mmo-v1/"+name+".png");Directory.CreateDirectory(Path.GetDirectoryName(path));
        try{camera.targetTexture=rt;camera.Render();RenderTexture.active=rt;pixels.ReadPixels(new Rect(0,0,640,900),0,0);pixels.Apply();File.WriteAllBytes(path,pixels.EncodeToPNG());}
        finally{camera.targetTexture=old;RenderTexture.active=prev;UnityEngine.Object.DestroyImmediate(pixels);rt.Release();UnityEngine.Object.DestroyImmediate(rt);}
        return path;
    }
    // Combat framing (perspective, both fighters) for the G4 board; inspection captures stay orthographic.
    public static async Task<string> CaptureCombat(string name,int playerStance=1,int enemyStance=2,float phase=.5f,bool equipment=true,int width=2556,int height=1179)
    {
        if(!Application.isPlaying)throw new Exception("Enter Play first");
        Application.runInBackground=true;
        var bridge=UnityEngine.Object.FindFirstObjectByType<BattleBridge>();
        var gear=new BattleBridge.AvatarConfig{weapon=equipment,glasses=equipment,boots=equipment};
        bridge.Configure(JsonUtility.ToJson(new BattleBridge.Configuration{player=gear,enemy=gear}));
        bridge.Present(JsonUtility.ToJson(new BattleBridge.Frame{
            player=new BattleBridge.ActorFrame{pose=playerStance,phase=phase},
            enemy=new BattleBridge.ActorFrame{pose=enemyStance,phase=phase}}));
        int target=Time.frameCount+4;float deadline=Time.realtimeSinceStartup+10;
        while(Time.frameCount<target){if(Time.realtimeSinceStartup>deadline)throw new Exception("Frames stalled");await Task.Yield();}
        // Default: iPhone 16 Pro landscape pixels, to judge detail at the size the player sees.
        var camera=bridge.arenaCamera;var rt=new RenderTexture(width,height,24){antiAliasing=4};
        var prev=RenderTexture.active;var old=camera.targetTexture;var pixels=new Texture2D(width,height,TextureFormat.RGB24,false);
        string path=Path.GetFullPath("../../artifacts/unity-spike/mmo-v1/"+name+".png");Directory.CreateDirectory(Path.GetDirectoryName(path));
        try{camera.targetTexture=rt;camera.Render();RenderTexture.active=rt;pixels.ReadPixels(new Rect(0,0,width,height),0,0);pixels.Apply();File.WriteAllBytes(path,pixels.EncodeToPNG());}
        finally{camera.targetTexture=old;RenderTexture.active=prev;UnityEngine.Object.DestroyImmediate(pixels);rt.Release();UnityEngine.Object.DestroyImmediate(rt);}
        return path;
    }
    // G4 board: images side by side at a common height, concept first. Paths are relative to the repository.
    public static string Board(string name,string[] images,int height=900)
    {
        var sources=images.Select(file=>{var t=new Texture2D(2,2);t.LoadImage(File.ReadAllBytes(Path.GetFullPath("../../"+file)));return t;}).ToArray();
        var widths=sources.Select(t=>Mathf.RoundToInt(t.width*(float)height/t.height)).ToArray();
        const int gap=24;
        var board=new Texture2D(widths.Sum()+gap*(sources.Length-1),height,TextureFormat.RGB24,false);
        board.SetPixels(Enumerable.Repeat(new Color(.0196f,.0314f,.0863f),board.width*height).ToArray());
        int x=0;
        for(int i=0;i<sources.Length;i++)
        {
            for(int px=0;px<widths[i];px++)for(int py=0;py<height;py++)
                board.SetPixel(x+px,py,sources[i].GetPixelBilinear((px+.5f)/widths[i],(py+.5f)/height));
            x+=widths[i]+gap;UnityEngine.Object.DestroyImmediate(sources[i]);
        }
        string path=Path.GetFullPath("../../"+name);Directory.CreateDirectory(Path.GetDirectoryName(path));
        File.WriteAllBytes(path,board.EncodeToPNG());UnityEngine.Object.DestroyImmediate(board);
        return path;
    }
    public static async Task<string> Review()
    {
        foreach(int side in new[]{32,-32})for(int pose=0;pose<7;pose++)
        {
            foreach(float phase in new[]{.15f,.5f,.85f})await Capture($"review/body-{pose}-{side}-{phase:F2}",pose,0,true,side,phase);
            await Capture($"review/head-{pose}-{side}",pose,1,true,side,.5f);
            await Capture($"review/grip-{pose}-{side}",pose,2,true,side,.5f);
            await Capture($"review/feet-{pose}-{side}",pose,3,true,side,.5f);
        }
        return "84 actual Unity captures: seven gestures, both sides, preparation/contact/recovery plus head, grip and shoes.";
    }

}
