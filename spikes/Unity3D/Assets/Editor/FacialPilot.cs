using System;
using System.Linq;
using UnityEditor;
using UnityEngine;

// Assemble only the male pilot. Reuse the existing outfit, materials and humanoid rig.
public static class FacialPilot
{
    public static void Build()
    {
        const string path = "Assets/Resources/QuaterniusShowcase.prefab";
        var root = PrefabUtility.LoadPrefabContents(path);
        try
        {
            var appearance = root.GetComponent<QuaterniusAppearance>();
            var bones = root.GetComponentsInChildren<Transform>(true).ToDictionary(t => t.name);
            appearance.gloveArms = root.GetComponentsInChildren<SkinnedMeshRenderer>(true)
                .Where(r => r.name.EndsWith("_Arms") || r.name.EndsWith("_Sport_Skin")).ToArray();
            appearance.bareHandMeshes = appearance.gloveArms.Select(r => r.sharedMesh).ToArray();
            appearance.facialRenderers = new SkinnedMeshRenderer[2];
            appearance.originalFaces = new Mesh[2];
            appearance.squareFaces = new Mesh[2];
            appearance.originalGlovedFaces = new Mesh[2];
            appearance.squareGlovedFaces = new Mesh[2];
            for (int i = 0; i < 2; i++)
            {
                string role = i == 0 ? "Fantasy" : "Sport";
                string sourcePath = "Assets/Characters/FacialPilot/Male" + role + "Face.fbx";
                var importer = (ModelImporter)AssetImporter.GetAtPath(sourcePath);
                importer.isReadable = true;
                importer.importBlendShapes = true;
                importer.materialImportMode = ModelImporterMaterialImportMode.None;
                importer.importNormals = ModelImporterNormals.Import;
                importer.importBlendShapeNormals = ModelImporterNormals.Calculate;
                importer.SaveAndReimport();
                var source = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(sourcePath));
                var renderers = source.GetComponentsInChildren<SkinnedMeshRenderer>();
                var original = renderers.Single(r => r.name.EndsWith("_Original"));
                var square = renderers.Single(r => r.name.EndsWith("_Square"));
                var parts = i == 0 ? appearance.fantasyTop : appearance.sportTop;
                var old = parts.SelectMany(p => p.GetComponentsInChildren<SkinnedMeshRenderer>(true))
                    .Single(r => r.sharedMaterial == appearance.skinMaterial);
                if (original.sharedMesh.GetBlendShapeIndex("NoseWide") < 0 || square.sharedMesh.GetBlendShapeIndex("NoseWide") < 0)
                    throw new Exception("Nose shape missing from " + role);
                if (!original.bones.Select(b => b.name).SequenceEqual(square.bones.Select(b => b.name)))
                    throw new Exception("Face alternatives must use identical bone order");
                original.transform.SetParent(root.transform, true);
                original.bones = original.bones.Select(b => bones[b.name]).ToArray();
                original.rootBone = bones[original.rootBone.name];
                original.sharedMaterials = old.sharedMaterials;
                original.name = old.name;
                original.quality = SkinQuality.Bone4;
                original.updateWhenOffscreen = true;
                var bounds = original.localBounds;
                bounds.Encapsulate(square.localBounds.min);
                bounds.Encapsulate(square.localBounds.max);
                bounds.Expand(.01f);
                original.localBounds = bounds;
                int arm = Array.IndexOf(appearance.gloveArms, old);
                if (arm >= 0)
                {
                    appearance.gloveArms[arm] = original;
                    appearance.bareHandMeshes[arm] = original.sharedMesh;
                    float cut = Mathf.Abs(root.GetComponent<Animator>().GetBoneTransform(HumanBodyBones.RightHand).position.x) - .015f;
                    appearance.coveredHandMeshes[arm] = GoldenBoxingGloves.CoveredHands(original, original.sharedMesh, cut,
                        "Assets/Characters/FacialPilot/MaleSportOriginalCovered.asset");
                    appearance.originalGlovedFaces[i] = appearance.coveredHandMeshes[arm];
                    appearance.squareGlovedFaces[i] = GoldenBoxingGloves.CoveredHands(original, square.sharedMesh, cut,
                        "Assets/Characters/FacialPilot/MaleSportSquareCovered.asset");
                }
                else
                {
                    appearance.originalGlovedFaces[i] = original.sharedMesh;
                    appearance.squareGlovedFaces[i] = square.sharedMesh;
                }
                appearance.facialRenderers[i] = original;
                appearance.originalFaces[i] = original.sharedMesh;
                appearance.squareFaces[i] = square.sharedMesh;
                parts[Array.IndexOf(parts, old.gameObject)] = original.gameObject;
                UnityEngine.Object.DestroyImmediate(old.gameObject);
                UnityEngine.Object.DestroyImmediate(source);
            }
            appearance.SelectFace("original", "original");
            PrefabUtility.SaveAsPrefabAsset(root, path);
        }
        finally { PrefabUtility.UnloadPrefabContents(root); }
        AssetDatabase.SaveAssets();
        FacialPilotChecks.Validate();
    }
}
