using System;
using UnityEditor;
using UnityEngine;

public static class ServerEquipmentChecks
{
    public static void Validate()
    {
        foreach (var name in new[] { "QuaterniusShowcase", "QuaterniusFemale" })
        {
            var actor = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Resources/" + name + ".prefab"));
            try
            {
                var appearance = actor.GetComponent<QuaterniusAppearance>();
                appearance.Customize("tan", "brown", "brown", "base", "cyan");
                if (!appearance.guinzz.activeSelf || appearance.sportTrousers.activeSelf)
                    throw new Exception(name + ": equipped trousers depend on the shirt");
                appearance.Customize("tan", "brown", "brown", "coral", "base");
                if (appearance.guinzz.activeSelf || !appearance.sportTrousers.activeSelf)
                    throw new Exception(name + ": a shirt fabricated equipped trousers");
                appearance.Customize("tan", "brown", "brown", "base", "base");
                if (!appearance.sportTrousers.activeSelf || appearance.guinzz.activeSelf)
                    throw new Exception(name + ": removing equipment did not restore the athlete trousers");
            }
            finally { UnityEngine.Object.DestroyImmediate(actor); }
        }
        Debug.Log("Server equipment PASS: independent chest/legs and removal, both bodies");
    }
}
