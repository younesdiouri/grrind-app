using System;
using System.Linq;
using UnityEditor;
using UnityEngine;

public static class FacialPilotChecks
{
    public static void Validate()
    {
        var prefab = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Resources/QuaterniusShowcase.prefab");
        var actor = UnityEngine.Object.Instantiate(prefab);
        try
        {
            var appearance = actor.GetComponent<QuaterniusAppearance>();
            var select = appearance.GetType().GetMethod("SelectFace");
            if (select == null) throw new Exception("Male avatar cannot select its face and nose independently");
            var renderers = actor.GetComponentsInChildren<SkinnedMeshRenderer>(true)
                .Where(r => r.sharedMesh.GetBlendShapeIndex("NoseWide") >= 0).ToArray();
            if (renderers.Length != 2) throw new Exception("Expected one facial renderer per outfit");
            foreach (var face in new[] { "original", "square" })
            {
                select.Invoke(appearance, new object[] { face, "original" });
                var before = renderers.Select(Bake).ToArray();
                select.Invoke(appearance, new object[] { face, "wide" });
                for (int i = 0; i < renderers.Length; i++)
                {
                    var after = Bake(renderers[i]);
                    float largest = 0;
                    for (int j = 0; j < after.Length; j++)
                    {
                        float distance = Vector3.Distance(before[i][j], after[j]);
                        largest = Mathf.Max(largest, distance);
                        // Nose changes must leave eyes, mouth, scalp and neck fixed.
                        if ((before[i][j].y < 1.64f || before[i][j].y > 1.70f || Mathf.Abs(before[i][j].x) > .03f) && distance > .00001f)
                            throw new Exception("Nose selection moved protected anatomy");
                    }
                    if (largest < .002f) throw new Exception("Nose selection has no observable geometry change");
                }
                select.Invoke(appearance, new object[] { face, "original" });
                for (int i = 0; i < renderers.Length; i++)
                    if (Bake(renderers[i]).Where((p, j) => Vector3.Distance(p, before[i][j]) > .000001f).Any())
                        throw new Exception("Nose selection does not return exactly to its original shape");
            }
            select.Invoke(appearance, new object[] { "square", "original" });
            var squareMeshes = renderers.Select(r => r.sharedMesh).ToArray();
            select.Invoke(appearance, new object[] { "original", "original" });
            if (renderers.Where((r, i) => r.sharedMesh == squareMeshes[i]).Any())
                throw new Exception("Face selection did not change both outfit meshes");
            if (renderers.Any(r => r.bones.Any(b => b == null))) throw new Exception("A facial bone is not bound");
            foreach (var face in new[] { "original", "square" })
            {
                select.Invoke(appearance, new object[] { face, "wide" });
                appearance.SetBoxingGloves(true);
                var covered = renderers.Select(r => r.sharedMesh).ToArray();
                appearance.SetBoxingGloves(false);
                for (int i = 0; i < renderers.Length; i++)
                {
                    if (renderers[i].GetBlendShapeWeight(0) != 100) throw new Exception("Gloves reset the selected nose");
                    if (renderers[i].name.EndsWith("_Sport_Skin") && covered[i].triangles.Length >= renderers[i].sharedMesh.triangles.Length)
                        throw new Exception("Selected face exposed hands inside gloves");
                }
            }
            Debug.Log("Facial pilot PASS: four independent combinations, both outfits, protected anatomy and exact nose reset");
        }
        finally { UnityEngine.Object.DestroyImmediate(actor); }
    }

    static Vector3[] Bake(SkinnedMeshRenderer renderer)
    {
        var mesh = new Mesh();
        renderer.BakeMesh(mesh);
        var positions = mesh.vertices.Select(renderer.transform.TransformPoint).ToArray();
        UnityEngine.Object.DestroyImmediate(mesh);
        return positions;
    }
}
