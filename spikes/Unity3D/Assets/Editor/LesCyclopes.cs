using System;
using System.Linq;
using System.IO;
using UnityEditor;
using UnityEngine;

public static class LesCyclopes
{
    const string Folder = "Assets/Characters/LesCyclopes/";

    public static void Build()
    {
        AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
        var maskImporter = (TextureImporter)AssetImporter.GetAtPath(Folder + "MetalMask.png");
        maskImporter.sRGBTexture = false;
        maskImporter.SaveAndReimport();
        var material = ToonMaterials.At(Folder + "Cyclopes.mat");
        material.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>(Folder + "BaseColor.png"));
        material.SetTexture("_MetalMask", AssetDatabase.LoadAssetAtPath<Texture2D>(Folder + "MetalMask.png"));
        material.SetColor("_BaseColor", Color.white);
        material.SetFloat("_RampSteps", 0);
        material.SetFloat("_ReceiveShadows", 0);
        material.SetFloat("_RimStrength", .06f);
        ToonMaterials.Facets(material, 0);
        material.SetFloat("_Metal", 1);
        material.SetFloat("_MetalTint", 1);
        material.SetTexture("_MatCap", AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/Spike/Shaders/MatCap Steel.png"));
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
                    renderer.sharedMaterial = material;
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
                int triangles = glasses.GetComponentsInChildren<MeshFilter>(true).Sum(filter => filter.sharedMesh.triangles.Length / 3);
                if (triangles > 6000 || glasses.GetComponentsInChildren<MeshRenderer>(true).Length != 1)
                    throw new Exception(name + ": eyewear budget exceeded");
                ValidateEyeCoverage(root, glasses);
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
                Debug.Log(name + ": Cyclopes " + triangles + " triangles, 1 renderer, Head attachment PASS");
            }
            finally { UnityEngine.Object.DestroyImmediate(root); }
        }
        Debug.Log("Cyclopes: " + combinations + " hair/headwear combinations, independent removal and head motion PASS");
    }

    // Validate the rendered eye geometry and coating, not only the absence of skin intersections.
    static void ValidateEyeCoverage(GameObject root, GameObject glasses)
    {
        var eyes = root.GetComponentsInChildren<SkinnedMeshRenderer>(true).First(item => item.name == "Eyes");
        var baked = new Mesh();
        var mask = new Texture2D(2, 2, TextureFormat.RGBA32, false, true);
        var filter = glasses.GetComponentInChildren<MeshFilter>(true);
        var collider = filter.gameObject.AddComponent<MeshCollider>();
        bool previousBackfaces = Physics.queriesHitBackfaces;
        try
        {
            eyes.BakeMesh(baked);
            mask.LoadImage(File.ReadAllBytes(Folder + "MetalMask.png"));
            collider.sharedMesh = filter.sharedMesh;
            glasses.SetActive(true);
            Physics.queriesHitBackfaces = true;
            Physics.SyncTransforms();
            var vertices = baked.vertices;
            var uv = baked.uv;
            var triangles = baked.triangles;
            int checks = 0;
            foreach (int side in new[] { -1, 1 })
            for (int sample = 0; sample < 9; sample++)
            {
                float angle = (sample - 1) * Mathf.PI / 4;
                var target = new Vector2(.5f, .5f) + (sample == 0 ? Vector2.zero : new Vector2(Mathf.Cos(angle), Mathf.Sin(angle)) * .12f);
                Vector3? point = null;
                for (int i = 0; i < triangles.Length; i += 3)
                {
                    int a = triangles[i], b = triangles[i + 1], c = triangles[i + 2];
                    if ((vertices[a].x + vertices[b].x + vertices[c].x) * side <= 0) continue;
                    var v = uv[b] - uv[a]; var w = uv[c] - uv[a]; var q = target - uv[a];
                    float det = v.x * w.y - v.y * w.x;
                    if (Mathf.Abs(det) < 1e-10f) continue;
                    float x = (q.x * w.y - q.y * w.x) / det;
                    float y = (v.x * q.y - v.y * q.x) / det;
                    if (Mathf.Min(1 - x - y, Mathf.Min(x, y)) < -.00001f) continue;
                    point = eyes.transform.TransformPoint(vertices[a] * (1 - x - y) + vertices[b] * x + vertices[c] * y);
                    break;
                }
                if (!point.HasValue) throw new Exception(root.name + ": missing iris sample");
                foreach (int azimuth in new[] { -25, 0, 25 })
                {
                    // Imported FBX rest-space faces -Z; animation turns the athlete toward the workshop camera.
                    var direction = new Vector3(Mathf.Sin(azimuth * Mathf.Deg2Rad), .02f, -Mathf.Cos(azimuth * Mathf.Deg2Rad)).normalized;
                    if (!collider.Raycast(new Ray(point.Value + direction * 2, -direction), out var hit, 2)
                        || mask.GetPixelBilinear(hit.textureCoord.x, hit.textureCoord.y).r < .55f)
                        throw new Exception(root.name + ": uncovered iris at " + azimuth + " degrees, sample " + side + "/" + sample);
                    checks++;
                }
            }
            Debug.Log(root.name + ": " + checks + " real iris/coating rays PASS");
        }
        finally
        {
            Physics.queriesHitBackfaces = previousBackfaces;
            UnityEngine.Object.DestroyImmediate(collider);
            UnityEngine.Object.DestroyImmediate(mask);
            UnityEngine.Object.DestroyImmediate(baked);
        }
    }
}
