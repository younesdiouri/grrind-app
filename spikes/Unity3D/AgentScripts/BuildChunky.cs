using System;
using UnityEditor;
using UnityEngine;

// Chunky athlete (#219): the Meshy rig is imported after normalize_meshy_rig.py applied its scale. No grafted hands, no smoothing,
// no decimation; the closed fists are part of the generated mesh.
public static class BuildChunky
{
    const string Source = "Assets/Characters/ChunkyAthlete";
    const string Folder = "Assets/Spike/ChunkyAthlete";
    const float Height = 1.7f;

    public static string Create()
    {
        if (Application.isPlaying) throw new Exception("Stop Play before rebuilding the avatar.");
        var model = Source + "/Athlete.fbx";
        var importer = (ModelImporter)AssetImporter.GetAtPath(model);
        importer.animationType = ModelImporterAnimationType.Human;
        importer.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
        importer.bakeAxisConversion = true;
        importer.materialImportMode = ModelImporterMaterialImportMode.None;
        importer.importAnimation = false;
        importer.globalScale = 1;
        // The remeshed surface is faceted: smooth the shading normals, never the geometry.
        importer.importNormals = ModelImporterNormals.Calculate;
        importer.normalSmoothingAngle = 80;
        importer.SaveAndReimport();

        // Meshy exports an arbitrary unit size: scale the import so the character stands at 1.70 m.
        var probe = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(model));
        float measured = Bounds(probe).size.y;
        UnityEngine.Object.DestroyImmediate(probe);
        if (Mathf.Abs(measured - Height) > .01f)
        {
            importer.globalScale *= Height / measured;
            importer.SaveAndReimport();
        }

        var actor = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(model));
        actor.name = "Chunky athlete";
        var animator = actor.GetComponent<Animator>();
        if (animator == null || !animator.isHuman || !animator.avatar.isValid) throw new Exception("Invalid Humanoid");

        if (!AssetDatabase.IsValidFolder(Folder)) AssetDatabase.CreateFolder("Assets/Spike", "ChunkyAthlete");
        var texture = AssetDatabase.LoadAssetAtPath<Texture2D>(Source + "/athlete-basecolor.png");
        var body = ToonMaterial(Folder + "/Body.mat", texture);
        foreach (var renderer in actor.GetComponentsInChildren<SkinnedMeshRenderer>())
        {
            renderer.sharedMaterials = new[] { body };
            renderer.updateWhenOffscreen = true;
        }

        var original = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Spike/Muscu/Avatar.prefab").GetComponent<MuscuPose>();
        var pose = actor.AddComponent<MuscuPose>();
        pose.actor = animator;
        pose.clips = original.clips;
        // Sockets until the generated gear lands; the bridge toggles them like real items.
        pose.weapon = Socket("Weapon socket", animator.GetBoneTransform(HumanBodyBones.RightHand));
        pose.glasses = Socket("Glasses socket", animator.GetBoneTransform(HumanBodyBones.Head));
        pose.inspect = false;
        pose.debugControls = false;

        PrefabUtility.SaveAsPrefabAsset(actor, Folder + "/Avatar.prefab");
        UnityEngine.Object.DestroyImmediate(actor);
        AssetDatabase.SaveAssets();
        return $"Chunky avatar saved, measured {measured:F3} m before normalisation.";
    }

    static Bounds Bounds(GameObject obj)
    {
        var renderers = obj.GetComponentsInChildren<Renderer>();
        var bounds = renderers[0].bounds;
        foreach (var renderer in renderers) bounds.Encapsulate(renderer.bounds);
        return bounds;
    }

    static Material ToonMaterial(string path, Texture texture)
    {
        var material = AssetDatabase.LoadAssetAtPath<Material>(path);
        if (material == null)
        {
            material = new Material(Shader.Find("GRRIND/Painted Toon"));
            AssetDatabase.CreateAsset(material, path);
        }
        material.SetTexture("_BaseMap", texture);
        // Saturated chunky style: neutral shadow (no lavender on white cloth), lighter outline.
        material.SetColor("_ShadowTint", new Color(.72f, .7f, .74f));
        material.SetFloat("_OutlineWidth", .0012f);
        material.SetFloat("_RimStrength", .18f);
        EditorUtility.SetDirty(material);
        return material;
    }

    static Transform Socket(string name, Transform bone)
    {
        var socket = new GameObject(name).transform;
        socket.SetParent(bone, false);
        socket.gameObject.SetActive(false);
        return socket;
    }
}
