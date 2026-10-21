using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

// Asset assembly is deliberately reproducible; editor control and captures use Unity Pipeline.
public static class QuaterniusPoc
{
    const string Source = "Assets/Characters/Quaternius/";
    const string Added = "Assets/Characters/QuaterniusPOC/";
    const string Output = "Assets/Spike/QuaterniusPOC/";
    const string Prefab = "Assets/Resources/QuaterniusShowcase.prefab";

    public static void Build()
    {
        Directory.CreateDirectory(Output);
        Directory.CreateDirectory("Assets/Resources");
        AssetDatabase.Refresh();
        foreach (var path in new[] { Source + "Superhero_Male_FullBody.fbx", Added + "Male_Peasant.fbx", Added + "Hair_Buzzed.fbx" })
        {
            var importer = (ModelImporter)AssetImporter.GetAtPath(path);
            importer.isReadable = true;
            importer.SaveAndReimport();
        }
        var root = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(Source + "Superhero_Male_FullBody.fbx"));
        root.name = "Quaternius pilot";
        var bones = root.GetComponentsInChildren<Transform>().ToDictionary(t => t.name);
        var skin = Material("Skin dark", Source + "T_Superhero_Male_Dark.png");
        var hands = Material("Hands dark", Added + "T_Regular_Male_Dark_BaseColor.png");
        var cloth = Material("Fantasy cloth", Added + "T_Peasant_BaseColor.png");
        var hair = Material("Hair", Added + "T_Hair_1_BaseColor.png");
        var eyes = Material("Eyes", Source + "T_Eye_Brown.png");
        foreach (var renderer in root.GetComponentsInChildren<SkinnedMeshRenderer>())
            renderer.sharedMaterial = renderer.name == "Eyes" ? eyes : renderer.name == "Eyebrows" ? hair : skin;
        var body = root.GetComponentsInChildren<SkinnedMeshRenderer>().Single(r => r.name == "SuperHero_Male");
        var original = body.sharedMesh;
        var feet = new GameObject("Bare feet");
        feet.transform.SetParent(body.transform.parent, false);
        feet.transform.localPosition = body.transform.localPosition;
        feet.transform.localRotation = body.transform.localRotation;
        feet.transform.localScale = body.transform.localScale;
        var bare = feet.AddComponent<SkinnedMeshRenderer>();
        bare.sharedMesh = Section(body, original, "Bare feet", v => v.y < .43f);
        bare.bones = body.bones; bare.rootBone = body.rootBone; bare.sharedMaterial = skin;
        bare.localBounds = body.localBounds;
        UnityEngine.Object.DestroyImmediate(body.gameObject);
        AssetDatabase.DeleteAsset(Output + "Head.asset");
        Hair(Added + "Head.fbx", root, bones, skin);
        var outfit = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(Added + "Male_Peasant.fbx"));
        var outfitParts = outfit.GetComponentsInChildren<SkinnedMeshRenderer>();
        foreach (var part in outfitParts)
        {
            part.transform.SetParent(root.transform, true);
            part.bones = part.bones.Select(b => bones[b.name]).ToArray();
            part.rootBone = bones[part.rootBone.name];
            part.sharedMaterials = part.sharedMaterials.Select(m => m.name.Contains("Regular") ? hands : cloth).ToArray();
            part.updateWhenOffscreen = true;
        }
        UnityEngine.Object.DestroyImmediate(outfit);
        var appearance = root.AddComponent<QuaterniusAppearance>();
        appearance.parted = Hair(Source + "Hair_SimpleParted_Rigged.fbx", root, bones, hair);
        appearance.buzzed = Hair(Added + "Hair_Buzzed.fbx", root, bones, hair);
        appearance.SelectHair("parted");
        var pose = root.AddComponent<FighterPose>();
        pose.actor = root.GetComponent<Animator>();
        var clips = AssetDatabase.LoadAllAssetsAtPath("Assets/Animations/Quaternius/UAL2Clean.fbx").OfType<AnimationClip>().ToArray();
        var idle = ForwardIdle(clips.Single(c => c.name == "Armature|Idle_No_Loop"));
        var attack = clips.Single(c => c.name == "Armature|Melee_Hook");
        pose.clips = new[] { idle, attack, clips.Single(c => c.name == "Armature|Idle_Shield_Break"), attack,
            clips.Single(c => c.name == "Armature|Sword_Block"), clips.Single(c => c.name == "Armature|Sword_Regular_B"),
            clips.Single(c => c.name == "Armature|Melee_Hook_Rec"), idle };
        pose.contacts = new[] { .5f, .74f, .28f, .74f, .30f, .60f, .22f, .5f };
        pose.shoes = new[] { outfitParts.Single(p => p.name == "Male_Peasant_Feet").transform };
        pose.bareFeet = feet;
        pose.SetShoes(true);
        pose.facing = 0; pose.azimuth = 25; pose.inspect = true;
        pose.headViewOffset = .1f; pose.headViewSize = .25f;
        hair.SetColor("_BaseColor", new Color(.17f, .085f, .04f));
        var light = new GameObject("Soft showcase key", typeof(Light)).GetComponent<Light>();
        light.transform.SetParent(root.transform, false);
        light.type = LightType.Directional; light.intensity = 1.5f; light.transform.localRotation = Quaternion.Euler(35, 150, 0);
        PrefabUtility.SaveAsPrefabAsset(root, Prefab);
        UnityEngine.Object.DestroyImmediate(root);

        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        var camera = new GameObject("Showcase Camera", typeof(Camera)).GetComponent<Camera>();
        camera.tag = "MainCamera"; camera.orthographic = true; camera.orthographicSize = 1.1f;
        camera.clearFlags = CameraClearFlags.SolidColor; camera.backgroundColor = new Color(.055f, .07f, .10f);
        camera.transform.position = new Vector3(0, 1.25f, 5); camera.transform.LookAt(new Vector3(0, .95f, 0));
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat; RenderSettings.ambientLight = new Color(.6f, .6f, .6f);
        var pilot = (GameObject)PrefabUtility.InstantiatePrefab(AssetDatabase.LoadAssetAtPath<GameObject>(Prefab));
        pilot.GetComponent<FighterPose>().inspectionCamera = camera;
        EditorSceneManager.SaveScene(scene, Output + "CharacterShowcase.unity");
        AssetDatabase.SaveAssets();
        Validate();
    }

    static AnimationClip ForwardIdle(AnimationClip source)
    {
        var clip = UnityEngine.Object.Instantiate(source);
        clip.name = "Quaternius forward idle";
        foreach (var name in new[] { "Neck Nod Down-Up", "Head Nod Down-Up", "Neck Tilt Left-Right",
            "Head Tilt Left-Right", "Neck Turn Left-Right", "Head Turn Left-Right" })
            AnimationUtility.SetEditorCurve(clip, EditorCurveBinding.FloatCurve("", typeof(Animator), name),
                AnimationCurve.Constant(0, source.length, name == "Neck Nod Down-Up" ? .35f : name == "Head Nod Down-Up" ? .1f : 0));
        var path = Output + "Forward idle.anim";
        var saved = AssetDatabase.LoadAssetAtPath<AnimationClip>(path);
        if (saved == null) { AssetDatabase.CreateAsset(clip, path); return clip; }
        EditorUtility.CopySerialized(clip, saved);
        UnityEngine.Object.DestroyImmediate(clip);
        return saved;
    }
    static Material Material(string name, string texture)
    {
        var path = Output + name + ".mat";
        var material = AssetDatabase.LoadAssetAtPath<Material>(path);
        if (material == null) { material = new Material(Shader.Find("GRRIND/Painted Toon")); AssetDatabase.CreateAsset(material, path); }
        material.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>(texture));
        material.SetColor("_BaseColor", Color.white); material.SetColor("_ShadowTint", new Color(.72f, .72f, .72f));
        material.SetFloat("_RimStrength", .06f); material.SetFloat("_OutlineWidth", .0007f);
        EditorUtility.SetDirty(material); return material;
    }
    static Mesh Section(SkinnedMeshRenderer renderer, Mesh original, string name, Func<Vector3, bool> keep)
    {
        var mesh = UnityEngine.Object.Instantiate(original); mesh.name = name;
        var vertices = original.vertices;
        var triangles = original.triangles;
        var selected = Enumerable.Range(0, triangles.Length / 3).Where(i => Enumerable.Range(0, 3)
            .All(j => keep(renderer.transform.TransformPoint(vertices[triangles[i * 3 + j]]))))
            .SelectMany(i => new[] { triangles[i * 3], triangles[i * 3 + 1], triangles[i * 3 + 2] }).ToArray();
        if (selected.Length == 0) throw new Exception("Empty mesh section " + name);
        mesh.subMeshCount = 1; mesh.triangles = selected;
        var path = Output + name + ".asset";
        AssetDatabase.DeleteAsset(path); AssetDatabase.CreateAsset(mesh, path); return mesh;
    }
    static GameObject Hair(string path, GameObject root, System.Collections.Generic.Dictionary<string, Transform> bones, Material material)
    {
        var instance = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(path));
        var renderer = instance.GetComponentInChildren<SkinnedMeshRenderer>();
        renderer.transform.SetParent(root.transform, true);
        renderer.bones = renderer.bones.Select(b => bones[b.name]).ToArray();
        renderer.rootBone = bones[renderer.rootBone.name]; renderer.sharedMaterial = material;
        UnityEngine.Object.DestroyImmediate(instance); return renderer.gameObject;
    }
    public static void Validate()
    {
        var instance = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(Prefab));
        try
        {
            var pose = instance.GetComponent<FighterPose>();
            if (!pose.actor.isHuman || !pose.actor.avatar.isValid) throw new Exception("Invalid Humanoid");
            if (pose.clips.Length != 8 || pose.clips.Any(c => c == null) || pose.contacts.Length != pose.clips.Length
                || pose.contacts.Any(c => c <= 0 || c >= 1)) throw new Exception("Missing clip/contact mapping");
            if (pose.actor.GetBoneTransform(HumanBodyBones.RightIndexDistal) == null) throw new Exception("Missing fingers");
            var appearance = instance.GetComponent<QuaterniusAppearance>();
            foreach (var style in new[] { "buzzed", "parted" })
            {
                appearance.SelectHair(style);
                if (appearance.parted.activeSelf == appearance.buzzed.activeSelf || appearance.buzzed.activeSelf != (style == "buzzed"))
                    throw new Exception("Hair selection failed");
            }
            foreach (bool equipped in new[] { false, true })
            {
                pose.SetShoes(equipped);
                if (pose.shoes.Any(s => s.gameObject.activeSelf != equipped) || pose.bareFeet.activeSelf == equipped)
                    throw new Exception("Boot selection failed");
            }
            foreach (var renderer in instance.GetComponentsInChildren<SkinnedMeshRenderer>(true))
                if (renderer.bones.Any(b => b == null) || renderer.sharedMaterials.Any(m => m == null)) throw new Exception("Missing binding/material");
            Debug.Log("Quaternius POC: Humanoid, finger bones, both hair options, boots/bare feet and all bone bindings PASS");
        }
        finally { UnityEngine.Object.DestroyImmediate(instance); }
    }
    public static float[] ValidateGaze()
    {
        if (!EditorApplication.isPlaying) throw new InvalidOperationException("Gaze must be checked in Play mode");
        var pose = UnityEngine.Object.FindObjectsByType<FighterPose>(FindObjectsSortMode.None).First(p => p.inspect);
        var saved = (pose.stance, pose.phase, pose.autoplay);
        try
        {
            pose.stance = 0; pose.autoplay = false;
            return new[] { 0f, .25f, .5f, .75f, .99f }.Select(phase =>
            {
                pose.phase = phase; pose.SendMessage("LateUpdate");
                float pitch = Mathf.Asin(pose.Bone(HumanBodyBones.Head).forward.y) * Mathf.Rad2Deg;
                if (Mathf.Abs(pitch) > 12) throw new Exception("Idle gaze is not forward: " + pitch + " degrees at " + phase);
                return pitch;
            }).ToArray();
        }
        finally { (pose.stance, pose.phase, pose.autoplay) = saved; }
    }
    public static float[] ValidateDuel()
    {
        if (!EditorApplication.isPlaying) throw new InvalidOperationException("Duel must be checked in Play mode");
        var bridge = UnityEngine.Object.FindFirstObjectByType<BattleBridge>();
        var poses = UnityEngine.Object.FindObjectsByType<FighterPose>(FindObjectsSortMode.None);
        if (poses.Length != 2 || poses.Any(p => p.GetComponent<QuaterniusAppearance>() == null || p.clips.Length < 8))
            throw new Exception("Expected two Quaternius fighters with the complete stance library");
        return new[] { true, false }.Select(left =>
        {
            bridge.Present(JsonUtility.ToJson(new BattleBridge.Frame {
                player = new BattleBridge.ActorFrame { pose = left ? 1 : 2, phase = .5f },
                enemy = new BattleBridge.ActorFrame { pose = left ? 2 : 1, phase = .5f }
            }));
            foreach (var pose in poses) pose.SendMessage("LateUpdate");
            var attacker = poses.Single(p => p.stance == 1);
            var target = poses.Single(p => p.stance == 2);
            float gap = Mathf.Abs(attacker.Bone(HumanBodyBones.RightHand).position.x - target.Bone(HumanBodyBones.Chest).position.x);
            if (gap > .3f) throw new Exception("Strike misses in the camera plane: " + gap + " m");
            return gap;
        }).ToArray();
    }
}
