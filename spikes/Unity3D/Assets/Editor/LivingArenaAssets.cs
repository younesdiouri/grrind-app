using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEngine;

public static class LivingArenaAssets
{
    const string Folder = "Assets/Spike/LivingArena/";
    static AnimationClip Clip(string name) => AssetDatabase.LoadAllAssetsAtPath("Assets/Animations/Quaternius/UAL2Clean.fbx")
        .OfType<AnimationClip>().Single(c => c.name == "Armature|" + name);
    static void Call(FighterPose pose, string method) => typeof(FighterPose)
        .GetMethod(method, BindingFlags.Instance | BindingFlags.NonPublic).Invoke(pose, null);
    // Replace the native mesh so its GPU buffer matches the regenerated vertices during Editor review.
    static void Save(UnityEngine.Object value, string path) => AssetDatabase.CreateAsset(value, path);
    static Material Material(string name, Color color)
    {
        var mat = ToonMaterials.At(Folder + name + ".mat");
        mat.SetColor("_BaseColor", color); mat.SetFloat("_ReceiveShadows", 0); ToonMaterials.Facets(mat, .6f); return mat;
    }
    static GameObject Box(string name, Transform parent, Vector3 center, Vector3 size, Material material)
    {
        var obj = GameObject.CreatePrimitive(PrimitiveType.Cube); obj.name = name;
        UnityEngine.Object.DestroyImmediate(obj.GetComponent<Collider>());
        obj.transform.SetParent(parent, false); obj.transform.localPosition = center; obj.transform.localScale = size;
        obj.GetComponent<MeshRenderer>().sharedMaterial = material; return obj;
    }
    public static void Build()
    {
        if (EditorApplication.isPlaying) throw new InvalidOperationException("Build assets outside Play mode");
        Directory.CreateDirectory(Folder); AssetDatabase.Refresh();
        var root = new GameObject("Living arena");
        try
        {
            var life = root.AddComponent<ArenaLife>();
            var wood = Material("Bleacher timber", new Color(.13f,.22f,.26f));
            var snow = Material("Snow ledge", new Color(.68f,.82f,.87f));
            var cyan = Material("Cyan supporters", new Color(.08f,.63f,.71f));
            var violet = Material("Violet supporters", new Color(.45f,.23f,.65f));
            for (int side = -1; side <= 1; side += 2)
            {
                var stand = new GameObject(side < 0 ? "West stand" : "East stand"); stand.transform.SetParent(root.transform, false);
                for (int row = 0; row < 3; row++)
                {
                    float top = .2f + row * .34f, z = -1.6f - row * .68f;
                    Box("Timber tier", stand.transform, new Vector3(side * 2.25f, top * .5f, z), new Vector3(2.45f,top,.7f), wood);
                    Box("Snow on tier", stand.transform, new Vector3(side * 2.25f,top,z + .33f), new Vector3(2.46f,.035f,.08f), snow);
                    Box("Seat stripe", stand.transform, new Vector3(side * 2.25f,top + .015f,z - .12f), new Vector3(2.44f,.035f,.18f), side < 0 ? cyan : violet);
                }
                Box("Back rail", stand.transform, new Vector3(side * 2.25f,1.22f,-3.18f), new Vector3(2.5f,.08f,.08f), wood);
                foreach (float x in new[] { 1.05f, 3.45f })
                    Box("Rail post", stand.transform, new Vector3(side * x,.65f,-3.18f), new Vector3(.08f,1.3f,.08f), wood);
            }
            life.malePoses = Crowd(false, out var male); life.maleMaterials = male;
            life.femalePoses = Crowd(true, out var female); life.femaleMaterials = female;
            life.referee = Referee(root.transform);
            var source = Resources.Load<GameObject>("QuaterniusShowcase").GetComponent<FighterPose>();
            life.refereeClips = new[] { source.clips[7], Clip("Consume"), Clip("Walk_Carry_Loop") };
            PrefabUtility.SaveAsPrefabAsset(root, "Assets/Resources/LivingArena.prefab"); AssetDatabase.SaveAssets();
            Debug.Log("Living arena assets: 18 shared-mesh spectators, two stands, bald striped referee");
        }
        finally { UnityEngine.Object.DestroyImmediate(root); }
    }

    static Animator Referee(Transform parent)
    {
        var obj = UnityEngine.Object.Instantiate(Resources.Load<GameObject>("QuaterniusShowcase"), parent);
        obj.name = "Referee"; obj.transform.localPosition = new Vector3(.65f,0,-3.6f); obj.transform.localScale = Vector3.one * .96f;
        var appearance = obj.GetComponent<QuaterniusAppearance>();
        appearance.SetHeadband(false); appearance.SetBoxingGloves(false);
        obj.GetComponent<WeaponGrip>()?.Select("");
        foreach (var hair in appearance.hairs) hair.SetActive(false);
        foreach (var light in obj.GetComponentsInChildren<Light>()) light.enabled = false;
        var black = Material("Referee black", new Color(.025f,.03f,.04f));
        var white = Material("Referee white", new Color(.94f,.94f,.91f));
        appearance.sportTrousers.GetComponent<SkinnedMeshRenderer>().sharedMaterial = black;
        var shirt = obj.GetComponentsInChildren<SkinnedMeshRenderer>().Single(r => r.name.Contains("Tshirt"));
        var mesh = UnityEngine.Object.Instantiate(shirt.sharedMesh); mesh.name = "Faceted referee stripes";
        var vertices = mesh.vertices; var triangles = mesh.triangles;
        var bands = new[] { new List<int>(), new List<int>() };
        for (int i = 0; i < triangles.Length; i += 3)
        {
            float x = (vertices[triangles[i]].x + vertices[triangles[i+1]].x + vertices[triangles[i+2]].x) / 3;
            var band = bands[Mathf.Abs(Mathf.FloorToInt((x + .04f) / .075f)) % 2];
            band.Add(triangles[i]); band.Add(triangles[i+1]); band.Add(triangles[i+2]);
        }
        mesh.subMeshCount = 2; mesh.SetTriangles(bands[0],0); mesh.SetTriangles(bands[1],1);
        Save(mesh, Folder + "Referee shirt.asset"); shirt.sharedMesh = AssetDatabase.LoadAssetAtPath<Mesh>(Folder + "Referee shirt.asset");
        shirt.sharedMaterials = new[] { black, white };
        var pose = obj.GetComponent<FighterPose>();
        var head = pose.actor.GetBoneTransform(HumanBodyBones.Head);
        var whistle = Box("Whistle", head, Vector3.zero, new Vector3(.035f,.025f,.06f), Material("Whistle gold", new Color(1,.7f,.16f)));
        whistle.transform.position = head.position + obj.transform.forward * .105f - Vector3.up * .055f;
        var animator = pose.actor;
        UnityEngine.Object.DestroyImmediate(pose);
        UnityEngine.Object.DestroyImmediate(obj.GetComponent<WeaponGrip>());
        UnityEngine.Object.DestroyImmediate(obj.GetComponent<UnityEngine.Animations.Rigging.RigBuilder>());
        return animator;
    }

    static Mesh[] Crowd(bool female, out Material[] materials)
    {
        string name = female ? "Female" : "Male";
        var root = UnityEngine.Object.Instantiate(Resources.Load<GameObject>(female ? "QuaterniusFemale" : "QuaterniusShowcase"));
        var pose = root.GetComponent<FighterPose>();
        var combined = new List<Mesh>();
        try
        {
            pose.inspect = false; pose.facing = 0;
            // Existing athlete rig, posed once into scenery meshes rather than 18 live Animators.
            Call(pose, "Awake");
            var renderers = root.GetComponentsInChildren<Renderer>().Where(r => r is SkinnedMeshRenderer || r.GetComponent<MeshFilter>() != null).ToArray();
            var original = renderers.SelectMany(r => r.sharedMaterials).Distinct().ToArray();
            materials = original;
            var result = new Mesh[3];
            for (int frame = 0; frame < 3; frame++)
            {
                pose.stance = 7; pose.phase = .4f; Call(pose, "LateUpdate");
                if (frame > 0) Cheer(pose, false);
                if (frame > 1) Cheer(pose, true);
                var groups = original.Select(_ => new List<CombineInstance>()).ToArray();
                foreach (var renderer in renderers)
                {
                    Mesh source;
                    if (renderer is SkinnedMeshRenderer skin) { source = new Mesh(); skin.BakeMesh(source); combined.Add(source); }
                    else source = renderer.GetComponent<MeshFilter>().sharedMesh;
                    for (int slot = 0; slot < source.subMeshCount; slot++)
                        groups[Array.IndexOf(original, renderer.sharedMaterials[slot])].Add(new CombineInstance {
                            mesh = source, subMeshIndex = slot, transform = root.transform.worldToLocalMatrix * renderer.transform.localToWorldMatrix
                        });
                }
                var parts = groups.Select(group => { var part = new Mesh(); part.CombineMeshes(group.ToArray(),true,true); combined.Add(part); return new CombineInstance { mesh = part }; }).ToArray();
                var mesh = new Mesh { name = name + " supporter " + frame }; mesh.CombineMeshes(parts,false,false);
                Save(mesh, Folder + name + " supporter " + frame + ".asset");
                result[frame] = AssetDatabase.LoadAssetAtPath<Mesh>(Folder + name + " supporter " + frame + ".asset");
            }
            return result;
        }
        finally
        {
            Call(pose, "OnDestroy");
            foreach (var mesh in combined) UnityEngine.Object.DestroyImmediate(mesh);
            UnityEngine.Object.DestroyImmediate(root);
        }
    }

    static void Cheer(FighterPose pose, bool left)
    {
        var arm = pose.Bone(left ? HumanBodyBones.LeftUpperArm : HumanBodyBones.RightUpperArm);
        var forearm = pose.Bone(left ? HumanBodyBones.LeftLowerArm : HumanBodyBones.RightLowerArm);
        var hand = pose.Bone(left ? HumanBodyBones.LeftHand : HumanBodyBones.RightHand);
        float side = left ? -1 : 1;
        arm.rotation = Quaternion.FromToRotation(forearm.position - arm.position, new Vector3(side * .65f,1,.05f)) * arm.rotation;
        forearm.rotation = Quaternion.FromToRotation(hand.position - forearm.position, new Vector3(side * .15f,1,0)) * forearm.rotation;
    }
}
