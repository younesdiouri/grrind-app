using UnityEngine;

// Authored cylindrical grip, calibrated per anatomy. The held item is attached inside the palm.
// Applied by FighterPose after sampling, so weapon-specific arm animations retain this grip.
public sealed class WeaponGrip : MonoBehaviour
{
    public GameObject item;
    public Transform[] fingers = System.Array.Empty<Transform>();
    public Quaternion[] rotations = System.Array.Empty<Quaternion>();

    public void SetEquipped(bool equipped)
    {
        if (equipped) GetComponent<QuaterniusAppearance>().SetBoxingGloves(false);
        if (item != null) item.SetActive(equipped);
    }

    public void Apply()
    {
        if (item == null || !item.activeSelf) return;
        for (int i = 0; i < fingers.Length; i++) fingers[i].localRotation = rotations[i];
    }
}
