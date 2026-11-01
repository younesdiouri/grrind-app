using System;
using System.Linq;
using UnityEditor;
using UnityEngine;

public static class Moumoutivation
{
    const string Folder = "Assets/Characters/Moumoutivation/";

    public static void Build()
    {
        AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
        var material = ToonMaterials.At(Folder + "Wool.mat");
        material.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>(Folder + "BaseColor.png"));
        material.SetColor("_BaseColor", Color.white);
        ToonMaterials.Facets(material, 1);
        foreach (var name in new[] { "QuaterniusShowcase", "QuaterniusFemale" })
        {
            var body = name == "QuaterniusFemale" ? "Female" : "Male";
            var path = "Assets/Resources/" + name + ".prefab";
            var root = PrefabUtility.LoadPrefabContents(path);
            try
            {
                var appearance = root.GetComponent<QuaterniusAppearance>();
                if (appearance.moumoutivation != null) UnityEngine.Object.DestroyImmediate(appearance.moumoutivation);
                var head = root.GetComponent<Animator>().GetBoneTransform(HumanBodyBones.Head);
                var model = AssetDatabase.LoadAssetAtPath<GameObject>(Folder + body + ".fbx");
                appearance.moumoutivation = UnityEngine.Object.Instantiate(model);
                appearance.moumoutivation.name = "La Moumoutivation";
                appearance.moumoutivation.transform.SetParent(head, true);
                foreach (var renderer in appearance.moumoutivation.GetComponentsInChildren<MeshRenderer>())
                    renderer.sharedMaterial = material;
                appearance.SetMoumoutivation(false);
                PrefabUtility.SaveAsPrefabAsset(root, path);
            }
            finally { PrefabUtility.UnloadPrefabContents(root); }
        }
        AssetDatabase.SaveAssets();
        Validate();
    }

    public static void Validate()
    {
        foreach (var name in new[] { "QuaterniusShowcase", "QuaterniusFemale" })
        {
            var root = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Resources/" + name + ".prefab"));
            try
            {
                var appearance = root.GetComponent<QuaterniusAppearance>();
                var hat = appearance.moumoutivation;
                if (hat == null || hat.transform.parent != root.GetComponent<Animator>().GetBoneTransform(HumanBodyBones.Head))
                    throw new Exception(name + ": missing Head attachment");
                foreach (var style in appearance.hairStyles)
                {
                    appearance.SelectHair(style);
                    appearance.SetHeadband(true);
                    appearance.SetMoumoutivation(true);
                    if (!hat.activeSelf || appearance.hairs.Any(h => h.activeSelf) || appearance.headbands.Any(h => h.activeSelf))
                        throw new Exception(name + ": hair/headband clips through equipped hood");
                    appearance.SelectHair(style);
                    if (appearance.hairs.Any(h => h.activeSelf)) throw new Exception(name + ": hair change uncovered hood");
                    appearance.SetMoumoutivation(false);
                    if (hat.activeSelf || !appearance.hairs[Array.IndexOf(appearance.hairStyles, style)].activeSelf
                        || appearance.hairs.Count(h => h.activeSelf) != 1 || appearance.headbands.Count(h => h.activeSelf) != 1)
                        throw new Exception(name + ": unequip did not restore selected hair/headband");
                    appearance.SetHeadband(false);
                }
            }
            finally { UnityEngine.Object.DestroyImmediate(root); }
        }
        Debug.Log("Moumoutivation: Head attachment, hair/headband exclusion and restoration on both bodies PASS");
    }
}
