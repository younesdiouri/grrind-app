using UnityEngine;

// Only the isolated POC uses this selection; account equipment stays server-owned.
public sealed class QuaterniusAppearance : MonoBehaviour
{
    public GameObject[] headbands = System.Array.Empty<GameObject>();
    bool equipped;
    int hair;
    public void SetHeadband(bool visible)
    {
        equipped=visible;
        for(int i=0;i<headbands.Length;i++)headbands[i].SetActive(visible&&i==hair);
    }
    public GameObject parted, buzzed, buns, longHair;
    public GameObject[] fantasyTop = System.Array.Empty<GameObject>();
    public GameObject[] sportTop = System.Array.Empty<GameObject>();
    public Material skinMaterial, handsMaterial, hairMaterial, eyeMaterial, shirtMaterial;
    public GameObject fantasyTrousers, sportTrousers;
    public GameObject guinzz;
    public Material guinzzMaterial;
    public Mesh guinzzFullMesh, guinzzBootMesh;

    public void SetBoots(bool visible)
    {
        guinzz.GetComponent<SkinnedMeshRenderer>().sharedMesh = visible ? guinzzBootMesh : guinzzFullMesh;
    }

    public void SelectHair(string style)
    {
        parted.SetActive(style != "buzzed" && style != "buns" && style != "long");
        buzzed.SetActive(style == "buzzed");
        buns.SetActive(style == "buns");
        longHair.SetActive(style == "long");
        hair=style=="long"?-1:style=="buzzed"?1:style=="buns"?2:0;
        SetHeadband(equipped);
    }

    public void Customize(string tone, string iris, string hairColor, bool sport, string shirtColor, string pantsColor = "original")
    {
        foreach (var obj in fantasyTop) obj.SetActive(!sport);
        foreach (var obj in sportTop) obj.SetActive(sport);
        fantasyTrousers.SetActive(!sport);
        sportTrousers.SetActive(sport && pantsColor == "original");
        guinzz.SetActive(sport && pantsColor != "original");
        // Local prototype palette over the painted source; no account persistence.
        Color skin = tone == "light" ? new Color(1.4f, 1.65f, 1.85f) : tone == "brown" ? new Color(.66f, .52f, .43f)
            : tone == "deep" ? new Color(.37f, .27f, .23f) : Color.white;
        Color eyes = iris == "blue" ? new Color(.15f, .55f, 1.35f) : iris == "green" ? new Color(.22f, .99f, .385f) : Color.white;
        Color hairTint = hairColor == "black" ? new Color(.025f, .025f, .03f) : hairColor == "blond"
            ? new Color(.85f, .62f, .28f) : new Color(.17f, .085f, .04f);
        foreach (var renderer in GetComponentsInChildren<SkinnedMeshRenderer>(true))
        {
            var materials = renderer.sharedMaterials;
            for (int i=0; i<materials.Length; i++)
            {
                var mat = materials[i];
                var block = new MaterialPropertyBlock();
                if (mat == skinMaterial || mat == handsMaterial) block.SetColor("_BaseColor", skin);
                else if (mat == hairMaterial) block.SetColor("_BaseColor", hairTint);
                else if (mat == shirtMaterial) block.SetColor("_BaseColor", shirtColor == "coral"
                    ? new Color(1.35f, .82f, .66f) : Color.white);
                else if (mat == guinzzMaterial) block.SetColor("_BaseColor", pantsColor == "coral"
                    ? new Color(1f, .27f, .23f) : pantsColor == "cyan" ? new Color(.035f, .55f, .7f) : new Color(.43f, .16f, .72f));
                else if (mat == eyeMaterial) { block.SetColor("_IrisTint", eyes); block.SetColor("_EyeSkinTint", skin); }
                // Cut skin has open seams: an inverted hull draws stray lines across them.
                if (mat == skinMaterial && renderer.name.EndsWith("_Skin")) block.SetFloat("_OutlineWidth", 0);
                renderer.SetPropertyBlock(block, i);
            }
        }
    }
}
