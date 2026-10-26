using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;

/** Every lit material of the game is a Painted Toon: the one place where its shader is chosen (#280). */
public static class ToonMaterials
{
    const string Folder = "Assets/Spike/Shaders/";
    static Shader Toon => Shader.Find("GRRIND/Painted Toon");

    // Loads the material at path, creates it if missing, and forces the shared shader.
    public static Material At(string path)
    {
        var material = AssetDatabase.LoadAssetAtPath<Material>(path);
        if (material == null) { material = new Material(Toon); AssetDatabase.CreateAsset(material, path); }
        if (material.shader != Toon) material.shader = Toon;
        EditorUtility.SetDirty(material); return material;
    }

    // Metal parts of a painted item: gold is a saturated yellow, steel a light grey; paint and rubber stay matte.
    public static void Metal(Material material, string folder, string matcap)
    {
        var maskPath = folder + "MetalMask.png";
        var source = new Texture2D(2, 2);
        source.LoadImage(File.ReadAllBytes(folder + "BaseColor.png"));
        const int size = 512;
        var mask = new Texture2D(size, size, TextureFormat.RGB24, false);
        mask.SetPixels(Enumerable.Range(0, size * size).Select(i => {
            Color.RGBToHSV(source.GetPixelBilinear((i % size + .5f) / size, (i / size + .5f) / size), out var h, out var s, out var v);
            bool gold = h > .08f && h < .16f && s > .35f && v > .35f, steel = s < .15f && v > .3f;
            return gold || steel ? Color.white : Color.black;
        }).ToArray());
        File.WriteAllBytes(maskPath, mask.EncodeToPNG());
        Object.DestroyImmediate(source); Object.DestroyImmediate(mask);
        AssetDatabase.ImportAsset(maskPath);
        var importer = (TextureImporter)AssetImporter.GetAtPath(maskPath);
        importer.sRGBTexture = false; importer.mipmapEnabled = false; importer.SaveAndReimport();
        material.SetTexture("_MetalMask", AssetDatabase.LoadAssetAtPath<Texture2D>(maskPath));
        material.SetTexture("_MatCap", MatCap(matcap));
        material.SetFloat("_Metal", 1);
    }

    // Faceted clothes read their facets through a matte clay MatCap, like the steel on the iron.
    public static void Facets(Material material, float strength)
    {
        material.SetTexture("_MatCap", MatCap("Clay"));
        material.SetFloat("_Facets", strength);
    }

    // A 256 px studio sphere: dark floor, bright horizon band, a soft key highlight top left.
    static Texture2D MatCap(string name)
    {
        var path = Folder + "MatCap " + name + ".png";
        var existing = AssetDatabase.LoadAssetAtPath<Texture2D>(path);
        if (existing != null) return existing;
        Color dark, mid, light;
        // Clay: matte, lit from above, darker below; no highlight (multiplied in the shader).
        if (name == "Clay") { dark = new Color(.32f, .3f, .34f); mid = new Color(.62f, .62f, .64f); light = new Color(.72f, .72f, .74f); }
        else if (name == "Gold") { dark = new Color(.5f, .32f, .08f); mid = new Color(1, .78f, .26f); light = new Color(1.3f, 1.2f, .8f); }
        else { dark = new Color(.1f, .11f, .13f); mid = new Color(.55f, .6f, .66f); light = new Color(1.3f, 1.32f, 1.35f); }
        const int size = 256;
        var texture = new Texture2D(size, size, TextureFormat.RGB24, false);
        for (int y = 0; y < size; y++)
            for (int x = 0; x < size; x++)
            {
                float u = (x + .5f) / size * 2 - 1, v = (y + .5f) / size * 2 - 1;
                var n = new Vector3(u, v, Mathf.Sqrt(Mathf.Max(0, 1 - u * u - v * v)));
                float sky = Mathf.SmoothStep(0, 1, n.y * .5f + .5f);
                float horizon = Mathf.Exp(-Mathf.Pow((n.y - .1f) / .12f, 2)) * .6f;
                float key = Mathf.Pow(Mathf.Max(0, Vector3.Dot(n, new Vector3(-.45f, .55f, .7f).normalized)), name == "Clay" ? 2 : 24);
                var colour = Color.Lerp(dark, mid, sky) + (light - mid) * Mathf.Clamp01(horizon + key);
                texture.SetPixel(x, y, colour);
            }
        File.WriteAllBytes(path, texture.EncodeToPNG());
        Object.DestroyImmediate(texture);
        AssetDatabase.ImportAsset(path);
        var importer = (TextureImporter)AssetImporter.GetAtPath(path);
        importer.wrapMode = TextureWrapMode.Clamp; importer.mipmapEnabled = false; importer.SaveAndReimport();
        return AssetDatabase.LoadAssetAtPath<Texture2D>(path);
    }

    // Scene materials were authored by hand on URP/Lit; _BaseMap, _BaseColor and _Cull carry over by name.
    [MenuItem("GRRIND/Convert lit materials to Painted Toon")]
    public static void ConvertScenery()
    {
        foreach (var path in AssetDatabase.FindAssets("t:Material", new[] { "Assets/Spike", "Assets/Characters" })
                     .Select(AssetDatabase.GUIDToAssetPath))
        {
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material.shader.name == "Universal Render Pipeline/Lit") At(path);
        }
        AssetDatabase.SaveAssets();
    }
}
