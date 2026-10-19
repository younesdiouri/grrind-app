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
        var body = SoftMaterial(Folder + "/Body.mat", texture);
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

    // G2: the bind pose seen from the front, orthographic on flat grey, measured by heads_tall.py
    // exactly like the input image.
    public static string Silhouette(string name)
    {
        var actor = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(Source + "/Athlete.fbx"));
        var bounds = Bounds(actor);
        var camera = new GameObject("Silhouette camera").AddComponent<Camera>();
        camera.orthographic = true;
        camera.orthographicSize = bounds.size.y * .6f;
        camera.transform.position = bounds.center + Vector3.back * 5;  // the model faces -Z
        camera.transform.LookAt(bounds.center);
        camera.clearFlags = CameraClearFlags.SolidColor;
        camera.backgroundColor = new Color(.78f, .78f, .78f);
        const int width = 1200, height = 1000;
        var target = new RenderTexture(width, height, 24);
        var pixels = new Texture2D(width, height, TextureFormat.RGB24, false);
        camera.targetTexture = target;
        camera.Render();
        RenderTexture.active = target;
        pixels.ReadPixels(new Rect(0, 0, width, height), 0, 0);
        RenderTexture.active = null;
        var path = System.IO.Path.GetFullPath("../../artifacts/unity-spike/chunky/" + name + ".png");
        System.IO.Directory.CreateDirectory(System.IO.Path.GetDirectoryName(path));
        System.IO.File.WriteAllBytes(path, pixels.EncodeToPNG());
        UnityEngine.Object.DestroyImmediate(camera.gameObject);
        UnityEngine.Object.DestroyImmediate(actor);
        UnityEngine.Object.DestroyImmediate(pixels);
        target.Release();
        return path;
    }

    static Bounds Bounds(GameObject obj)
    {
        var renderers = obj.GetComponentsInChildren<Renderer>();
        var bounds = renderers[0].bounds;
        foreach (var renderer in renderers) bounds.Encapsulate(renderer.bounds);
        return bounds;
    }

    // Modern mobile look: soft satin Lit shading under the arena's sky light and back rim light.
    static Material SoftMaterial(string path, Texture texture)
    {
        var material = AssetDatabase.LoadAssetAtPath<Material>(path);
        if (material == null)
        {
            material = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            AssetDatabase.CreateAsset(material, path);
        }
        material.shader = Shader.Find("Universal Render Pipeline/Lit");
        material.SetTexture("_BaseMap", texture);
        material.SetColor("_BaseColor", Color.white);
        material.SetFloat("_Metallic", 0);
        material.SetFloat("_Smoothness", .38f);
        // No skybox in the arena: environment reflections would only grey the colours.
        material.SetFloat("_EnvironmentReflections", 0);
        material.EnableKeyword("_ENVIRONMENTREFLECTIONS_OFF");
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
