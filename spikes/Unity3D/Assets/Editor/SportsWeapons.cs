using System;
using System.Linq;
using UnityEditor;
using UnityEngine;
using UnityEngine.Animations.Rigging;

public static class SportsWeapons
{
    public static void Build()
    {
        AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
        QuaterniusPoc.ImportMixamo();
        var guard = UprightGuard();
        foreach (var name in new[] { "QuaterniusShowcase", "QuaterniusFemale" })
        {
            var path = "Assets/Resources/" + name + ".prefab";
            var root = PrefabUtility.LoadPrefabContents(path);
            try
            {
                var grip = root.GetComponent<WeaponGrip>();
                grip.ferPlay = Install(root, grip.ferPlay, "FerPlay");
                grip.huilesson = Install(root, grip.huilesson, "Huilesson");
                var pose = root.GetComponent<FighterPose>();
                pose.clips = pose.clips.Take(8).Concat(new[] {
                    guard, QuaterniusPoc.Mixamo("GreatSwordDownwardSlash"), QuaterniusPoc.Mixamo("GreatSwordPowerSlash") }).ToArray();
                pose.contacts[1]=pose.contacts[6]=.31f; pose.contacts[3]=.33f;
                pose.contacts = pose.contacts.Take(8).Concat(new[] { .5f, .5f, .45f }).ToArray();
                SupportGrip(root, name == "QuaterniusFemale");
                grip.SetEquipped(false);
                PrefabUtility.SaveAsPrefabAsset(root, path);
            }
            finally { PrefabUtility.UnloadPrefabContents(root); }
        }
        AssetDatabase.SaveAssets();
    }
    public static AnimationClip UprightGuard()
    {
        var source=QuaterniusPoc.Mixamo("GreatSwordIdle");var clip=UnityEngine.Object.Instantiate(source);
        clip.name="Quaternius upright sword guard";
        var names=new[]{"RootQ","LeftFootT","LeftFootQ","RightFootT","RightFootQ"}
            .SelectMany(n=>(n.EndsWith("T")?"xyz":"xyzw").Select(a=>n+"."+a)).ToArray();
        var curves=names.ToDictionary(n=>n,n=>AnimationUtility.GetEditorCurve(source,
            EditorCurveBinding.FloatCurve("",typeof(Animator),n)));
        var keys=names.ToDictionary(n=>n,n=>new System.Collections.Generic.List<Keyframe>());
        for(int i=0;i<=Mathf.RoundToInt(source.length*source.frameRate);i++)
        {
            float time=Mathf.Min(source.length,i/source.frameRate);
            float V(string name)=>curves[name].Evaluate(time);
            Quaternion Q(string name)=>new Quaternion(V(name+".x"),V(name+".y"),V(name+".z"),V(name+".w"));
            void Put(string name,Quaternion value) {
                for(int a=0;a<4;a++)keys[name+"."+"xyzw"[a]].Add(new Keyframe(time,value[a]));
            }
            var body=Q("RootQ");
            var upright=Quaternion.LookRotation(Vector3.ProjectOnPlane(body*Vector3.forward,Vector3.up),Vector3.up);
            var rebase=Quaternion.Inverse(upright)*body;
            Put("RootQ",upright);
            // Foot IK goals are body-relative: preserve their world placement as the body straightens.
            foreach(var side in new[]{"Left","Right"}) {
                string foot=side+"Foot";
                var position=rebase*new Vector3(V(foot+"T.x"),V(foot+"T.y"),V(foot+"T.z"));
                for(int a=0;a<3;a++)keys[foot+"T."+"xyz"[a]].Add(new Keyframe(time,position[a]));
                Put(foot+"Q",rebase*Q(foot+"Q"));
            }
        }
        foreach(var name in names)AnimationUtility.SetEditorCurve(clip,
            EditorCurveBinding.FloatCurve("",typeof(Animator),name),new AnimationCurve(keys[name].ToArray()));
        clip.EnsureQuaternionContinuity();
        const string path="Assets/Spike/QuaterniusPOC/Upright sword guard.anim";
        var saved=AssetDatabase.LoadAssetAtPath<AnimationClip>(path);
        if(saved==null){AssetDatabase.CreateAsset(clip,path);return clip;}
        EditorUtility.CopySerialized(clip,saved);UnityEngine.Object.DestroyImmediate(clip);return saved;
    }
    public static void SupportGrip(GameObject root, bool female)
    {
        var grip=root.GetComponent<WeaponGrip>();var actor=root.GetComponent<Animator>();
        var right=actor.GetBoneTransform(HumanBodyBones.RightHand);
        var left=actor.GetBoneTransform(HumanBodyBones.LeftHand);
        grip.supportFingers=grip.fingers.Select(r=>left.GetComponentsInChildren<Transform>()
            .Single(l=>l.name==r.name.Replace("_r","_l"))).ToArray();
        var fingers=grip.fingers.Concat(grip.supportFingers).ToArray();
        var originals=fingers.Select(t=>t.localRotation).ToArray();
        var rightRest=grip.fingers.Select(t=>t.rotation).ToArray();
        var leftRest=grip.supportFingers.Select(t=>t.rotation).ToArray();
        var reflection=Matrix4x4.Scale(new Vector3(-1,1,1));
        try
        {
            for(int i=0;i<grip.fingers.Length;i++)grip.fingers[i].localRotation=grip.rotations[i];
            for(int i=0;i<grip.supportFingers.Length;i++)
            {
                var delta=Matrix4x4.Rotate(grip.fingers[i].rotation*Quaternion.Inverse(rightRest[i]));
                grip.supportFingers[i].rotation=(reflection*delta*reflection).rotation*leftRest[i];
            }
            grip.supportRotations=grip.supportFingers.Select(t=>t.localRotation).ToArray();
            var axis=grip.ferPlay.transform.localRotation*Vector3.left;
            var socket=grip.ferPlay.transform.localPosition;
            var leftSocket=left.InverseTransformPoint(reflection.MultiplyPoint3x4(right.TransformPoint(socket)));
            var leftAxis=left.InverseTransformDirection(reflection.MultiplyVector(right.TransformDirection(axis)));
            var rotation=Quaternion.Inverse(right.rotation)*left.rotation;
            rotation=Quaternion.AngleAxis(female?235:225,axis)*Quaternion.FromToRotation(rotation*leftAxis,axis)*rotation;
            var target=right.Find("Sports support grip");
            if(target==null){target=new GameObject("Sports support grip").transform;target.SetParent(right,false);}
            // Palm centres are 10 cm apart. Roll is measured over both complete source strokes.
            target.SetLocalPositionAndRotation(socket-axis*.10f-rotation*leftSocket,rotation);
            grip.supportTarget=target;
            if(grip.supportRig==null){
                var obj=new GameObject("Sports weapon rig");obj.transform.SetParent(root.transform,false);
                grip.supportRig=obj.AddComponent<Rig>();
            }
            grip.supportRig.weight=0;
            var constraint=grip.supportRig.GetComponentInChildren<TwoBoneIKConstraint>();
            if(constraint==null){
                var obj=new GameObject("Supporting hand");obj.transform.SetParent(grip.supportRig.transform,false);
                constraint=obj.AddComponent<TwoBoneIKConstraint>();
            }
            var data=constraint.data;
            data.root=actor.GetBoneTransform(HumanBodyBones.LeftUpperArm);
            data.mid=actor.GetBoneTransform(HumanBodyBones.LeftLowerArm);data.tip=left;data.target=target;
            data.targetPositionWeight=data.targetRotationWeight=1;data.hintWeight=0;
            data.maintainTargetPositionOffset=data.maintainTargetRotationOffset=false;constraint.data=data;
            var builder=root.GetComponent<RigBuilder>()??root.AddComponent<RigBuilder>();
            builder.enabled=false;builder.layers.Clear();builder.layers.Add(new RigLayer(grip.supportRig));
        }
        finally{for(int i=0;i<fingers.Length;i++)fingers[i].localRotation=originals[i];}
    }
    static GameObject Install(GameObject root, GameObject previous, string name)
    {
        if (previous != null) UnityEngine.Object.DestroyImmediate(previous);
        string folder = "Assets/Characters/" + name + "/";
        var importer = (ModelImporter)AssetImporter.GetAtPath(folder + name + ".fbx");
        importer.isReadable = true; importer.SaveAndReimport();
        var mat = AssetDatabase.LoadAssetAtPath<Material>(folder + "Item.mat");
        if (mat == null) { mat = new Material(Shader.Find("Universal Render Pipeline/Lit")); AssetDatabase.CreateAsset(mat, folder + "Item.mat"); }
        mat.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>(folder + "BaseColor.png"));
        mat.SetFloat("_Smoothness", .2f); mat.SetFloat("_Metallic", name == "FerPlay" ? .15f : 0);
        EditorUtility.SetDirty(mat);
        var grip = root.GetComponent<WeaponGrip>();
        var obj = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(folder + name + ".fbx"), grip.item.transform.parent, false);
        obj.name = name;
        obj.transform.localPosition = grip.item.transform.localPosition;
        // FBX converts the Blender +X tip to Unity -X; the dumbbell is symmetric.
        obj.transform.localRotation = grip.item.transform.localRotation * Quaternion.Euler(0,180,0);
        var strings = AssetDatabase.LoadAssetAtPath<Material>(folder + "Strings.mat");
        if (name == "Huilesson" && strings == null) {
            strings = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            strings.SetColor("_BaseColor",new Color(.84f,.79f,.64f)); strings.SetFloat("_Smoothness",.1f);
            AssetDatabase.CreateAsset(strings,folder+"Strings.mat");
        }
        var renderer = obj.GetComponentInChildren<MeshRenderer>();
        renderer.sharedMaterials = renderer.sharedMaterials.Select(m => m.name.Contains("Racket strings") ? strings : mat).ToArray();
        obj.SetActive(false); return obj;
    }
}
