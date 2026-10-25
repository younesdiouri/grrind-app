using System;
using System.Linq;
using Unity.Collections;
using UnityEditor;
using UnityEngine;

public static class MeshCut
{
    // Keeps the triangles whose three world-space vertices pass, per submesh, and saves the copy at path.
    public static Mesh Keep(SkinnedMeshRenderer r, Mesh source, string name, Func<Vector3, bool> keep, string path)
    {
        var mesh = UnityEngine.Object.Instantiate(source);
        mesh.name = name;
        var vertices = source.vertices;
        for (int sub = 0; sub < mesh.subMeshCount; sub++)
        {
            var triangles = mesh.GetTriangles(sub);
            mesh.SetTriangles(Enumerable.Range(0, triangles.Length / 3).Where(i => Enumerable.Range(0, 3)
                .All(j => keep(r.transform.TransformPoint(vertices[triangles[i * 3 + j]]))))
                .SelectMany(i => new[] { triangles[i * 3], triangles[i * 3 + 1], triangles[i * 3 + 2] }).ToArray(), sub);
        }
        if (mesh.triangles.Length == 0) throw new Exception("Empty mesh section " + name);
        // After pruning triangles, rebuild the GPU skinning data as well as the visible indices.
        // Without this, the CPU bake is correct but the animated GPU mesh draws long triangles.
        using (var counts = new NativeArray<byte>(source.GetBonesPerVertex(), Allocator.Temp))
        using (var weights = new NativeArray<BoneWeight1>(source.GetAllBoneWeights(), Allocator.Temp))
            mesh.SetBoneWeights(counts, weights);
        var existing = AssetDatabase.LoadAssetAtPath<Mesh>(path);
        if (existing == null) { AssetDatabase.CreateAsset(mesh, path); return mesh; }
        EditorUtility.CopySerialized(mesh, existing); UnityEngine.Object.DestroyImmediate(mesh); return existing;
    }
}
