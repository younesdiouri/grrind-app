using System;
using System.Linq;
using UnityEditor;
using UnityEngine;

public static class SportsWeapons
{
    public static void Build()
    {
        AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
        foreach (var name in new[] { "StableSwordSlash", "SwordStab" })
        {
            var importer = (ModelImporter)AssetImporter.GetAtPath("Assets/Animations/Mixamo/"+name+".fbx");
            importer.animationType=ModelImporterAnimationType.Human;
            importer.avatarSetup=ModelImporterAvatarSetup.CreateFromThisModel;
            importer.animationCompression=ModelImporterAnimationCompression.Off;
            var settings=importer.defaultClipAnimations;
            foreach(var clip in settings) {
                clip.name=name;clip.lockRootRotation=clip.lockRootHeightY=true;clip.lockRootPositionXZ=false;
                clip.keepOriginalOrientation=true;clip.heightFromFeet=true;
            }
            importer.clipAnimations=settings;importer.SaveAndReimport();
        }
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
                var slash=Clip("StableSwordSlash");
                pose.clips = pose.clips.Take(8).Concat(new[] {
                    Guard(slash), slash, Clip("SwordStab") }).ToArray();
                pose.contacts[1]=pose.contacts[6]=.31f; pose.contacts[3]=.33f;
                pose.contacts = pose.contacts.Take(8).Concat(new[] { .5f, .17f, .15f }).ToArray();
                grip.SetEquipped(false);
                PrefabUtility.SaveAsPrefabAsset(root, path);
            }
            finally { PrefabUtility.UnloadPrefabContents(root); }
        }
        AssetDatabase.SaveAssets();
    }
    static AnimationClip Clip(string name) => AssetDatabase.LoadAllAssetsAtPath("Assets/Animations/Mixamo/"+name+".fbx")
        .OfType<AnimationClip>().Single(c=>!c.name.StartsWith("__preview__"));
    static AnimationClip Guard(AnimationClip source)
    {
        const string path="Assets/Animations/Mixamo/SwordGuard.anim";
        var clip=UnityEngine.Object.Instantiate(source);clip.name="Sword guard";
        foreach(var binding in AnimationUtility.GetCurveBindings(clip)) {
            float value=AnimationUtility.GetEditorCurve(clip,binding).Evaluate(0);
            if(binding.propertyName.StartsWith("Neck ")||binding.propertyName.StartsWith("Head "))
                value=binding.propertyName=="Neck Nod Down-Up"?.35f:binding.propertyName=="Head Nod Down-Up"?.1f:0;
            AnimationUtility.SetEditorCurve(clip,binding,AnimationCurve.Constant(0,1,value));
        }
        var saved=AssetDatabase.LoadAssetAtPath<AnimationClip>(path);
        if(saved==null){AssetDatabase.CreateAsset(clip,path);return clip;}
        EditorUtility.CopySerialized(clip,saved);UnityEngine.Object.DestroyImmediate(clip);return saved;
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
