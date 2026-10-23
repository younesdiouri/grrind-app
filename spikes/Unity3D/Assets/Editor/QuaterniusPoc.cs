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
        AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
        foreach (var body in new[] { "Male", "Female" })
        foreach (var map in new[] { "BaseColor", "Normal", "MetallicSmoothness" })
        {
            var name = body + "_Tshirt_" + map + ".png";
            var texture = (TextureImporter)AssetImporter.GetAtPath("Assets/Characters/Personalization/" + name);
            texture.textureType = name.Contains("Normal") ? TextureImporterType.NormalMap : TextureImporterType.Default;
            texture.sRGBTexture = name.Contains("BaseColor");
            texture.maxTextureSize = 2048; texture.mipmapEnabled = true; texture.anisoLevel = 4;
            texture.textureCompression = TextureImporterCompression.CompressedHQ;
            texture.SaveAndReimport();
        }
        ImportMixamo();
        BuildCharacter(false);
        BuildCharacter(true);
    }
    static void BuildCharacter(bool female)
    {
        string bodyName = female ? "Female" : "Male";
        string prefabPath = female ? "Assets/Resources/QuaterniusFemale.prefab" : Prefab;
        string output = female ? Output + "Female/" : Output;
        Directory.CreateDirectory(Output);
        Directory.CreateDirectory(output);
        Directory.CreateDirectory("Assets/Resources");
        AssetDatabase.Refresh();
        foreach (var path in new[] { Source + "Superhero_" + bodyName + "_FullBody.fbx", Added + bodyName + "_Peasant.fbx", Added + "Hair_Buzzed.fbx" })
        {
            var importer = (ModelImporter)AssetImporter.GetAtPath(path);
            importer.isReadable = true;
            importer.SaveAndReimport();
        }
        var root = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(Source + "Superhero_" + bodyName + "_FullBody.fbx"));
        root.name = "Quaternius " + bodyName;
        var bones = root.GetComponentsInChildren<Transform>().ToDictionary(t => t.name);
        var skin = Material(female ? "Female skin" : "Skin dark", female ? Added + "T_Superhero_Female_Dark_BaseColor.png" : Source + "T_Superhero_Male_Dark.png");
        var hands = Material(female ? "Female hands" : "Hands dark", Added + "T_Regular_" + bodyName + "_Dark_BaseColor.png");
        var cloth = Material("Fantasy cloth", Added + "T_Peasant_BaseColor.png");
        var hair = Material("Hair", Added + "T_Hair_1_BaseColor.png");
        var eyes = Material("Eyes", Source + "T_Eye_Brown.png");
        eyes.SetFloat("_EyeMode", 1);
        foreach (var renderer in root.GetComponentsInChildren<SkinnedMeshRenderer>())
            renderer.sharedMaterial = renderer.name == "Eyes" ? eyes : renderer.name == "Eyebrows" ? hair : skin;
        var body = root.GetComponentsInChildren<SkinnedMeshRenderer>().Single(r => r.name.Equals("Superhero_" + bodyName, StringComparison.OrdinalIgnoreCase));
        var original = body.sharedMesh;
        var feet = new GameObject("Bare feet");
        feet.transform.SetParent(body.transform.parent, false);
        feet.transform.localPosition = body.transform.localPosition;
        feet.transform.localRotation = body.transform.localRotation;
        feet.transform.localScale = body.transform.localScale;
        var bare = feet.AddComponent<SkinnedMeshRenderer>();
        bare.sharedMesh = Section(body, original, female ? "Female bare feet" : "Bare feet", v => v.y < .43f);
        bare.bones = body.bones; bare.rootBone = body.rootBone; bare.sharedMaterial = skin;
        bare.localBounds = body.localBounds;
        UnityEngine.Object.DestroyImmediate(body.gameObject);
        AssetDatabase.DeleteAsset(Output + "Head.asset");
        var fantasyHead = Hair(Added + (female ? "FemaleHead.fbx" : "Head.fbx"), root, bones, skin);
        var outfit = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(Added + bodyName + "_Peasant.fbx"));
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
        appearance.buzzed = Hair(Added + (female ? "Female_Hair_Buzzed.fbx" : "Hair_Buzzed.fbx"), root, bones, hair);
        appearance.buns = Hair(Source + "Hair_Buns_Rigged.fbx", root, bones, hair);
        appearance.longHair = Hair("Assets/Characters/Personalization/Hair_Long.fbx", root, bones, hair);
        appearance.skinMaterial = skin; appearance.handsMaterial = hands;
        appearance.hairMaterial = hair; appearance.eyeMaterial = eyes;
        appearance.fantasyTop = outfitParts.Where(p => p.name.EndsWith("_Body") || p.name.EndsWith("_Arms"))
            .Select(p => p.gameObject).Append(fantasyHead).ToArray();
        appearance.fantasyTrousers = outfitParts.Single(p => p.name.EndsWith("_Legs")).gameObject;
        appearance.sportTrousers = Hair("Assets/Characters/Personalization/" + bodyName + "_SportTrousers.fbx", root, bones, cloth);
        appearance.guinzz = Hair("Assets/Characters/LesGuinzz/" + bodyName + "_LesGuinzz.fbx", root, bones, cloth);
        var guinzzRenderer = appearance.guinzz.GetComponent<SkinnedMeshRenderer>();
        var guinzzMaterials = new[] { "fabric", "panel", "cuffs" }.Select(part => {
            string path = "Assets/Characters/LesGuinzz/" + part + ".mat";
            var mat = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (mat == null) { mat = new Material(Shader.Find("Universal Render Pipeline/Lit")); AssetDatabase.CreateAsset(mat, path); }
            mat.SetColor("_BaseColor", part == "fabric" ? new Color(.43f,.16f,.72f) : part == "panel" ? new Color(.05f,.85f,.9f) : new Color(.045f,.055f,.09f));
            mat.SetFloat("_Smoothness", .15f); mat.SetFloat("_Metallic", 0);
            EditorUtility.SetDirty(mat); return mat;
        }).ToArray();
        var sourceGuinzz = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Characters/LesGuinzz/" + bodyName + "_LesGuinzz.fbx").GetComponentInChildren<SkinnedMeshRenderer>();
        guinzzRenderer.sharedMaterials = sourceGuinzz.sharedMaterials.Select(m => guinzzMaterials[m.name.Contains("panel") ? 1 : m.name.Contains("cuffs") ? 2 : 0]).ToArray();
        guinzzRenderer.quality = SkinQuality.Bone4;
        appearance.guinzzMaterial = guinzzMaterials[0];
        appearance.guinzzFullMesh = guinzzRenderer.sharedMesh;
        var bootMesh = UnityEngine.Object.Instantiate(guinzzRenderer.sharedMesh);
        var guinzzVertices = bootMesh.vertices;
        for (int sub = 0; sub < bootMesh.subMeshCount; sub++)
        {
            var triangles = bootMesh.GetTriangles(sub);
            bootMesh.SetTriangles(Enumerable.Range(0, triangles.Length / 3).Where(i => Enumerable.Range(0, 3)
                .All(j => guinzzRenderer.transform.TransformPoint(guinzzVertices[triangles[i * 3 + j]]).y >= .397f))
                .SelectMany(i => new[] { triangles[i * 3], triangles[i * 3 + 1], triangles[i * 3 + 2] }).ToArray(), sub);
        }
        var bootMeshPath = "Assets/Characters/LesGuinzz/" + bodyName + "_Boots.asset";
        AssetDatabase.DeleteAsset(bootMeshPath); AssetDatabase.CreateAsset(bootMesh, bootMeshPath);
        appearance.guinzzBootMesh = bootMesh;
        var sport = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Characters/Personalization/" + bodyName + "_Sport.fbx"));
        var sportParts = sport.GetComponentsInChildren<SkinnedMeshRenderer>();
        var shirtPath = Output + "Sport shirt " + bodyName + ".mat";
        var shirt = AssetDatabase.LoadAssetAtPath<Material>(shirtPath);
        if (shirt == null) { shirt = new Material(Shader.Find("Universal Render Pipeline/Lit")); AssetDatabase.CreateAsset(shirt, shirtPath); }
        shirt.shader = Shader.Find("Universal Render Pipeline/Lit");
        shirt.SetFloat("_Cull", 0); // Thin cotton renders on both sides inside open sleeves.
        shirt.SetColor("_BaseColor", Color.white);
        shirt.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/Characters/Personalization/" + bodyName + "_Tshirt_BaseColor.png"));
        shirt.SetTexture("_BumpMap", AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/Characters/Personalization/" + bodyName + "_Tshirt_Normal.png"));
        shirt.SetTexture("_MetallicGlossMap", AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/Characters/Personalization/" + bodyName + "_Tshirt_MetallicSmoothness.png"));
        shirt.SetFloat("_BumpScale", .55f); shirt.SetFloat("_Metallic", 0); shirt.SetFloat("_Smoothness", .75f);
        shirt.EnableKeyword("_NORMALMAP"); shirt.EnableKeyword("_METALLICSPECGLOSSMAP");
        EditorUtility.SetDirty(shirt);
        appearance.shirtMaterial = shirt;
        foreach (var part in sportParts)
        {
            part.transform.SetParent(root.transform, true);
            part.bones = part.bones.Select(b => bones[b.name]).ToArray();
            part.rootBone = bones[part.rootBone.name];
            part.sharedMaterials = part.sharedMaterials.Select(m => part.name.EndsWith("_Skin") ? skin : shirt).ToArray();
            part.updateWhenOffscreen = true;
        }
        appearance.sportTop = sportParts.Select(p => p.gameObject).ToArray();
        foreach (var part in sportParts) part.quality = SkinQuality.Bone4;
        UnityEngine.Object.DestroyImmediate(sport);
        appearance.Customize("tan", "brown", "brown", false, "cyan");
        appearance.SelectHair(female ? "buns" : "parted");
        var pose = root.AddComponent<FighterPose>();
        pose.actor = root.GetComponent<Animator>();
        appearance.headbands = new[] { "parted", "buzzed", "buns" }.Select(style => {
            var band = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Characters/BandeauEclair/" + bodyName + "-" + style + ".fbx"));
            band.name = "Bandeau éclair " + style;
            band.transform.SetParent(pose.actor.GetBoneTransform(HumanBodyBones.Head), true);
            band.GetComponentInChildren<MeshRenderer>().sharedMaterial = Material("Bandeau éclair", "Assets/Characters/BandeauEclair/BaseColor.png");
            return band;
        }).ToArray();
        appearance.SetHeadband(false);
        GoldenBoxingGloves.Install(root, bodyName);
        var clips = AssetDatabase.LoadAllAssetsAtPath("Assets/Animations/Quaternius/UAL2Clean.fbx").OfType<AnimationClip>().ToArray();
        var idle = ForwardIdle(clips.Single(c => c.name == "Armature|Idle_No_Loop"));
        pose.clips = new[] { FittedMixamo("BoxingIdle"), FittedMixamo("BackHandCross"), clips.Single(c => c.name == "Armature|Idle_Shield_Break"),
            FittedMixamo("BackHandUppercut"), FittedMixamo("DodgeRetreat"), FittedMixamo("JabCrossCombo"), FittedMixamo("BackHandCross"), idle };
        pose.contacts = new[] { .5f, .30f, .28f, .37f, .15f, .30f, .30f, .5f };
        pose.shoes = new[] { outfitParts.Single(p => p.name == bodyName + "_Peasant_Feet").transform };
        pose.bareFeet = feet;
        pose.SetShoes(true);
        pose.facing = 0; pose.azimuth = 25; pose.inspect = true;
        pose.headViewOffset = .1f; pose.headViewSize = .25f;
        hair.SetColor("_BaseColor", new Color(.17f, .085f, .04f));
        var light = new GameObject("Soft showcase key", typeof(Light)).GetComponent<Light>();
        light.transform.SetParent(root.transform, false);
        light.type = LightType.Directional; light.intensity = 1.5f; light.transform.localRotation = Quaternion.Euler(35, 150, 0);
        // The inspection camera follows a crouching head; static imported bounds
        // otherwise cull its eyes/hair while their vertices are still in view.
        foreach (var renderer in root.GetComponentsInChildren<SkinnedMeshRenderer>(true)) renderer.updateWhenOffscreen = true;
        PrefabUtility.SaveAsPrefabAsset(root, prefabPath);
        UnityEngine.Object.DestroyImmediate(root);

        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        var camera = new GameObject("Showcase Camera", typeof(Camera)).GetComponent<Camera>();
        camera.tag = "MainCamera"; camera.orthographic = true; camera.orthographicSize = 1.1f;
        camera.clearFlags = CameraClearFlags.SolidColor; camera.backgroundColor = new Color(.055f, .07f, .10f);
        camera.transform.position = new Vector3(0, 1.25f, 5); camera.transform.LookAt(new Vector3(0, .95f, 0));
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat; RenderSettings.ambientLight = new Color(.6f, .6f, .6f);
        var pilot = (GameObject)PrefabUtility.InstantiatePrefab(AssetDatabase.LoadAssetAtPath<GameObject>(prefabPath));
        pilot.GetComponent<FighterPose>().inspectionCamera = camera;
        EditorSceneManager.SaveScene(scene, output + "CharacterShowcase.unity");
        AssetDatabase.SaveAssets();
        ValidatePrefab(prefabPath);
    }

    static AnimationClip Mixamo(string name) => AssetDatabase.LoadAllAssetsAtPath("Assets/Animations/Mixamo/" + name + ".fbx")
        .OfType<AnimationClip>().Single(c => !c.name.StartsWith("__preview__"));

    static AnimationClip FittedMixamo(string sourceName)
    {
        var clip = UnityEngine.Object.Instantiate(Mixamo(sourceName));
        clip.name = sourceName == "BackHandUppercut" ? "Quaternius uppercut" : "Quaternius " + sourceName;
        // Fit the Mixamo arm envelope to both Quaternius bodies, including the
        // shared guard blended into each attack. Keep the source FBX intact.
        foreach (var name in new[] { "Left Arm Front-Back", "Right Arm Front-Back", "Left Forearm Stretch", "Right Forearm Stretch", "Left Arm Twist In-Out", "Right Arm Twist In-Out" })
        {
            var binding = EditorCurveBinding.FloatCurve("", typeof(Animator), name);
            var curve = AnimationUtility.GetEditorCurve(clip, binding);
            if (curve == null) throw new Exception("Missing Mixamo muscle: " + name);
            var keys = curve.keys;
            // Open the elbows and separate the guard from the striking forearm.
            float offset = name.Contains("Forearm") ? .35f
                : name == "Left Arm Twist In-Out" ? .3f
                : name == "Right Arm Twist In-Out" ? (sourceName == "JabCrossCombo" ? .3f : .2f) : -.28f;
            for (int i = 0; i < keys.Length; i++) keys[i].value += offset;
            curve.keys = keys;
            AnimationUtility.SetEditorCurve(clip, binding, curve);
        }
        var path = Output + (sourceName == "BackHandUppercut" ? "Fitted uppercut.anim" : "Fitted " + sourceName + ".anim");
        var saved = AssetDatabase.LoadAssetAtPath<AnimationClip>(path);
        if (saved == null) { AssetDatabase.CreateAsset(clip, path); return clip; }
        EditorUtility.CopySerialized(clip, saved);
        UnityEngine.Object.DestroyImmediate(clip);
        return saved;
    }

    static void ImportMixamo()
    {
        foreach (var path in Directory.GetFiles("Assets/Animations/Mixamo", "*.fbx"))
        {
            var importer = (ModelImporter)AssetImporter.GetAtPath(path);
            importer.animationType = ModelImporterAnimationType.Human;
            importer.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
            importer.animationCompression = ModelImporterAnimationCompression.Off;
            var clips = importer.defaultClipAnimations;
            foreach (var clip in clips)
            {
                clip.name = Path.GetFileNameWithoutExtension(path);
                clip.lockRootRotation = clip.lockRootHeightY = true;
                // Extract horizontal motion; the arena owns travel, Animator.applyRootMotion is false.
                clip.lockRootPositionXZ = false;
                clip.keepOriginalOrientation = true;
                clip.heightFromFeet = true;
                clip.loopTime = clip.loopPose = clip.name == "BoxingIdle";
            }
            importer.clipAnimations = clips;
            importer.SaveAndReimport();
        }
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
        material.SetTexture("_BaseMap", texture == null ? null : AssetDatabase.LoadAssetAtPath<Texture2D>(texture));
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
        ValidatePrefab(Prefab);
        ValidatePrefab("Assets/Resources/QuaterniusFemale.prefab");
    }
    static void ValidatePrefab(string path)
    {
        var instance = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(path));
        try
        {
            var pose = instance.GetComponent<FighterPose>();
            if (!pose.actor.isHuman || !pose.actor.avatar.isValid) throw new Exception("Invalid Humanoid");
            if (pose.clips.Length != 8 || pose.clips.Any(c => c == null) || pose.contacts.Length != pose.clips.Length
                || pose.contacts.Any(c => c <= 0 || c >= 1)) throw new Exception("Missing clip/contact mapping");
            if (pose.actor.GetBoneTransform(HumanBodyBones.RightIndexDistal) == null) throw new Exception("Missing fingers");
            var appearance = instance.GetComponent<QuaterniusAppearance>();
            foreach (var style in new[] { "buzzed", "parted", "buns", "long" })
            {
                appearance.SelectHair(style);
                if (new[] { appearance.parted, appearance.buzzed, appearance.buns, appearance.longHair }.Count(h => h.activeSelf) != 1
                    || appearance.buzzed.activeSelf != (style == "buzzed") || appearance.buns.activeSelf != (style == "buns"))
                    throw new Exception("Hair selection failed");
            }
            foreach (bool equipped in new[] { false, true })
            {
                pose.SetShoes(equipped);
                if (pose.shoes.Any(s => s.gameObject.activeSelf != equipped) || pose.bareFeet.activeSelf == equipped)
                    throw new Exception("Boot selection failed");
                if (appearance.guinzz.GetComponent<SkinnedMeshRenderer>().sharedMesh != (equipped ? appearance.guinzzBootMesh : appearance.guinzzFullMesh))
                    throw new Exception("Guinzz boot coverage failed");
            }
            foreach (var renderer in instance.GetComponentsInChildren<SkinnedMeshRenderer>(true))
                if (renderer.bones.Any(b => b == null) || renderer.sharedMaterials.Any(m => m == null)) throw new Exception("Missing binding/material");
            foreach (bool sport in new[] { true, false })
            {
                appearance.Customize("deep", "blue", "blond", sport, "coral");
                if (appearance.sportTop.Length != 2 || appearance.fantasyTop.Length != 3
                    || appearance.sportTop.Any(p => p.activeSelf != sport) || appearance.fantasyTop.Any(p => p.activeSelf == sport))
                    throw new Exception("Sport top replacement failed");
            }
            var sportSkin = appearance.sportTop.Single(p => p.name.EndsWith("_Sport_Skin")).GetComponent<SkinnedMeshRenderer>();
            foreach (string pants in new[] { "original", "violet", "cyan", "coral" })
            {
                appearance.Customize("deep", "blue", "blond", true, "coral", pants);
                if (appearance.guinzz.activeSelf != (pants != "original") || appearance.sportTrousers.activeSelf != (pants == "original"))
                    throw new Exception("Guinzz replacement failed: " + pants);
                var renderer = appearance.guinzz.GetComponent<SkinnedMeshRenderer>();
                if (renderer.sharedMesh.subMeshCount != renderer.sharedMaterials.Length || renderer.quality != SkinQuality.Bone4)
                    throw new Exception("Guinzz material or skinning mismatch");
            }
            appearance.Customize("deep", "blue", "blond", false, "coral", "violet");
            if (appearance.guinzz.activeSelf || appearance.sportTrousers.activeSelf || !appearance.fantasyTrousers.activeSelf)
                throw new Exception("Guinzz leaked into fantasy outfit");
            appearance.Customize("deep", "blue", "blond", true, "coral");
            if (sportSkin.sharedMaterials.Any(m => m != appearance.skinMaterial))
                throw new Exception("Sport anatomy must use the skin material");
            var skinRenderer = instance.GetComponentsInChildren<SkinnedMeshRenderer>(true).First(r => r.sharedMaterial == appearance.skinMaterial);
            var properties = new MaterialPropertyBlock(); skinRenderer.GetPropertyBlock(properties, 0);
            if (!Mathf.Approximately(properties.GetColor("_BaseColor").r, .37f)) throw new Exception("Skin tint not applied");
            var peer = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(path));
            try
            {
                peer.GetComponent<QuaterniusAppearance>().Customize("light", "green", "black", true, "cyan");
                skinRenderer.GetPropertyBlock(properties, 0);
                if (!Mathf.Approximately(properties.GetColor("_BaseColor").r, .37f)
                    || appearance.skinMaterial.GetColor("_BaseColor") != Color.white)
                    throw new Exception("Customization leaked between actors/shared materials");
            }
            finally { UnityEngine.Object.DestroyImmediate(peer); }
            if (appearance.headbands.Length != 3) throw new Exception("Missing headband fits");
            foreach (var style in new[] { "parted", "buzzed", "buns" })
            {
                appearance.SelectHair(style);
                foreach (bool equipped in new[] { false, true })
                {
                    appearance.SetHeadband(equipped);
                    if (appearance.headbands.Count(b => b.activeSelf) != (equipped ? 1 : 0))
                        throw new Exception("Headband selection failed");
                }
            }
            appearance.SelectHair("long"); appearance.SetHeadband(true);
            if (appearance.headbands.Any(b => b.activeSelf)) throw new Exception("Unfitted long-hair band must stay hidden");
            Debug.Log("Quaternius POC: Humanoid, fingers, three hair options, headband, boots and bone bindings PASS: " + path);
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
