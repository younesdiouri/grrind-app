using UnityEngine;

// Visual selection only; account appearance and equipment stay server-owned.
public sealed class QuaterniusAppearance : MonoBehaviour
{
    // One headband fit per hairstyle (same order as hairStyles).
    public GameObject[] headbands = System.Array.Empty<GameObject>();
    public string[] headbandStyles = System.Array.Empty<string>();
    bool equipped;
    string hair = "";
    public void SetHeadband(bool visible)
    {
        equipped=visible;
        for(int i=0;i<headbands.Length;i++)headbands[i].SetActive(visible&&headbandStyles[i]==hair);
    }
    // The hairstyles of this body (#304): the first one stands in for a style the body does not wear.
    public string[] hairStyles = System.Array.Empty<string>();
    public GameObject[] hairs = System.Array.Empty<GameObject>();
    // Faces and noses are blend shapes of the athlete skin, named Face<Style> / Nose<Style>; original is none.
    public SkinnedMeshRenderer[] facialRenderers = System.Array.Empty<SkinnedMeshRenderer>();
    string selectedFace = "original", selectedNose = "original";

    public void SelectFace(string face, string nose)
    {
        selectedFace = face; selectedNose = nose;
        foreach (var renderer in facialRenderers)
            for (int i = 0; i < renderer.sharedMesh.blendShapeCount; i++)
            {
                string shape = renderer.sharedMesh.GetBlendShapeName(i);
                renderer.SetBlendShapeWeight(i, shape.Equals("Face" + face, System.StringComparison.OrdinalIgnoreCase)
                    || shape.Equals("Nose" + nose, System.StringComparison.OrdinalIgnoreCase) ? 100 : 0);
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
        if (visible) GetComponent<WeaponGrip>()?.SetEquipped(false);
        foreach (var glove in boxingGloves) glove.SetActive(visible);
        for (int i = 0; i < gloveArms.Length; i++)
            gloveArms[i].sharedMesh = visible ? coveredHandMeshes[i] : bareHandMeshes[i];
        SelectFace(selectedFace, selectedNose);
    }

    public void SelectHair(string style)
    {
        hair = System.Array.IndexOf(hairStyles, style) >= 0 ? style : hairStyles[0];
        for (int i = 0; i < hairs.Length; i++) hairs[i].SetActive(hairStyles[i] == hair);
        SetHeadband(equipped);
    }

    // Faceted clothes carry no texture since #298: the tint is the colour itself (coral #FF6B57, slate, white).
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
                    ? new Color(1f, .42f, .34f) : shirtColor == "cyan" ? new Color(.42f, .48f, .57f) : new Color(.92f, .94f, .96f));
                else if (mat == guinzzMaterial) block.SetColor("_BaseColor", pantsColor == "coral"
                    ? new Color(1f, .27f, .23f) : pantsColor == "cyan" ? new Color(.035f, .55f, .7f) : new Color(.43f, .16f, .72f));
                else if (mat == eyeMaterial) { block.SetColor("_IrisTint", eyes); block.SetColor("_EyeSkinTint", skin); }
                renderer.SetPropertyBlock(block, i);
            }
        }
    }
}
