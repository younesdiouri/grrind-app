using System;
using UnityEngine;

// A deterministic rig/attachment test. These procedural poses are not finished combat animations.
public sealed class CombatBench : MonoBehaviour
{
    public Animator actor;
    public Camera inspectionCamera;
    public Transform equipment;
    public int stance;
    public float phase = 1;
    public bool autoplay;
    public int view;
    public float azimuth = 35;
    public float thumbCurl = -.3f;
    public float thumbSpread = -.2f;
    public float guardArmLift = -.5f;
    public float guardArmSwing = -.3f;
    public float guardElbow = .15f;
    HumanPoseHandler handler;
    HumanPose rest;
    float[] muscles;
    Transform leftFoot, rightFoot;
    Quaternion leftFootRotation, rightFootRotation;
    Vector3 rootPosition;
    float footHeight;

    void Awake()
    {
        if (actor == null || !actor.isHuman) { enabled = false; return; }
        actor.cullingMode = AnimatorCullingMode.AlwaysAnimate;
        foreach (var skin in actor.GetComponentsInChildren<SkinnedMeshRenderer>()) skin.updateWhenOffscreen = true;
        handler = new HumanPoseHandler(actor.avatar, actor.transform);
        handler.GetHumanPose(ref rest);
        muscles = (float[])rest.muscles.Clone();
        leftFoot = actor.GetBoneTransform(HumanBodyBones.LeftFoot);
        rightFoot = actor.GetBoneTransform(HumanBodyBones.RightFoot);
        leftFootRotation = leftFoot.rotation;
        rightFootRotation = rightFoot.rotation;
        rootPosition = actor.transform.position;
        footHeight = Mathf.Min(leftFoot.position.y, rightFoot.position.y);
    }

    void LateUpdate()
    {
        if (handler == null) return;
        Array.Copy(rest.muscles, muscles, muscles.Length);
        var t = Mathf.SmoothStep(0, 1, autoplay ? (Mathf.Sin(Time.time * 2) + 1)/2 : phase);
        foreach (var side in new[] { "Left", "Right" })
        {
            Set(side + " Arm Down-Up", guardArmLift);
            Set(side + " Arm Front-Back", guardArmSwing);
            Set(side + " Upper Leg In-Out", .15f);
            Set(side + " Forearm Stretch", guardElbow);
            Set(side + " Hand Down-Up", 0);
            for (int i = 0; i < HumanTrait.MuscleName.Length; i++)
                if (HumanTrait.MuscleName[i].StartsWith(side + " ") && HumanTrait.MuscleName[i].Contains("Stretched"))
                    muscles[i] = -.95f;
            Set(side + " Thumb 1 Stretched", thumbCurl);
            Set(side + " Thumb Spread", thumbSpread);
            Set(side + " Thumb 2 Stretched", -.6f);
            Set(side + " Thumb 3 Stretched", -.6f);
        }
        Set("Left Arm Front-Back", -.3f);
        Set("Left Arm Down-Up", -.15f);
        Set("Left Forearm Stretch", -.45f);
        if (stance == 1)
        {
            Set("Right Forearm Stretch", Mathf.Lerp(guardElbow, .7f, t));
            Set("Right Arm Down-Up", Mathf.Lerp(guardArmLift, -.1f, t));
            Set("Chest Twist Left-Right", -.15f*t);
        }
        else if (stance == 2)
        {
            Set("Chest Front-Back", .25f*t);
            Set("Head Nod Down-Up", .1f*t);
        }
        else if (stance == 3)
        {
            Set("Left Upper Leg Front-Back", -.45f*t);
            Set("Right Upper Leg Front-Back", -.45f*t);
            Set("Left Lower Leg Stretch", Mathf.Lerp(Get("Left Lower Leg Stretch"), -.4f, t));
            Set("Right Lower Leg Stretch", Mathf.Lerp(Get("Right Lower Leg Stretch"), -.4f, t));
            Set("Chest Front-Back", -.15f*t);
        }
        var pose = rest;
        pose.muscles = muscles;
        actor.transform.position = rootPosition;
        handler.SetHumanPose(ref pose);
        // Height correction for this symmetric fixture. Locomotion still needs proper foot IK.
        leftFoot.rotation = leftFootRotation;
        rightFoot.rotation = rightFootRotation;
        actor.transform.position += Vector3.up * (footHeight - Mathf.Min(leftFoot.position.y,rightFoot.position.y));
        var focus = view == 1 ? actor.GetBoneTransform(HumanBodyBones.Head).position + Vector3.up*.04f
            : view == 2 ? actor.GetBoneTransform(HumanBodyBones.RightHand).position : new Vector3(0,.95f,0);
        inspectionCamera.transform.position = focus + Quaternion.Euler(0,azimuth,0) * new Vector3(0,view == 0 ? .9f : .2f,5.5f);
        inspectionCamera.transform.LookAt(focus);
        inspectionCamera.orthographicSize = view == 0 ? 1.2f : .23f;
    }

    float Get(string name) => muscles[Array.IndexOf(HumanTrait.MuscleName, name)];
    void Set(string name, float value) => muscles[Array.IndexOf(HumanTrait.MuscleName, name)] = value;
    void OnDestroy() => handler?.Dispose();

    void OnGUI()
    {
        GUILayout.BeginArea(new Rect(16,16,250,260), GUI.skin.box);
        GUILayout.Label("GRRIND / BANC TECHNIQUE C#");
        GUILayout.Label("Mannequin et poses de controle");
        stance = GUILayout.SelectionGrid(stance, new[] { "Garde", "Extension", "Recul", "Flexion" }, 2);
        autoplay = GUILayout.Toggle(autoplay, "Animation de controle");
        phase = GUILayout.HorizontalSlider(phase, 0, 1);
        view = GUILayout.SelectionGrid(view, new[] { "Entier", "Tete", "Main" }, 3);
        azimuth = GUILayout.HorizontalSlider(azimuth, -180, 180);
        if (equipment != null) equipment.gameObject.SetActive(GUILayout.Toggle(equipment.gameObject.activeSelf, "Haltere technique"));
        GUILayout.Label("Ce banc ne valide pas la DA finale.");
        GUILayout.EndArea();
    }
}
