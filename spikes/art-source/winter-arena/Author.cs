using System;
using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

// Run with the official Pipeline run_script command, outside Assets to avoid domain reloads.
public static class WinterArenaAuthor
{
    const string Folder = "Assets/Spike/Winter/";
    static readonly List<Vector3>[] Vertices = Enumerable.Range(0, 9).Select(_ => new List<Vector3>()).ToArray();
    static readonly System.Random Random = new System.Random(259);
    static float Range(float low, float high) => low + (float)Random.NextDouble() * (high - low);
    static Vector3 Point(float x, float y, float z) => new Vector3(x, y, z);
    static void Triangle(int material, Vector3 a, Vector3 b, Vector3 c)
    {
        Vertices[material].AddRange(new[] { a, b, c });
    }
    static void Crown(Vector3 center, float radius, float height, int sides, int material, float topRadius = 0, float turn = 0)
    {
        for (int i = 0; i < sides; i++)
        {
            float a = turn + i * Mathf.PI * 2 / sides, b = turn + (i + 1) * Mathf.PI * 2 / sides;
            var p = center + Point(Mathf.Cos(a) * radius, 0, Mathf.Sin(a) * radius);
            var q = center + Point(Mathf.Cos(b) * radius, 0, Mathf.Sin(b) * radius);
            var r = center + Point(Mathf.Cos(a) * topRadius, height, Mathf.Sin(a) * topRadius);
            var s = center + Point(Mathf.Cos(b) * topRadius, height, Mathf.Sin(b) * topRadius);
            Triangle(material, p, r, q);
            if (topRadius > 0)
            {
                Triangle(material, q, r, s);
                Triangle(material, r, center + Vector3.up * height, s);
            }
        }
    }
    static void Pine(float x, float z, float height)
    {
        var center = Point(x, 0, z);
        Crown(center, height * .055f, height * .8f, 5, 5, height * .035f);
        for (int tier = 0; tier < 3; tier++)
        {
            float turn = Range(0, 6.28f);
            float radius = height * (.3f - tier * .065f), h = height * (.49f - tier * .05f);
            var basePoint = center + Vector3.up * height * (.19f + tier * .235f);
            Crown(basePoint, radius, h, 7, tier == 0 ? 3 : 4, turn: turn);
            Crown(basePoint + Vector3.up * h * .19f, radius * .84f + .025f, h * .81f + .018f, 7, 0, turn: turn);
        }
    }
    static void Rock(float x, float z, float radius, float height)
    {
        Crown(Point(x, -.08f, z), radius, height * .65f, 7, 6, radius * .72f);
        Crown(Point(x, -.08f + height * .65f, z), radius * .78f, height * .38f, 7, 0, radius * .24f);
    }
    static void Mountain(float x, float z, float radius, float height)
    {
        // A continuous irregular ridge; the upper band follows the same vertices as its rock base.
        var peak = Point(x + radius * .16f, height, z);
        var center = Point(x, -.2f, z);
        const int sides = 7;
        float turn = Range(0, 6.28f);
        var foot = new Vector3[sides]; var snow = new Vector3[sides];
        for (int i = 0; i < sides; i++)
        {
            float angle = turn + i * Mathf.PI * 2 / sides;
            foot[i] = center + Point(Mathf.Cos(angle) * radius * Range(.8f, 1.2f), 0, Mathf.Sin(angle) * radius * .6f);
            snow[i] = Vector3.Lerp(foot[i], peak, Range(.49f, .72f));
        }
        for (int i = 0; i < sides; i++)
        {
            int next = (i + 1) % sides;
            Triangle(7, foot[i], snow[i], foot[next]);
            Triangle(7, foot[next], snow[i], snow[next]);
            Triangle(8, snow[i], peak, snow[next]);
        }
    }
    public static object Main()
    {
        if (EditorApplication.isPlaying) throw new InvalidOperationException("Author in Edit mode");
        EditorSceneManager.OpenScene("Assets/Spike/Arena.unity");
        var old = GameObject.Find("Winter clearing");
        if (old != null) UnityEngine.Object.DestroyImmediate(old);
        System.IO.Directory.CreateDirectory(Folder);
        AssetDatabase.Refresh();
        var root = new GameObject("Winter clearing");
        // The central strip is exactly y=0, including all approach and dodge positions.
        float[] xs = { -24, -15, -9, -5, -3, 0, 3, 5, 9, 15, 24 };
        float[] zs = { -24, -18, -12, -8, -5, -3, -1.2f, 1.2f, 4 };
        var grid = new Vector3[xs.Length, zs.Length];
        for (int x = 0; x < xs.Length; x++)
        for (int z = 0; z < zs.Length; z++)
            grid[x, z] = Point(xs[x] + (zs[z] < -1.2f ? Range(-.4f, .4f) : 0), zs[z] >= -3 ? 0 : Range(-.08f, .16f), zs[z]);
        for (int x = 0; x < xs.Length - 1; x++)
        for (int z = 0; z < zs.Length - 1; z++)
        {
            int mat = z >= 6 ? 0 : Random.Next(0, 3);
            Triangle(mat, grid[x, z], grid[x, z + 1], grid[x + 1, z]);
            Triangle(z >= 6 ? 0 : Random.Next(0, 3), grid[x + 1, z], grid[x, z + 1], grid[x + 1, z + 1]);
        }
        foreach (var m in new[] { Point(-12, 2.5f, -20), Point(-6.5f, 3.3f, -22), Point(.2f, 2.3f, -21), Point(6, 3.5f, -23), Point(13, 2.9f, -21) })
            Mountain(m.x, m.z, Range(4.2f, 6.2f), m.y);
        // Distant woods make the transition from the ridge to the clearing.
        for (int i = 0; i < 15; i++) Pine(-12 + i * 1.7f + Range(-.35f, .35f), Range(-13, -10), Range(.9f, 1.5f));
        foreach (var p in new[] { Point(-4.5f, 2.6f, -3.2f), Point(-3.7f, 1.8f, -4.3f), Point(-2.7f, 1.1f, -5.4f), Point(4.1f, 2.4f, -3.6f), Point(5, 2.9f, -4.6f), Point(3, 1.3f, -5.8f) })
            Pine(p.x, p.z, p.y);
        Rock(-3.4f, -1.9f, .7f, .5f); Rock(-4.15f, -2.3f, .42f, .34f);
        Rock(3.3f, -1.7f, .62f, .44f); Rock(4.05f, -2.2f, .85f, .63f);
        Rock(-1.8f, -3.8f, .36f, .25f); Rock(1.6f, -4.2f, .5f, .34f);
        // Low blue facets mark snow drifts outside the playing strip.
        Crown(Point(-3.8f, -.05f, -1.8f), 1.15f, .18f, 9, 1);
        Crown(Point(3.9f, -.05f, -1.7f), 1.1f, .16f, 9, 2);
        var colors = new[] { "C5DEE6", "BDD9E4", "B3D2E0", "183F50", "285866", "4F5661", "59788B", "6C90AB", "ACC8DD" };
        var names = new[] { "Snow", "Snow shade", "Snow blue", "Fir deep", "Fir teal", "Bark", "Rock", "Ridge", "Summits" };
        for (int i = 0; i < Vertices.Length; i++)
        {
            if (Vertices[i].Count == 0) continue;
            string meshPath = Folder + names[i] + ".asset", matPath = Folder + names[i] + ".mat";
            var mesh = AssetDatabase.LoadAssetAtPath<Mesh>(meshPath);
            if (mesh == null) { mesh = new Mesh { name = names[i] }; AssetDatabase.CreateAsset(mesh, meshPath); }
            // Setting the buffers refreshes the live renderer as well as the saved asset.
            mesh.Clear();
            mesh.SetVertices(Vertices[i]); mesh.SetTriangles(Enumerable.Range(0, Vertices[i].Count).ToArray(), 0);
            mesh.RecalculateNormals(); mesh.RecalculateBounds();
            var mat = AssetDatabase.LoadAssetAtPath<Material>(matPath);
            if (mat == null) { mat = new Material(Shader.Find("Universal Render Pipeline/Lit")); AssetDatabase.CreateAsset(mat, matPath); }
            ColorUtility.TryParseHtmlString("#" + colors[i], out var color);
            mat.SetColor("_BaseColor", color); mat.SetFloat("_Smoothness", .05f); mat.SetFloat("_Metallic", 0);
            EditorUtility.SetDirty(mat); EditorUtility.SetDirty(mesh);
            var part = new GameObject(names[i], typeof(MeshFilter), typeof(MeshRenderer));
            part.transform.SetParent(root.transform, false);
            part.GetComponent<MeshFilter>().sharedMesh = mesh;
            var renderer = part.GetComponent<MeshRenderer>(); renderer.sharedMaterial = mat;
            renderer.shadowCastingMode = ShadowCastingMode.Off;
        }
        var bridge = UnityEngine.Object.FindFirstObjectByType<BattleBridge>();
        bridge.combatEnvironment = root;
        bridge.inspectionFloor = UnityEngine.SceneManagement.SceneManager.GetActiveScene().GetRootGameObjects().Single(g => g.name == "Floor glow");
        bridge.inspectionFloor.SetActive(false);
        bridge.arenaCamera.farClipPlane = 60;
        bridge.arenaCamera.backgroundColor = new Color(.48f, .66f, .77f);
        EditorUtility.SetDirty(bridge); AssetDatabase.SaveAssets();
        EditorSceneManager.SaveScene(UnityEngine.SceneManagement.SceneManager.GetActiveScene());
        return new { triangles = Vertices.Sum(v => v.Count) / 3, renderers = root.GetComponentsInChildren<MeshRenderer>().Length, colliders = root.GetComponentsInChildren<Collider>().Length };
    }
}
