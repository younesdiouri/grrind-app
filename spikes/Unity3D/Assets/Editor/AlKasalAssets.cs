using System;
using System.Linq;
using UnityEditor;
using UnityEngine;

public static class AlKasalAssets
{
    public static void Build()
    {
        AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
        BuildBoss();BuildSofa();AssetDatabase.SaveAssets();
    }
    static void BuildBoss()
    {
        const string folder="Assets/Characters/AlKasal/";
        var importer=(ModelImporter)AssetImporter.GetAtPath(folder+"AlKasal.fbx");
        importer.importCameras=false;importer.importLights=false;importer.importAnimation=false;
        importer.materialImportMode=ModelImporterMaterialImportMode.None;importer.SaveAndReimport();
        var material=ToonMaterials.At(folder+"Sloth.mat");
        material.SetTexture("_BaseMap",AssetDatabase.LoadAssetAtPath<Texture2D>(folder+"BaseColor.png"));
        material.SetColor("_BaseColor",Color.white);
        var root=new GameObject("AlKasal");
        var body=UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(folder+"AlKasal.fbx"),root.transform);
        try
        {
            root.name="AlKasal";
            foreach(var renderer in root.GetComponentsInChildren<MeshRenderer>())renderer.sharedMaterial=material;
            var meshes=root.GetComponentsInChildren<MeshFilter>();
            int triangles=meshes.Sum(m=>m.sharedMesh.triangles.Length/3);
            if(triangles>7000||meshes.Any(m=>m.sharedMesh.uv.Length==0))throw new Exception("Al Kasal mesh budget or UV failed");
            var bounds=root.GetComponentInChildren<Renderer>().bounds;
            if(Mathf.Abs(bounds.size.y-2.6f)>.01f)throw new Exception("Al Kasal FBX unit conversion changed its height: "+bounds.size.y);
            PrefabUtility.SaveAsPrefabAsset(root,"Assets/Resources/AlKasal.prefab");
            Debug.Log("Al Kasal: "+triangles+" triangles, textured, 2.6 m PASS");
        }
        finally{UnityEngine.Object.DestroyImmediate(root);}
    }
    static void BuildSofa()
    {
        const string path="Assets/Characters/Canape/Canape.fbx";
        var importer=(ModelImporter)AssetImporter.GetAtPath(path);
        importer.importCameras=false;importer.importLights=false;importer.importAnimation=false;
        importer.materialImportMode=ModelImporterMaterialImportMode.ImportStandard;
        importer.SaveAndReimport();
        var root=UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(path));
        try
        {
            root.name="Canape";
            foreach(var renderer in root.GetComponentsInChildren<MeshRenderer>())
            {
                var old=renderer.sharedMaterial;
                string matPath="Assets/Characters/Canape/"+old.name+".mat";
                bool created=AssetDatabase.LoadAssetAtPath<Material>(matPath)==null;
                var material=ToonMaterials.At(matPath);
                if(created)material.SetColor("_BaseColor",old.color);
                renderer.sharedMaterial=material;
            }
            PrefabUtility.SaveAsPrefabAsset(root,"Assets/Resources/Canape.prefab");
        }
        finally{UnityEngine.Object.DestroyImmediate(root);}
    }
}
