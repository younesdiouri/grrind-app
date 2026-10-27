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
        var material = ToonMaterials.At(Folder + "Stone.mat");
        material.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>(Folder + "BaseColor.png"));
        material.SetColor("_BaseColor", Color.white);
        var clips = AssetDatabase.LoadAllAssetsAtPath(Folder + "Cailloux.fbx").OfType<AnimationClip>()
            .Where(c => !c.name.StartsWith("__preview__", StringComparison.Ordinal)).ToArray();
        var root = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(Folder + "Cailloux.fbx"));
        try
        {
            root.name = "Cailloux";
            var animator = root.GetComponent<Animator>();
            var pose = root.AddComponent<FighterPose>();
            pose.actor = animator; pose.inspect = false;
            var bones = root.GetComponentsInChildren<Transform>();
            pose.genericBones = new Transform[(int)HumanBodyBones.LastBone];
            foreach (HumanBodyBones bone in Enum.GetValues(typeof(HumanBodyBones)))
            {
                if (bone == HumanBodyBones.LastBone) continue;
                string name = bone == HumanBodyBones.Chest ? "Spine" : bone == HumanBodyBones.Neck ? "neck" : bone.ToString();
                pose.genericBones[(int)bone] = Array.Find(bones, t => t.name == name);
            }
            var source = Poses.Select(name => clips.Single(c => c.name.Split('|').Last() == name)).ToArray();
            pose.clips = source.Append(Knockout(root, source[2])).ToArray();
            pose.contacts = Enumerable.Repeat(.5f, source.Length).Append(.05f).ToArray();
            pose.movesets = new[] { new FighterPose.Moveset { family = "FIST", rest = 0,
                clips = new[] { 0, 1, 2, 3, 4, 5, 6, 7, 8, 5 } } };
            root.transform.Find("CR_Cailloux_Rig").localPosition = Vector3.zero;
            source[0].SampleAnimation(root, 0);
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

    // The stone keeps its rigid authored hit, then tips onto its back and stays grounded.
    static AnimationClip Knockout(GameObject root, AnimationClip hit)
    {
        var clip = new AnimationClip { name = "Cailloux Knockout", frameRate = 30, wrapMode = WrapMode.ClampForever };
        var rig = root.transform.Find("CR_Cailloux_Rig");
        var renderer = root.GetComponentInChildren<SkinnedMeshRenderer>();
        var bindings = AnimationUtility.GetCurveBindings(hit).Where(b => b.type == typeof(Transform)
            && (b.propertyName.StartsWith("m_LocalRotation") || b.propertyName.StartsWith("m_LocalPosition")))
            .Concat(new[] { "x", "y", "z" }.Select(axis => EditorCurveBinding.FloatCurve("CR_Cailloux_Rig", typeof(Transform), "m_LocalPosition." + axis)))
            .Distinct().ToArray();
        var transforms = bindings.Select(b => root.transform.Find(b.path)).ToArray();
        var keys = bindings.Select(_ => new Keyframe[31]).ToArray();
        var baked = new Mesh();
        try
        {
            for (int frame = 0; frame <= 30; frame++)
            {
                float t = frame / 30f;
                rig.localPosition = Vector3.zero;
                hit.SampleAnimation(root, Mathf.Min(.5f, t * 6) * hit.length);
                float fall = Mathf.SmoothStep(0, 1, Mathf.InverseLerp(.1f, 1, t));
                rig.localRotation = Quaternion.AngleAxis(-85 * fall, Vector3.right) * rig.localRotation;
                renderer.BakeMesh(baked);
                float floor = baked.vertices.Min(v => renderer.transform.TransformPoint(v).y);
                rig.position -= Vector3.up * floor;
                for (int i = 0; i < bindings.Length; i++)
                {
                    var transform = transforms[i];
                    Vector4 value = bindings[i].propertyName.StartsWith("m_LocalRotation")
                        ? new Vector4(transform.localRotation.x, transform.localRotation.y, transform.localRotation.z, transform.localRotation.w)
                        : (Vector4)transform.localPosition;
                    int axis = "xyzw".IndexOf(bindings[i].propertyName.Last());
                    keys[i][frame] = new Keyframe(t, value[axis]);
                }
            }
            for (int i = 0; i < bindings.Length; i++)
            {
                // The sampled hit holds most bones still; retain endpoints rather than serializing 31 identical keys.
                var curve = new AnimationCurve(keys[i].Where((key, k) => k == 0 || k == 30
                    || Mathf.Abs(key.value - keys[i][k - 1].value) > .000001f
                    || Mathf.Abs(key.value - keys[i][k + 1].value) > .000001f).ToArray());
                for (int k = 0; k < curve.length; k++)
                {
                    AnimationUtility.SetKeyLeftTangentMode(curve, k, AnimationUtility.TangentMode.Linear);
                    AnimationUtility.SetKeyRightTangentMode(curve, k, AnimationUtility.TangentMode.Linear);
                }
                AnimationUtility.SetEditorCurve(clip, bindings[i], curve);
            }
            clip.EnsureQuaternionContinuity();
            string path = Folder + "Knockout.anim";
            var saved = AssetDatabase.LoadAssetAtPath<AnimationClip>(path);
            if (saved == null) { AssetDatabase.CreateAsset(clip, path); saved = clip; }
            else { EditorUtility.CopySerialized(clip, saved); UnityEngine.Object.DestroyImmediate(clip); }
            EditorUtility.SetDirty(saved);
            return saved;
        }
        finally { UnityEngine.Object.DestroyImmediate(baked); }
    }

    public static void Validate()
    {
        var prefab = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Resources/Cailloux.prefab");
        var pose = prefab.GetComponent<FighterPose>();
        if (pose.movesets.Length != 1 || pose.movesets[0].family != "FIST"
            || pose.movesets[0].clips.Length != 10
            || pose.movesets[0].clips.Any(i => i < 0 || i >= pose.clips.Length)
            || pose.contacts.Length != pose.clips.Length)
            throw new Exception("Cailloux: missing complete FIST moveset (guard through victory)");
        if (pose.actor.isHuman || pose.clips.Length != 9 || pose.clips.Any(c => c == null))
            throw new Exception("Cailloux: missing Generic rig or presentation clip");
        var mesh = prefab.GetComponentInChildren<SkinnedMeshRenderer>().sharedMesh;
        foreach (var bone in new[] { HumanBodyBones.Chest, HumanBodyBones.Head, HumanBodyBones.RightHand, HumanBodyBones.LeftHand })
            if (pose.Bone(bone) == pose.actor.transform) throw new Exception("Cailloux: missing presentation socket " + bone);
        if (mesh.triangles.Length / 3 != 6189 || mesh.uv.Length == 0 || mesh.bindposes.Length != 24)
            throw new Exception("Cailloux: geometry, UV or bind changed during import");
        Debug.Log("Cailloux: Generic rig, complete FIST moveset, 9 clips, UV and 24 bones PASS");
    }
}
