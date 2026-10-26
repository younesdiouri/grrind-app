using System;
using System.Linq;
using UnityEditor;
using UnityEngine;

/** Default athlete sneakers (#281): one faceted Blender shoe, fitted on each bare foot and skinned to foot and ball. */
public static class AthleteSneakers
{
    const string Folder = "Assets/Characters/AthleteSneakers/";
    static readonly (string name, Color colour)[] Parts =
        { ("Sole", new Color(.9f, .93f, .95f)), ("Stripe", new Color(.32f, .37f, .46f)), ("Trim", new Color(.32f, .37f, .46f)), ("Upper", new Color(.1f, .12f, .19f)) };

    public static void Install(GameObject root, SkinnedMeshRenderer bareFeet)
    {
        var importer = (ModelImporter)AssetImporter.GetAtPath(Folder + "Sneaker.fbx");
        importer.isReadable = true; importer.materialImportMode = ModelImporterMaterialImportMode.None; importer.SaveAndReimport();
        var source = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(Folder + "Sneaker.fbx"));
        var filter = source.GetComponentInChildren<MeshFilter>();
        // Shoe space: toe towards -Z like the characters, sole on y = 0, centred on the foot.
        // The FBX arrives heel towards -Z: a half turn puts the toe forward.
        var shoe = filter.sharedMesh.vertices.Select(v => source.transform.InverseTransformPoint(filter.transform.TransformPoint(v)))
            .Select(v => new Vector3(-v.x, v.y, -v.z)).ToArray();
        var sourceMesh = filter.sharedMesh;
        UnityEngine.Object.DestroyImmediate(source);
        var materials = Parts.Select(part => {
            var material = ToonMaterials.At(Folder + part.name + ".mat");
            material.SetColor("_BaseColor", part.colour);
            return material;
        }).ToArray();
        var animator = root.GetComponent<Animator>();
        var foot = new Mesh(); bareFeet.BakeMesh(foot);
        var soles = foot.vertices.Select(v => bareFeet.transform.TransformPoint(v)).Where(v => v.y < .05f).ToArray();
        string body = root.name.Contains("Female") ? "Female" : "Male";
        foreach (var (side, footBone, ballBone) in new[] { ("l", HumanBodyBones.LeftFoot, HumanBodyBones.LeftToes), ("r", HumanBodyBones.RightFoot, HumanBodyBones.RightToes) })
        {
            float sign = side == "l" ? 1 : -1;
            var sole = soles.Where(v => v.x * sign > 0).ToArray();
            var centre = new Vector3((sole.Min(v => v.x) + sole.Max(v => v.x)) / 2, 0, (sole.Min(v => v.z) + sole.Max(v => v.z)) / 2);
            float scale = (sole.Max(v => v.z) - sole.Min(v => v.z) + .03f) / (shoe.Max(v => v.z) - shoe.Min(v => v.z));
            var bones = new[] { animator.GetBoneTransform(footBone), animator.GetBoneTransform(ballBone) };
            var mesh = UnityEngine.Object.Instantiate(sourceMesh);
            mesh.name = body + " athlete sneaker " + side;
            // The source is a left shoe: the right one is its mirror, with the winding flipped back.
            mesh.vertices = shoe.Select(v => centre + new Vector3(v.x * sign, v.y, v.z) * scale).ToArray();
            if (sign < 0) for (int s = 0; s < mesh.subMeshCount; s++) mesh.SetTriangles(mesh.GetTriangles(s).Reverse().ToArray(), s);
            mesh.RecalculateNormals(); mesh.RecalculateBounds();
            // The front of the shoe bends with the toes.
            float ball = bones[1].position.z;
            mesh.boneWeights = mesh.vertices.Select(v => {
                float toe = Mathf.Clamp01((ball + .015f - v.z) / .03f);
                return new BoneWeight { boneIndex0 = 0, weight0 = 1 - toe, boneIndex1 = 1, weight1 = toe };
            }).ToArray();
            var renderer = new GameObject("Athlete sneaker " + side).AddComponent<SkinnedMeshRenderer>();
            renderer.transform.SetParent(root.transform, false);
            mesh.bindposes = bones.Select(b => b.worldToLocalMatrix * renderer.transform.localToWorldMatrix).ToArray();
            var path = Folder + mesh.name + ".asset";
            var saved = AssetDatabase.LoadAssetAtPath<Mesh>(path);
            if (saved == null) AssetDatabase.CreateAsset(mesh, path);
            else { EditorUtility.CopySerialized(mesh, saved); UnityEngine.Object.DestroyImmediate(mesh); mesh = saved; }
            renderer.sharedMesh = mesh; renderer.bones = bones; renderer.rootBone = bones[0];
            // The FBX keeps one submesh per Blender material, in the order sneaker.py creates them.
            renderer.sharedMaterials = materials;
            renderer.quality = SkinQuality.Bone2; renderer.updateWhenOffscreen = true;
        }
    }

    public static void Validate(GameObject instance)
    {
        var shoes = instance.GetComponentsInChildren<SkinnedMeshRenderer>(true).Where(r => r.name.StartsWith("Athlete sneaker")).ToArray();
        if (shoes.Length != 2 || shoes.Any(s => !s.gameObject.activeSelf || s.bones.Any(b => b == null)))
            throw new Exception("Both athlete sneakers must be worn and bound");
        if (shoes.Any(s => s.sharedMesh.triangles.Length / 3 > 1500)) throw new Exception("Sneaker over its triangle budget");
        // Every sole vertex of the bare foot sits inside a shoe in the bind pose.
        var feet = instance.GetComponentsInChildren<SkinnedMeshRenderer>(true).Single(r => r.name == "Bare feet");
        var baked = new Mesh(); feet.BakeMesh(baked);
        var sole = baked.vertices.Select(v => feet.transform.TransformPoint(v)).Where(v => v.y < .05f).ToArray();
        var bounds = shoes.Select(s => { var m = new Mesh(); s.BakeMesh(m); var b = m.bounds; b.center = s.transform.TransformPoint(b.center); return b; }).ToArray();
        float inside = sole.Count(v => bounds.Any(b => b.Contains(v))) / (float)sole.Length;
        if (inside < .98f) throw new Exception("Bare toes outside the sneakers: " + inside);
    }
}
