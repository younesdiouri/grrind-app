// Pipeline screenshot exports RGB24; the catalog needs RGBA from the approved Unity material.
var root = new UnityEngine.GameObject("Cyclopes catalog capture");
var previousActive = UnityEngine.RenderTexture.active;
var target = new UnityEngine.RenderTexture(512, 512, 24, UnityEngine.RenderTextureFormat.ARGB32);
var pixels = new UnityEngine.Texture2D(512, 512, UnityEngine.TextureFormat.RGBA32, false);
try
{
    var model = UnityEngine.Object.Instantiate(UnityEditor.AssetDatabase.LoadAssetAtPath<UnityEngine.GameObject>("Assets/Characters/LesCyclopes/Male.fbx"), root.transform);
    var material = UnityEditor.AssetDatabase.LoadAssetAtPath<UnityEngine.Material>("Assets/Characters/LesCyclopes/Cyclopes.mat");
    foreach (var renderer in model.GetComponentsInChildren<UnityEngine.MeshRenderer>()) renderer.sharedMaterial = material;
    foreach (var child in model.GetComponentsInChildren<UnityEngine.Transform>()) child.gameObject.layer = 31;
    var bounds = model.GetComponentInChildren<UnityEngine.MeshRenderer>().bounds;
    var camera = new UnityEngine.GameObject("Catalog camera").AddComponent<UnityEngine.Camera>();
    camera.transform.SetParent(root.transform);
    camera.cullingMask = 1 << 31;
    camera.clearFlags = UnityEngine.CameraClearFlags.SolidColor;
    camera.backgroundColor = UnityEngine.Color.clear;
    camera.orthographic = true;
    camera.orthographicSize = bounds.size.x * .60f;
    camera.transform.position = bounds.center + new UnityEngine.Vector3(.15f, .10f, -.40f);
    camera.transform.LookAt(bounds.center);
    camera.targetTexture = target;
    camera.Render();
    UnityEngine.RenderTexture.active = target;
    pixels.ReadPixels(new UnityEngine.Rect(0, 0, 512, 512), 0, 0);
    pixels.Apply();
    var output = System.IO.Path.GetFullPath("../art-source/les-cyclopes/catalog-icon.png");
    System.IO.File.WriteAllBytes(output, pixels.EncodeToPNG());
    return output;
}
finally
{
    UnityEngine.RenderTexture.active = previousActive;
    target.Release();
    UnityEngine.Object.DestroyImmediate(target);
    UnityEngine.Object.DestroyImmediate(pixels);
    UnityEngine.Object.DestroyImmediate(root);
}
