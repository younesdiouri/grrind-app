using System;
using System.Collections;
using System.Linq;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine;

// Isolated compatibility probe for Assistant 2.20. Its generator facade is internal.
// Does not change entitlement state, generate assets, or bypass service validation.
public static class GeneratorProbe
{
    public static async Task<string> RefreshAccess()
    {
        var account = AppDomain.CurrentDomain.GetAssemblies()
            .Select(a => a.GetType("Unity.AI.Toolkit.Accounts.Services.Account"))
            .First(t => t != null);
        var settings = account.GetField("settings").GetValue(null);
        var points = account.GetField("pointsBalance").GetValue(null);
        await (Task)settings.GetType().GetMethod("RefreshSettings").Invoke(settings, null);
        await (Task)points.GetType().GetMethod("RefreshPointsBalance").Invoke(points, null);
        var value = points.GetType().GetProperty("Value").GetValue(points);
        var settingsValue = settings.GetType().GetProperty("Value").GetValue(settings);
        return "Generators enabled: " + settings.GetType().GetProperty("AiGeneratorsEnabled").GetValue(settings)
            + "; can spend: " + settings.GetType().GetProperty("CanSpendPoints").GetValue(settings)
            + "; billed org: " + settings.GetType().GetProperty("BilledOrgId").GetValue(settings)
            + "; settings org: " + settingsValue?.GetType().GetField("OrgId").GetValue(settingsValue)
            + "; balance org: " + value?.GetType().GetField("OrgId").GetValue(value)
            + "; allocated: " + value?.GetType().GetField("PointsAllocated").GetValue(value)
            + "; points: " + (value == null ? "unavailable" : value.GetType().GetField("PointsAvailable").GetValue(value));
    }

    public static async Task<string> Models()
    {
        var type = AppDomain.CurrentDomain.GetAssemblies()
            .Select(a => a.GetType("Unity.AI.Generators.Tools.AssetGenerators"))
            .FirstOrDefault(t => t != null);
        if (type == null) throw new InvalidOperationException("Installed generator facade not found.");
        using var cancellation = new CancellationTokenSource(TimeSpan.FromSeconds(35));
        var task = (Task)type.GetMethod("GetAvailableModelsAsync", BindingFlags.Public | BindingFlags.Static)
            .Invoke(null, new object[] { true, cancellation.Token });
        await task;
        var models = (IEnumerable)task.GetType().GetProperty("Result").GetValue(task);
        return string.Join("\n", models.Cast<object>().Select(m =>
            m.GetType().GetField("ModelId").GetValue(m) + " | " +
            m.GetType().GetField("Description").GetValue(m)));
    }

    public static async Task<string> QuoteReference()
    {
        var assembly = AppDomain.CurrentDomain.GetAssemblies()
            .First(a => a.GetType("Unity.AI.Generators.Tools.AssetGenerators") != null);
        var api = assembly.GetType("Unity.AI.Generators.Tools.AssetGenerators");
        var settingsType = assembly.GetType("Unity.AI.Generators.Tools.ImageSettings");
        var parametersType = assembly.GetType("Unity.AI.Generators.Tools.GenerationParameters`1").MakeGenericType(settingsType);
        var parameters = Activator.CreateInstance(parametersType);
        var settings = Activator.CreateInstance(settingsType);
        var briefs = Newtonsoft.Json.Linq.JObject.Parse(System.IO.File.ReadAllText("Assets/Spike/GenerationBriefs.json"));
        var prompt = (string)briefs["requests"].First(r => (string)r["id"] == "athlete-lean")["prompt"];
        settingsType.GetField("Width").SetValue(settings, 1024);
        settingsType.GetField("Height").SetValue(settings, 1024);
        settingsType.GetField("RemoveBackground").SetValue(settings, true);
        parametersType.GetField("AssetType").SetValue(parameters, typeof(Texture2D));
        parametersType.GetField("Prompt").SetValue(parameters, prompt);
        parametersType.GetField("ModelId").SetValue(parameters, "gemini-3.1-flash");
        parametersType.GetField("SavePath").SetValue(parameters, "Assets/Spike/athlete-lean-reference.png");
        parametersType.GetField("Settings").SetValue(parameters, settings);
        long quoted = -1;
        Func<string, long, Task> quoteOnly = (path, cost) => {
            quoted = cost;
            throw new OperationCanceledException("Quote only: no generation authorized by this probe.");
        };
        parametersType.GetField("PermissionCheckAsync").SetValue(parameters, quoteOnly);
        var handle = api.GetMethod("GenerateAsync").MakeGenericMethod(settingsType)
            .Invoke(null, new object[] { parameters, CancellationToken.None });
        foreach (var property in new[] { "ValidationTask", "GenerationTask", "DownloadTask" })
        {
            try { await (Task)handle.GetType().GetProperty(property).GetValue(handle); }
            catch (OperationCanceledException) { }
        }
        return "Quoted service points: " + quoted + "; generation not started.";
    }
}
