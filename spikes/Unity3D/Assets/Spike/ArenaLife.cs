using UnityEngine;
using UnityEngine.Animations;
using UnityEngine.Playables;

/** The audience and referee follow the replay clock; they never run combat physics. */
public sealed class ArenaLife : MonoBehaviour
{
    public Animator referee;
    public AnimationClip[] refereeClips;
    public GameObject maleSpectator, femaleSpectator;
    public AnimationClip[] crowdClips;
    struct Spectator { public Transform root; public AnimationClipPlayable clip; public Vector3 home; public float yaw, offset, speed; }
    Spectator[] crowd;
    PlayableGraph graph;
    AnimationMixerPlayable mixer;
    AnimationClipPlayable[] clips;
    static readonly Vector3 RefereeStart = new(0, 0, -1.15f), RefereeHome = new(.65f, 0, -3.6f);
    static readonly Color[] Shirts = { new(.12f,.74f,.82f), new(1,.36f,.25f), new(.88f,.62f,.16f),
        new(.55f,.32f,.78f), new(.24f,.67f,.43f), new(.9f,.86f,.73f) };

    void Awake()
    {
        graph = PlayableGraph.Create("GRRIND arena"); graph.SetTimeUpdateMode(DirectorUpdateMode.Manual);
        crowd = new Spectator[18];
        for (int side = 0, i = 0; side < 2; side++)
        for (int row = 0; row < 3; row++)
        for (int seat = 0; seat < 3; seat++, i++)
        {
            bool female = i % 3 == 1;
            var obj = Instantiate(female ? femaleSpectator : maleSpectator);
            obj.name = "Spectator " + i;
            obj.transform.SetParent(transform, false);
            var home = new Vector3((side == 0 ? -1 : 1) * (1.55f + seat * .60f + row * .12f), .22f + row * .34f, -1.6f - row * .68f);
            float yaw = Quaternion.LookRotation(new Vector3(-home.x, 0, -home.z)).eulerAngles.y;
            obj.transform.localScale = Vector3.one * (.62f + i % 3 * .025f);
            var animator = obj.GetComponent<Animator>();
            var source = crowdClips[i % crowdClips.Length];
            var motion = AnimationClipPlayable.Create(graph, source);
            motion.SetApplyFootIK(true);
            AnimationPlayableOutput.Create(graph, obj.name, animator).SetSourcePlayable(motion);
            var block = new MaterialPropertyBlock();
            foreach (var renderer in obj.GetComponentsInChildren<Renderer>())
            {
                var materials = renderer.sharedMaterials;
                for (int slot = 0; slot < materials.Length; slot++)
                {
                    string name = materials[slot].name.ToLowerInvariant();
                    block.Clear();
                    if (name.Contains("shirt")) block.SetColor("_BaseColor", Shirts[i % Shirts.Length]);
                    if (name.Contains("skin")) block.SetColor("_BaseColor", i % 4 == 0 ? new Color(.52f,.4f,.34f) : Color.white);
                    renderer.SetPropertyBlock(block, slot);
                }
            }
            crowd[i] = new Spectator { root = obj.transform, clip = motion, home = home, yaw = yaw,
                offset = Mathf.Repeat(i * .618034f, 1) * source.length, speed = .86f + i % 7 * .045f };
        }
        mixer = AnimationMixerPlayable.Create(graph, refereeClips.Length);
        clips = new AnimationClipPlayable[refereeClips.Length];
        for (int i = 0; i < clips.Length; i++)
        {
            clips[i] = AnimationClipPlayable.Create(graph, refereeClips[i]);
            clips[i].SetApplyFootIK(true); graph.Connect(clips[i], 0, mixer, i);
        }
        referee.cullingMode = AnimatorCullingMode.AlwaysAnimate; referee.applyRootMotion = false;
        AnimationPlayableOutput.Create(graph, "Referee", referee).SetSourcePlayable(mixer); graph.Play();
        DrawFrame(new CombatPresentation.Frame(), true);
    }

    public void DrawFrame(CombatPresentation.Frame frame, bool playing)
    {
        if (crowd == null || frame == null) return;
        for (int i = 0; i < crowd.Length; i++)
        {
            var member = crowd[i];
            member.root.SetLocalPositionAndRotation(Vector3.zero, Quaternion.identity);
            member.clip.SetTime((frame.reduced || !playing ? 0 : frame.time) * member.speed + member.offset);
        }
        referee.gameObject.SetActive(playing && !frame.finished);
        float seconds = frame.opening >= 0 ? frame.opening * 3.4f : 3.4f;
        float retreat = frame.reduced ? 1 : Mathf.SmoothStep(0, 1, Mathf.InverseLerp(2.4f, 3.35f, seconds));
        int selected = seconds < 2.4f && !frame.reduced ? 1 : retreat < 1 ? 2 : 0;
        float phase = selected == 1 ? Mathf.Min(.5f, seconds / 1.2f * .5f) : Mathf.Repeat(frame.time / .9f, 1);
        for (int i = 0; i < clips.Length; i++) { mixer.SetInputWeight(i, i == selected ? 1 : 0); clips[i].SetTime(phase * refereeClips[i].length); }
        referee.transform.SetPositionAndRotation(Vector3.zero, Quaternion.identity);
        graph.Evaluate(0);
        foreach (var member in crowd)
            member.root.SetLocalPositionAndRotation(member.home, Quaternion.Euler(0, member.yaw, 0));
        referee.transform.position = Vector3.Lerp(RefereeStart, RefereeHome, retreat);
        referee.transform.rotation = Quaternion.Euler(0, retreat > 0 && retreat < 1 ? 165 : retreat >= 1 ? -10 : 0, 0);
    }
    void OnDestroy() { if (graph.IsValid()) graph.Destroy(); }
}
