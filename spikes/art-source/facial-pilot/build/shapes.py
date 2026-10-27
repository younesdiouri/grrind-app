"""Faces and noses of both bodies as shape keys on the athlete skin (#304).

Run: Blender -b -P shapes.py
Every variant starts from the slim original face, which stays the basis: rig, UVs, eyes and brows
are Quaternius'. The forms follow ref/{male,female}-faces-noses.png (Meshy nano-banana-2); their
amplitudes are inferred, not measured. Offsets are written in a frame relative to each head, so the
same recipe fits both: u = 0 at the chin, 1 at the eyes. Then facet with
faceted-garments/facet_skin.py (all mode), which carries the keys onto the facets.
"""
from pathlib import Path
import json
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[4]
CHARACTERS = ROOT / 'spikes/Unity3D/Assets/Characters'
DEST = CHARACTERS / 'FacialPilot'


def smooth(lo, hi, value):
    t = max(0.0, min(1.0, (value - lo) / (hi - lo)))
    return t * t * (3 - 2 * t)


def band(lo0, lo1, hi0, hi1, value):
    return smooth(lo0, lo1, value) * (1 - smooth(hi0, hi1, value))


class Head:
    """Landmarks measured on each skin: chin and eye heights, the nose tip."""

    def __init__(self, chin, eyes):
        self.chin, self.eyes = chin, eyes

    def u(self, p):
        return (p.z - self.chin) / (self.eyes - self.chin)

    def z(self, u):
        return u * (self.eyes - self.chin)


def nose_weight(head, p):
    # The nose spans u .49-1, |x| < .028 and juts past y .085 on both heads; lips and lids stay out.
    return band(.47, .55, .93, 1.02, head.u(p)) * smooth(.083, .099, p.y) * (1 - smooth(.016, .028, abs(p.x)))


def front(head, p):
    # The face only: not the back of the head, nor the neck below the jaw.
    return smooth(.005, .035, p.y) * smooth(-.3, -.1, head.u(p))


# Each recipe returns the displaced copy of a world-space point.
def angular(head, p):
    """High, sharp cheekbones over a narrow V jaw and a pointed chin."""
    q, u, x = p.copy(), head.u(p), abs(p.x)
    cheek = band(.55, .7, .8, .88, u) * band(.035, .05, .065, .075, x) * front(head, p)
    q.x += .0090 * cheek * (1 if p.x > 0 else -1)
    q.y += .0054 * cheek
    jaw = (1 - smooth(.3, .5, u)) * smooth(.01, .035, x) * front(head, p)
    q.x -= .0126 * jaw * (1 if p.x > 0 else -1)
    chin = (1 - smooth(.1, .22, u)) * (1 - smooth(.012, .03, x)) * front(head, p)
    q.y += .0072 * chin
    q.z -= .0054 * chin
    return q


def oval(head, p):
    """A longer, softer face: the chin drops, the jaw rounds in, the cheeks fill."""
    q, u, x = p.copy(), head.u(p), abs(p.x)
    lower = (1 - smooth(.15, .45, u)) * front(head, p)
    q.z -= .0090 * lower
    q.x -= .0072 * lower * smooth(.015, .045, x) * (1 if p.x > 0 else -1)
    cheek = band(.3, .45, .65, .8, u) * band(.025, .04, .06, .072, x) * front(head, p)
    q.y += .0036 * cheek
    return q


def heart(head, p):
    """Wide cheekbones tapering to a small pointed chin."""
    q, u, x = p.copy(), head.u(p), abs(p.x)
    cheek = band(.55, .7, .8, .88, u) * band(.03, .045, .065, .075, x) * front(head, p)
    q.x += .0108 * cheek * (1 if p.x > 0 else -1)
    q.y += .0036 * cheek
    jaw = (1 - smooth(.25, .5, u)) * smooth(.005, .05, x) * front(head, p)
    q.x -= .0144 * jaw * (1 if p.x > 0 else -1)
    chin = (1 - smooth(.08, .2, u)) * (1 - smooth(.01, .025, x)) * front(head, p)
    q.y += .0036 * chin
    return q


def round_face(head, p):
    """Full cheeks over a short, rounded jaw."""
    q, u, x = p.copy(), head.u(p), abs(p.x)
    # Above the mouth corners (u ~ .3, |x| ~ .025): lower, the cheek folds against the lips.
    cheek = band(.38, .52, .72, .84, u) * band(.03, .048, .062, .074, x) * front(head, p)
    q.x += .0108 * cheek * (1 if p.x > 0 else -1)
    q.y += .0072 * cheek
    jaw = band(-.1, .05, .3, .45, u) * smooth(.015, .04, x) * front(head, p)
    q.x += .0090 * jaw * (1 if p.x > 0 else -1)
    chin = (1 - smooth(.08, .2, u)) * (1 - smooth(.015, .03, x)) * front(head, p)
    q.z += .0054 * chin
    return q


def wide(head, p):
    """The nose of #282: 35 % wider alae, tip 3 mm out."""
    q, w = p.copy(), nose_weight(head, p)
    q.x *= 1 + .35 * w
    q.y += .003 * w
    return q


def aquiline(head, p):
    """A bump on the bridge and a tip that hooks down."""
    q, u, w = p.copy(), head.u(p), nose_weight(head, p)
    q.y += .0068 * w * band(.72, .8, .88, .96, u) * (1 - smooth(.004, .012, abs(p.x)))
    tip = w * band(.52, .58, .66, .72, u)
    q.z -= .0051 * tip
    q.y += .0026 * tip
    return q


def flat(head, p):
    """Short and low: the bridge sinks, the nostrils spread."""
    q, u, w = p.copy(), head.u(p), nose_weight(head, p)
    q.y -= .0085 * w * smooth(.095, .11, p.y)
    q.x *= 1 + .42 * w * (1 - smooth(.62, .72, u))
    q.z += .0017 * w
    return q


def button(head, p):
    """Small and turned up."""
    q, u, w = p.copy(), head.u(p), nose_weight(head, p)
    q.x *= 1 - .26 * w
    tip = w * band(.52, .58, .68, .75, u)
    q.z += .0051 * tip
    q.y -= .0034 * tip
    return q


def straight(head, p):
    """Narrow, with a long straight bridge."""
    q, u, w = p.copy(), head.u(p), nose_weight(head, p)
    q.x *= 1 - .26 * w
    q.y += .0051 * w * band(.68, .76, .9, .97, u) * (1 - smooth(.004, .012, abs(p.x)))
    q.y += .0017 * w
    return q


BODIES = {
    # Chin and eye heights read off Male_Sport / Female_Sport and the Quaternius eyes.
    'Male': (Head(1.585, 1.698), {'FaceAngular': angular, 'FaceOval': oval,
                                  'NoseWide': wide, 'NoseAquiline': aquiline, 'NoseFlat': flat}),
    'Female': (Head(1.540, 1.656), {'FaceHeart': heart, 'FaceRound': round_face,
                                    'NoseButton': button, 'NoseStraight': straight}),
}


def build():
    report = {}
    for body, (head, recipes) in BODIES.items():
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.fbx(filepath=str(CHARACTERS / 'Personalization' / (body + '_Sport.fbx')))
        skin = next(o for o in bpy.data.objects if o.type == 'MESH' and o.name.endswith('_Sport_Skin'))
        for o in [o for o in bpy.data.objects if o.type == 'MESH' and o != skin]:
            bpy.data.objects.remove(o)
        world = [skin.matrix_world @ v.co for v in skin.data.vertices]
        inverse = skin.matrix_world.inverted()
        skin.shape_key_add(name='Basis')
        for name, recipe in recipes.items():
            key = skin.shape_key_add(name=name)
            moved = [recipe(head, p) for p in world]
            for data, q in zip(key.data, moved):
                data.co = inverse @ q
            shift = [(q - p).length for p, q in zip(world, moved)]
            # The crown, the back of the head, the ears and the neck under the chin never move.
            outside = [d for p, d in zip(world, shift) if p.y < 0 or abs(p.x) > .078 or head.u(p) > 1.05 or head.u(p) < -.3]
            assert max(outside) < 1e-6, body + ' ' + name + ' moved protected anatomy'
            report[body + ' ' + name] = round(max(shift) * 1000, 2)
        bpy.ops.object.select_all(action='DESELECT')
        for o in bpy.data.objects:
            o.select_set(o.type in ('MESH', 'ARMATURE'))
        bpy.ops.export_scene.fbx(filepath=str(DEST / (body + 'SportFace.fbx')), use_selection=True,
            add_leaf_bones=False, bake_anim=False, apply_scale_options='FBX_SCALE_ALL')
    print('SHAPES max displacement mm', json.dumps(report))


if __name__ == '__main__':
    build()
