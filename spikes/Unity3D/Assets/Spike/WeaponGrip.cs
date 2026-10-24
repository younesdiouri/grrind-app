using UnityEngine;

// Authored cylindrical grip, calibrated per anatomy. The held item is attached inside the palm.
// Applied by FighterPose after sampling, so weapon-specific arm animations retain this grip.
public sealed class WeaponGrip : MonoBehaviour
{
    public GameObject item;
    public GameObject ferPlay, huilesson;
    public GameObject HeldItem => ferPlay != null && ferPlay.activeSelf ? ferPlay
        : huilesson != null && huilesson.activeSelf ? huilesson : item != null && item.activeSelf ? item : null;
    public Transform[] fingers = System.Array.Empty<Transform>();
    public Quaternion[] rotations = System.Array.Empty<Quaternion>();

    public void SetEquipped(bool equipped)
    {
        if (equipped) GetComponent<QuaterniusAppearance>().SetBoxingGloves(false);
        if (item != null) item.SetActive(equipped);
        if (ferPlay != null) ferPlay.SetActive(false);
        if (huilesson != null) huilesson.SetActive(false);
    }

    public void Select(string weapon)
    {
        SetEquipped(weapon == "dumbbell");
        if (weapon == "ferPlay" || weapon == "huilesson") GetComponent<QuaterniusAppearance>().SetBoxingGloves(false);
        if (ferPlay != null) ferPlay.SetActive(weapon == "ferPlay");
        if (huilesson != null) huilesson.SetActive(weapon == "huilesson");
    }

    public void Apply()
    {
        if (HeldItem == null) return;
        for (int i = 0; i < fingers.Length; i++) fingers[i].localRotation = rotations[i];
    }
}
