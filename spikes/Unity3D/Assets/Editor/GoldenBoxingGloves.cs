using System;
using System.Linq;
using UnityEditor;
using UnityEngine;

// Preserve the source hands; covered copies hide fingers during every existing clip.
public static class GoldenBoxingGloves
{
    const string Assets = "Assets/Characters/GoldenBoxingGloves/";
    public static void Build()
    {
        AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
        foreach (var body in new[] { "Male", "Female" })
        {
            var path = "Assets/Resources/" + (body == "Male" ? "QuaterniusShowcase" : "QuaterniusFemale") + ".prefab";
            var root = PrefabUtility.LoadPrefabContents(path);
            try { Install(root, body); PrefabUtility.SaveAsPrefabAsset(root, path); }
            finally { PrefabUtility.UnloadPrefabContents(root); }
        }
        AssetDatabase.SaveAssets();
        Validate();
    }

    public static void Install(GameObject root, string body)
    {
        var appearance = root.GetComponent<QuaterniusAppearance>();
        appearance.SetBoxingGloves(false);
        foreach (var old in appearance.boxingGloves) UnityEngine.Object.DestroyImmediate(old);
        var material = ToonMaterials.At(Assets + "Gold.mat");
        material.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>(Assets + "BaseColor.png"));
        material.SetColor("_BaseColor", Color.white);
        ToonMaterials.Metal(material, Assets, "Gold");
        var animator = root.GetComponent<Animator>();
        appearance.boxingGloves = new[] { HumanBodyBones.RightHand, HumanBodyBones.LeftHand }.Select(bone => {
            var side = bone == HumanBodyBones.RightHand ? "r" : "l";
            var glove = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(Assets + body + "_" + side + ".fbx"));
            glove.name = "Golden boxing glove " + side;
            glove.transform.SetParent(animator.GetBoneTransform(bone), true);
            glove.GetComponentInChildren<MeshRenderer>().sharedMaterial = material;
            return glove;
        }).ToArray();
        appearance.gloveArms = root.GetComponentsInChildren<SkinnedMeshRenderer>(true)
            .Where(r => r.name.EndsWith("_Arms") || r.name.EndsWith("_Sport_Skin")).ToArray();
        appearance.bareHandMeshes = appearance.gloveArms.Select(r => r.sharedMesh).ToArray();
        float cut = Mathf.Abs(animator.GetBoneTransform(HumanBodyBones.RightHand).position.x) - .015f;
        appearance.coveredHandMeshes = appearance.gloveArms.Select(r =>
            CoveredHands(r, r.sharedMesh, cut, Assets + r.name + "_Covered.asset")).ToArray();
        appearance.SetBoxingGloves(false);
    }

    public static Mesh CoveredHands(SkinnedMeshRenderer r, Mesh source, float cut, string path) =>
        MeshCut.Keep(r, source, r.name + " covered hands", v => Mathf.Abs(v.x) < cut, path);

    public static void Validate()
    {
        foreach (var name in new[] { "QuaterniusShowcase", "QuaterniusFemale" })
        {
            var root = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Resources/" + name + ".prefab"));
            try
            {
                var a = root.GetComponent<QuaterniusAppearance>();
                if (a.boxingGloves.Length != 2 || a.gloveArms.Length != 1) throw new Exception(name + ": missing gloves or the athlete arms");
                a.SetBoxingGloves(true);
                for (int i = 0; i < a.gloveArms.Length; i++)
                    if (a.gloveArms[i].sharedMesh != a.coveredHandMeshes[i] || a.coveredHandMeshes[i].triangles.Length >= a.bareHandMeshes[i].triangles.Length)
                        throw new Exception(name + ": hands were not covered");
                foreach (var glove in a.boxingGloves)
                    if (!glove.activeSelf || glove.GetComponentInChildren<MeshFilter>().sharedMesh.triangles.Length / 3 != 1852)
                        throw new Exception(name + ": missing mesh");
                a.SetBoxingGloves(false);
                for (int i = 0; i < a.gloveArms.Length; i++)
                    if (a.gloveArms[i].sharedMesh != a.bareHandMeshes[i]) throw new Exception(name + ": hands did not restore");
                if (a.boxingGloves.Any(g => g.activeSelf)) throw new Exception(name + ": glove did not unequip");
            }
            finally { UnityEngine.Object.DestroyImmediate(root); }
        }
        Debug.Log("Golden boxing gloves: both bodies equip, cover hands and restore PASS");
    }
}
