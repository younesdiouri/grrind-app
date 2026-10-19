using System;
using System.Linq;
using UnityEditor;
using UnityEngine;

// A Meshy character end to end (#219, #224): multi-view mesh, Meshy rig and Meshy clips in one
// FBX. Imported as Generic: the clips were made for this exact skeleton, so nothing is
// retargeted and the centimetre armature scale stays consistent.
public static class BuildMeshy
{
    const float Height = 1.7f;

    // Order of UNITY_POSES in unityFrame.ts, matched to the Meshy action keys requested.
    static readonly string[] Actions =
    {
        "Combat_Stance", "Right_Jab_from_Guard", "Hit_Reaction", "Right_Uppercut_from_Guard",
        "Stand_Dodge", "Punch_Combo", "Counterstrike",
    };

    public static string Create(string name = "MeshyAthlete")
    {
        if (Application.isPlaying) throw new Exception("Stop Play before rebuilding the avatar.");
        string source = "Assets/Characters/" + name, folder = "Assets/Spike/" + name;
        var model = source + "/Athlete.fbx";
        var importer = (ModelImporter)AssetImporter.GetAtPath(model);
        importer.animationType = ModelImporterAnimationType.Generic;
        importer.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
        importer.materialImportMode = ModelImporterMaterialImportMode.None;
        importer.importAnimation = true;
        importer.globalScale = 1;
        importer.SaveAndReimport();

        var probe = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(model));
        float measured = Bounds(probe).size.y;
        UnityEngine.Object.DestroyImmediate(probe);
        importer.globalScale = Height / measured;
        importer.SaveAndReimport();

        // In place: the hips are the motion node, their ground travel is extracted as root motion
        // and dropped (applyRootMotion is off); height and turn stay baked in the pose.
        var rig = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(model));
        var hipsBone = rig.GetComponentsInChildren<Transform>().First(t => t.name == "Hips");
        importer.motionNodeName = "<Root>/" + AnimationUtility.CalculateTransformPath(hipsBone, rig.transform);
        UnityEngine.Object.DestroyImmediate(rig);
        importer.clipAnimations = importer.defaultClipAnimations.Select(clip =>
        {
            clip.lockRootPositionXZ = false;
            clip.lockRootHeightY = true;
            clip.keepOriginalPositionY = true;
            clip.lockRootRotation = true;
            clip.keepOriginalOrientation = true;
            return clip;
        }).ToArray();
        importer.SaveAndReimport();

        var available = AssetDatabase.LoadAllAssetsAtPath(model).OfType<AnimationClip>()
            .Where(clip => !clip.name.StartsWith("__preview__")).ToArray();
        var clips = Actions.Select(action => available.FirstOrDefault(clip => clip.name.EndsWith(action))
            ?? throw new Exception($"Clip {action} missing; found: {string.Join(", ", available.Select(c => c.name))}")).ToArray();

        var actor = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(model));
        actor.name = name;
        var animator = actor.GetComponent<Animator>() ?? actor.AddComponent<Animator>();
        if (!AssetDatabase.IsValidFolder(folder)) AssetDatabase.CreateFolder("Assets/Spike", name);
        var body = PaintedMaterial(folder + "/Body.mat", AssetDatabase.LoadAssetAtPath<Texture2D>(source + "/athlete-basecolor.png"));
        foreach (var renderer in actor.GetComponentsInChildren<SkinnedMeshRenderer>())
        {
            renderer.sharedMaterials = Enumerable.Repeat(body, renderer.sharedMaterials.Length).ToArray();
            renderer.updateWhenOffscreen = true;
        }

        var pose = actor.AddComponent<MuscuPose>();
        pose.actor = animator;
        pose.clips = clips;
        pose.weapon = Socket("Weapon socket", pose.Bone(HumanBodyBones.RightHand));
        pose.glasses = Socket("Glasses socket", pose.Bone(HumanBodyBones.Head));
        pose.contacts = clips.Select((clip, i) => Contact(actor, pose, clip, i)).ToArray();
        pose.inspect = false;
        pose.debugControls = false;

        PrefabUtility.SaveAsPrefabAsset(actor, folder + "/Avatar.prefab");
        UnityEngine.Object.DestroyImmediate(actor);
        AssetDatabase.SaveAssets();
        return $"{name} saved; contacts {string.Join(" ", pose.contacts.Select(c => c.ToString("F2")))}";
    }

    // Contact = the frame the gesture reads best: fist furthest from the hips for strikes,
    // head snap or hips displacement for being hit and dodging. Phase 0.5 lands on it.
    static float Contact(GameObject actor, MuscuPose pose, AnimationClip clip, int stance)
    {
        if (stance == 0) return .5f;
        Transform hips = pose.Bone(HumanBodyBones.Hips), head = pose.Bone(HumanBodyBones.Head),
            hand = pose.Bone(HumanBodyBones.RightHand), left = pose.Bone(HumanBodyBones.LeftHand);
        clip.SampleAnimation(actor, 0);
        Vector3 head0 = head.position, hips0 = hips.position;
        float best = -1, at = .5f;
        const int steps = 90;
        // Search the heart of the clip: reactions drift until their last frame.
        for (int i = steps / 10; i <= steps * 8 / 10; i++)
        {
            float t = i / (float)steps;
            clip.SampleAnimation(actor, t * clip.length);
            // Being hit: the head snapping relative to the hips, not the step back that follows.
            float score = stance == 2 ? Vector3.Distance(head.position - hips.position, head0 - hips0)
                : stance == 4 ? Vector3.Distance(hips.position, hips0)
                : Mathf.Max(Flat(hand.position - hips.position), Flat(left.position - hips.position));
            if (score > best) { best = score; at = t; }
        }
        return at;
    }

    static float Flat(Vector3 v) => new Vector2(v.x, v.z).magnitude;

    static Bounds Bounds(GameObject obj)
    {
        var renderers = obj.GetComponentsInChildren<Renderer>();
        var bounds = renderers[0].bounds;
        foreach (var renderer in renderers) bounds.Encapsulate(renderer.bounds);
        return bounds;
    }

    // The light is in the texture: no rim, neutral shadow, thin brown outline.
    static Material PaintedMaterial(string path, Texture texture)
    {
        var material = AssetDatabase.LoadAssetAtPath<Material>(path);
        if (material == null)
        {
            material = new Material(Shader.Find("GRRIND/Painted Toon"));
            AssetDatabase.CreateAsset(material, path);
        }
        material.shader = Shader.Find("GRRIND/Painted Toon");
        material.SetTexture("_BaseMap", texture);
        material.SetColor("_ShadowTint", new Color(.92f, .9f, .88f));
        material.SetFloat("_RampSoftness", .35f);
        material.SetFloat("_RimStrength", 0);
        material.SetColor("_OutlineColor", new Color(.12f, .07f, .06f));
        material.SetFloat("_OutlineWidth", .0014f);
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
