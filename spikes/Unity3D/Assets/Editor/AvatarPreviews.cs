using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;

/** Renders the 72 equipped-avatar previews of CombatAvatarPreview (shirt × pants × weapon), in Play mode on Arena. */
public static class AvatarPreviews
{
    const int Width = 512, Height = 640;
    static readonly (string key, string unity)[] Shirts = { ("base", "base"), ("slate", "cyan"), ("coral", "coral") };
    static readonly (string key, string unity)[] Pants = { ("original", "base"), ("violet", "violet"), ("cyan", "cyan"), ("coral", "coral") };
    static readonly string[] Weapons = { "bare-unarmed", "gloves-unarmed", "bare-dumbbell", "bare-ego", "ferPlay", "huilesson" };

    public static string Start()
    {
        if (!EditorApplication.isPlaying) return "Enter Play mode on Arena first";
        PlayModeWindow.SetCustomRenderingResolution(Width, Height, "avatar preview");
        var bridge = Object.FindFirstObjectByType<BattleBridge>();
        var jobs = new List<(string file, string json, bool ego)>();
        foreach (var shirt in Shirts)
        foreach (var pants in Pants)
        foreach (var weapon in Weapons)
        {
            bool sword = weapon == "ferPlay" || weapon == "huilesson";
            var player = new BattleBridge.AvatarConfig { body = "male", hairStyle = "parted", skinTone = "tan", eyeColor = "brown",
                shirtColor = shirt.unity, pantsColor = pants.unity, boxingGloves = weapon == "gloves-unarmed",
                dumbbell = weapon.EndsWith("dumbbell") || weapon.EndsWith("ego"), weapon = sword ? weapon : "", weaponType = sword ? "SWORD" : "FIST" };
            var config = new BattleBridge.Configuration { inspection = true, view = 0, azimuth = 25, player = player,
                enemy = new BattleBridge.AvatarConfig { visible = false } };
            jobs.Add(($"{shirt.key}-{pants.key}-{weapon}.png", JsonUtility.ToJson(config), weapon == "bare-ego"));
        }
        string folder = Path.GetFullPath("../../assets/images/heroes/unity/equipped/");
        const string still = "{\"player\":{\"phase\":0},\"enemy\":{\"visible\":false}}";
        int index = -1, wait = 0;
        EditorApplication.CallbackFunction step = null;
        step = () =>
        {
            if (!EditorApplication.isPlaying) { EditorApplication.update -= step; return; }
            // A few frames let the replaced avatar disappear and the guard pose settle.
            if (index >= 0 && --wait > 0) { bridge.Present(still); return; }
            if (index >= 0) Save(bridge.arenaCamera, folder + jobs[index].file);
            if (++index >= jobs.Count) { EditorApplication.update -= step; Debug.Log("Avatar previews: " + jobs.Count + " written"); return; }
            bridge.Configure(jobs[index].json);
            bridge.Present(still);
            wait = 6;
            // HALTER_EGO reuses the dumbbell mesh in a blue tint.
            if (jobs[index].ego)
                foreach (var grip in Object.FindObjectsByType<WeaponGrip>(FindObjectsSortMode.None))
                    if (grip.HeldItem != null)
                        foreach (var renderer in grip.HeldItem.GetComponentsInChildren<Renderer>())
                        {
                            var block = new MaterialPropertyBlock(); renderer.GetPropertyBlock(block);
                            block.SetColor("_BaseColor", new Color(.07f, .35f, 3.5f)); renderer.SetPropertyBlock(block);
                        }
        };
        EditorApplication.update += step;
        return "Rendering " + jobs.Count + " previews into " + folder;
    }

    static void Save(Camera camera, string path)
    {
        var target = new RenderTexture(Width, Height, 24);
        var previous = camera.targetTexture; var rect = camera.rect;
        camera.targetTexture = target; camera.rect = new Rect(0, 0, 1, 1); camera.Render();
        RenderTexture.active = target;
        var image = new Texture2D(Width, Height, TextureFormat.RGB24, false);
        image.ReadPixels(new Rect(0, 0, Width, Height), 0, 0); image.Apply();
        File.WriteAllBytes(path, image.EncodeToPNG());
        RenderTexture.active = null; camera.targetTexture = previous; camera.rect = rect;
        Object.DestroyImmediate(target); Object.DestroyImmediate(image);
    }
}
