using System;
using System.Linq;
using UnityEditor;
using UnityEngine;

public static class CaillouxMob
{
    const string Folder = "Assets/Characters/Cailloux/";
    static readonly string[] Poses = { "Idle", "Attack", "Hit", "Critical", "Dodge", "Combo", "Counter", "WorkshopIdle" };

    public static void Build()
    {
        AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
        var importer = (ModelImporter)AssetImporter.GetAtPath(Folder + "Cailloux.fbx");
        importer.animationType = ModelImporterAnimationType.Generic;
        importer.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
        importer.animationCompression = ModelImporterAnimationCompression.Off;
        importer.importCameras = false; importer.importLights = false;
        importer.materialImportMode = ModelImporterMaterialImportMode.None;
        var settings = importer.defaultClipAnimations;
        foreach (var clip in settings)
        {
            clip.loopTime = clip.name.EndsWith("Idle", StringComparison.Ordinal);
            clip.lockRootRotation = true; clip.lockRootPositionXZ = true; clip.lockRootHeightY = true;
        }
        importer.clipAnimations = settings;
        importer.SaveAndReimport();
        var material = AssetDatabase.LoadAssetAtPath<Material>(Folder + "Stone.mat");
        if (material == null)
        {
            material = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            AssetDatabase.CreateAsset(material, Folder + "Stone.mat");
        }
        material.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>(Folder + "BaseColor.png"));
        material.SetColor("_BaseColor", Color.white);
        material.SetFloat("_Metallic", 0); material.SetFloat("_Smoothness", .15f);
        EditorUtility.SetDirty(material);
        var clips = AssetDatabase.LoadAllAssetsAtPath(Folder + "Cailloux.fbx").OfType<AnimationClip>()
            .Where(c => !c.name.StartsWith("__preview__", StringComparison.Ordinal)).ToArray();
        var root = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(Folder + "Cailloux.fbx"));
        try
        {
            root.name = "Cailloux";
            var animator = root.GetComponent<Animator>();
            var pose = root.AddComponent<FighterPose>();
            pose.actor = animator; pose.inspect = false;
            pose.clips = Poses.Select(name => clips.Single(c => c.name.Split('|').Last() == name)).ToArray();
            pose.contacts = Enumerable.Repeat(.5f, Poses.Length).ToArray();
            foreach (var renderer in root.GetComponentsInChildren<SkinnedMeshRenderer>())
            {
                renderer.sharedMaterial = material;
                renderer.updateWhenOffscreen = true;
                renderer.localBounds = new Bounds(new Vector3(0,.7f,0), new Vector3(2,2,2));
            }
            PrefabUtility.SaveAsPrefabAsset(root, "Assets/Resources/Cailloux.prefab");
        }
        finally { UnityEngine.Object.DestroyImmediate(root); }
        AssetDatabase.SaveAssets();
        Validate();
    }

    public static void Validate()
    {
        var prefab = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Resources/Cailloux.prefab");
        var pose = prefab.GetComponent<FighterPose>();
        if (pose.actor.isHuman || pose.clips.Length != 8 || pose.clips.Any(c => c == null))
            throw new Exception("Cailloux: missing Generic rig or presentation clip");
        var mesh = prefab.GetComponentInChildren<SkinnedMeshRenderer>().sharedMesh;
        if (mesh.triangles.Length / 3 != 6189 || mesh.uv.Length == 0 || mesh.bindposes.Length != 24)
            throw new Exception("Cailloux: geometry, UV or bind changed during import");
        Debug.Log("Cailloux: Generic rig, 8 clips, 6189 triangles, UV and 24 bones PASS");
    }
}
