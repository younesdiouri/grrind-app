using UnityEngine;

// Only the isolated POC uses this selection; account equipment stays server-owned.
public sealed class QuaterniusAppearance : MonoBehaviour
{
    public GameObject parted, buzzed;

    public void SelectHair(string style)
    {
        bool shortHair = style == "buzzed";
        parted.SetActive(!shortHair);
        buzzed.SetActive(shortHair);
    }
}
