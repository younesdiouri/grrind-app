using UnityEngine;

// Applied by FighterPose after sampling, so animation cannot open the loaded hand.
public sealed class DumbbellGrip : MonoBehaviour
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
