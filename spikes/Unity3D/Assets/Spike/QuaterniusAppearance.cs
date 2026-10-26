using UnityEngine;

// Visual selection only; account appearance and equipment stay server-owned.
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
    public SkinnedMeshRenderer[] facialRenderers = System.Array.Empty<SkinnedMeshRenderer>();
    public Mesh[] originalFaces = System.Array.Empty<Mesh>(), squareFaces = System.Array.Empty<Mesh>();
    public Mesh[] originalGlovedFaces = System.Array.Empty<Mesh>(), squareGlovedFaces = System.Array.Empty<Mesh>();
    string selectedFace = "original", selectedNose = "original";
    bool glovesEquipped;

    public void SelectFace(string face, string nose)
    {
        selectedFace = face; selectedNose = nose;
        for (int i = 0; i < facialRenderers.Length; i++)
        {
            var renderer = facialRenderers[i];
            var faces = glovesEquipped ? (face == "square" ? squareGlovedFaces : originalGlovedFaces)
                : (face == "square" ? squareFaces : originalFaces);
            renderer.sharedMesh = faces[i];
            renderer.SetBlendShapeWeight(renderer.sharedMesh.GetBlendShapeIndex("NoseWide"), nose == "wide" ? 100 : 0);
        }
    }
    public GameObject[] sportTop = System.Array.Empty<GameObject>();
    public Material skinMaterial, hairMaterial, eyeMaterial, shirtMaterial;
    // Quaternius paints a light skin of its own: tinting the dark one up to it washed the face out.
    public Texture lightSkin;
    public GameObject sportTrousers;
    public GameObject guinzz;
    public Material guinzzMaterial;
    public GameObject[] boxingGloves = System.Array.Empty<GameObject>();
    public SkinnedMeshRenderer[] gloveArms = System.Array.Empty<SkinnedMeshRenderer>();
    public Mesh[] bareHandMeshes = System.Array.Empty<Mesh>(), coveredHandMeshes = System.Array.Empty<Mesh>();

    public void SetBoxingGloves(bool visible)
    {
        glovesEquipped = visible;
        if (visible) GetComponent<WeaponGrip>()?.SetEquipped(false);
        foreach (var glove in boxingGloves) glove.SetActive(visible);
        for (int i = 0; i < gloveArms.Length; i++)
            gloveArms[i].sharedMesh = visible ? coveredHandMeshes[i] : bareHandMeshes[i];
        SelectFace(selectedFace, selectedNose);
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

    // The painted cotton is a mid grey: tints are the target colour over that grey (coral #FF6B57).
    // The athlete outfit is the default: a white t-shirt and slate joggers until the server equips
    // the slate ("cyan", the painted texture) or coral t-shirt and the Guinzz leggings.
    public void Customize(string tone, string iris, string hairColor, string shirtColor = "base", string pantsColor = "base")
    {
        bool leggings = pantsColor == "violet" || pantsColor == "cyan" || pantsColor == "coral";
        sportTrousers.SetActive(!leggings);
        guinzz.SetActive(leggings);
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
                if (mat == skinMaterial && tone == "light" && lightSkin != null) { block.SetTexture("_BaseMap", lightSkin); block.SetColor("_BaseColor", Color.white); }
                else if (mat == skinMaterial) block.SetColor("_BaseColor", skin);
                // Brows read darker than the hair so the face keeps its expression from afar.
                else if (mat == hairMaterial) block.SetColor("_BaseColor", renderer.name == "Eyebrows" ? hairTint * .55f : hairTint);
                else if (mat == shirtMaterial) block.SetColor("_BaseColor", shirtColor == "coral"
                    ? new Color(1.8f, .76f, .62f) : shirtColor == "cyan" ? Color.white : new Color(1.55f, 1.55f, 1.6f));
                else if (mat == guinzzMaterial) block.SetColor("_BaseColor", pantsColor == "coral"
                    ? new Color(1f, .27f, .23f) : pantsColor == "cyan" ? new Color(.035f, .55f, .7f) : new Color(.43f, .16f, .72f));
                else if (mat == eyeMaterial) { block.SetColor("_IrisTint", eyes); block.SetColor("_EyeSkinTint", skin); }
                renderer.SetPropertyBlock(block, i);
            }
        }
    }
}
