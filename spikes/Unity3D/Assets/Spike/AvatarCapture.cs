using System;
using System.Collections;
using System.Runtime.InteropServices;
using UnityEngine;

/** One offscreen image per saved appearance/equipment change; Unity is paused afterwards. */
public sealed class AvatarCapture : MonoBehaviour
{
    Coroutine pending;
    RenderTexture target;
    public void Capture(string json)
    {
        Cancel();
        pending = StartCoroutine(Render(json));
    }
    public void Cancel()
    {
        if (pending != null) StopCoroutine(pending);
        pending = null;
        if (target == null) return;
        GetComponent<BattleBridge>().arenaCamera.targetTexture = null;
        target.Release(); Destroy(target); target = null;
    }
    IEnumerator Render(string json)
    {
        var bridge = GetComponent<BattleBridge>();
        var config = JsonUtility.FromJson<BattleBridge.Configuration>(json);
        bridge.Configure(json);
        bridge.Present("{\"player\":{\"phase\":0.35},\"enemy\":{\"visible\":false}}");
        int width = Mathf.Clamp(config.previewWidth, 128, 1024), height = Mathf.Clamp(config.previewHeight, 128, 1024);
        // Same anti-aliasing as the live inspector, or saved previews show stair-stepped edges.
        target = new RenderTexture(width, height, 24, RenderTextureFormat.ARGB32) { antiAliasing = Mathf.Max(1, QualitySettings.antiAliasing) };
        bridge.arenaCamera.targetTexture = target;
        bridge.arenaCamera.ResetAspect();
        // Let Destroy and FighterPose.LateUpdate finish before reading the URP camera's render.
        yield return null;
        yield return new WaitForEndOfFrame();
        var previous = RenderTexture.active;
        var image = new Texture2D(width, height, TextureFormat.RGB24, false);
        string data = null, error = null;
        try
        {
            RenderTexture.active = target;
            image.ReadPixels(new Rect(0, 0, width, height), 0, 0, false);
            data = "data:image/png;base64," + Convert.ToBase64String(image.EncodeToPNG());
        }
        catch (Exception exception) { error = exception.Message; }
        finally
        {
            RenderTexture.active = previous; Destroy(image);
            bridge.arenaCamera.targetTexture = null;
            target.Release(); Destroy(target); target = null; pending = null;
        }
#if UNITY_IOS && !UNITY_EDITOR
        GrrindUnityAvatarCaptured(JsonUtility.ToJson(new Result { id = config.previewId, image = data, error = error }));
#endif
    }
    [Serializable] class Result { public string id, image, error; }
#if UNITY_IOS && !UNITY_EDITOR
    [DllImport("__Internal")] static extern void GrrindUnityAvatarCaptured(string json);
#endif
    void OnDestroy() => Cancel();
}
