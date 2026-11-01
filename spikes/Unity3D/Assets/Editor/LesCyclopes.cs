using System;
using System.Linq;
using UnityEditor;
using UnityEngine;

public static class LesCyclopes
{
    const string Folder = "Assets/Characters/LesCyclopes/";

    public static void Build()
    {
        AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
        var palette = AssetDatabase.LoadAssetAtPath<Texture2D>(Folder + "BaseColor.png");
        var frame = ToonMaterials.At(Folder + "Frame.mat");
        var visor = ToonMaterials.At(Folder + "Visor.mat");
        foreach (var material in new[] { frame, visor })
        {
            material.SetTexture("_BaseMap", palette);
            material.SetColor("_BaseColor", Color.white);
            material.SetFloat("_RampSteps", 0);
            material.SetFloat("_ReceiveShadows", 0);
            material.SetFloat("_RimStrength", .1f);
        }
        ToonMaterials.Facets(frame, .45f);
        visor.SetFloat("_Metal", .3f);
        visor.SetTexture("_MatCap", AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/Spike/Shaders/MatCap Steel.png"));
        foreach (var name in new[] { "QuaterniusShowcase", "QuaterniusFemale" })
        {
            string body = name == "QuaterniusFemale" ? "Female" : "Male";
            string modelPath = Folder + body + ".fbx";
            var importer = (ModelImporter)AssetImporter.GetAtPath(modelPath);
            importer.isReadable = true;
            importer.materialImportMode = ModelImporterMaterialImportMode.None;
            importer.importNormals = ModelImporterNormals.Import;
            importer.SaveAndReimport();
            string path = "Assets/Resources/" + name + ".prefab";
            var root = PrefabUtility.LoadPrefabContents(path);
            try
            {
                var appearance = root.GetComponent<QuaterniusAppearance>();
                if (appearance.cyclopes != null) UnityEngine.Object.DestroyImmediate(appearance.cyclopes);
                var head = root.GetComponent<Animator>().GetBoneTransform(HumanBodyBones.Head);
                appearance.cyclopes = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(modelPath));
                appearance.cyclopes.name = "Les Cyclopes";
                appearance.cyclopes.transform.SetParent(head, true);
                foreach (var renderer in appearance.cyclopes.GetComponentsInChildren<MeshRenderer>())
                    renderer.sharedMaterial = renderer.name.Contains("Visor") ? visor : frame;
                appearance.SetCyclopes(false);
                PrefabUtility.SaveAsPrefabAsset(root, path);
            }
            finally { PrefabUtility.UnloadPrefabContents(root); }
        }
        AssetDatabase.SaveAssets();
        Validate();
    }

    public static void Validate()
    {
        int combinations = 0;
        foreach (var name in new[] { "QuaterniusShowcase", "QuaterniusFemale" })
        {
            var root = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Resources/" + name + ".prefab"));
            try
            {
                var appearance = root.GetComponent<QuaterniusAppearance>();
                var glasses = appearance.cyclopes;
                var head = root.GetComponent<Animator>().GetBoneTransform(HumanBodyBones.Head);
                if (glasses == null || glasses.transform.parent != head)
                    throw new Exception(name + ": glasses must follow Head");
                int triangles = glasses.GetComponentsInChildren<MeshFilter>().Sum(filter => filter.sharedMesh.triangles.Length / 3);
                if (triangles > 1500 || glasses.GetComponentsInChildren<MeshRenderer>().Length != 2)
                    throw new Exception(name + ": eyewear budget exceeded");
                foreach (var hair in appearance.hairStyles)
                foreach (var headwear in new[] { "none", "headband", "moumoutivation" })
                {
                    appearance.SetMoumoutivation(false);
                    appearance.SelectHair(hair);
                    appearance.SetHeadband(headwear == "headband");
                    appearance.SetMoumoutivation(headwear == "moumoutivation");
                    appearance.SetCyclopes(true);
                    appearance.SelectHair(hair);
                    // Changing headwear after the glasses must preserve the accessory too.
                    appearance.SetMoumoutivation(false);
                    appearance.SetHeadband(headwear == "headband");
                    appearance.SetMoumoutivation(headwear == "moumoutivation");
                    if (!glasses.activeInHierarchy || appearance.moumoutivation.activeSelf != (headwear == "moumoutivation")
                        || appearance.hairs.Count(item => item.activeSelf) != (headwear == "moumoutivation" ? 0 : 1)
                        || appearance.headbands.Count(item => item.activeSelf) != (headwear == "headband" ? 1 : 0))
                        throw new Exception(name + ": accessory changed hair/headwear " + hair + "/" + headwear);
                    var position = glasses.transform.localPosition;
                    var rotation = glasses.transform.localRotation;
                    head.localRotation *= Quaternion.Euler(15, 35, -10);
                    if (glasses.transform.localPosition != position || glasses.transform.localRotation != rotation)
                        throw new Exception(name + ": eyewear attachment drifted during head rotation");
                    head.localRotation *= Quaternion.Inverse(Quaternion.Euler(15, 35, -10));
                    appearance.SetCyclopes(false);
                    if (glasses.activeSelf || appearance.moumoutivation.activeSelf != (headwear == "moumoutivation")
                        || appearance.headbands.Count(item => item.activeSelf) != (headwear == "headband" ? 1 : 0)
                        || appearance.hairs.Count(item => item.activeSelf) != (headwear == "moumoutivation" ? 0 : 1))
                        throw new Exception(name + ": removing accessory changed headwear");
                    combinations++;
                }
                Debug.Log(name + ": Cyclopes " + triangles + " triangles, 2 renderers, Head attachment PASS");
            }
            finally { UnityEngine.Object.DestroyImmediate(root); }
        }
        Debug.Log("Cyclopes: " + combinations + " hair/headwear combinations, independent removal and head motion PASS");
    }
}
