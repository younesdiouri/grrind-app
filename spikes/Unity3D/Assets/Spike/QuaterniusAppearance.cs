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
    public GameObject parted, buzzed, buns;

    public void SelectHair(string style)
    {
        parted.SetActive(style != "buzzed" && style != "buns");
        buzzed.SetActive(style == "buzzed");
        buns.SetActive(style == "buns");
        hair=style=="buzzed"?1:style=="buns"?2:0;
        SetHeadband(equipped);
    }
}
