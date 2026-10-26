# Faceted athlete sneaker for the default GRRIND outfit (#281).
# Left foot, metres, Blender axes: toe towards -Y, up +Z, origin on the ground under the foot centre.
# Run: Blender -b -P sneaker.py -- <output.fbx>
import sys
import bpy
import bmesh

LENGTH, WIDTH = .29, .135
# Half-width profile from toe (0) to heel (1); widest at the ball, pinched at the arch.
PROFILE = [(0, .32), (.05, .72), (.16, 1), (.32, .96), (.5, .8), (.68, .82), (.84, .78), (.95, .55), (1, .2)]


def ring(scale, z, height=None):
    """Outline points, right side toe→heel then left side heel→toe."""
    right = [(WIDTH / 2 * w * scale, (t - .5) * LENGTH * (1 + (scale - 1) * .6), t) for t, w in PROFILE]
    points = right + [(-x, y, t) for x, y, t in reversed(right)]
    return [(x, y, z if height is None else height(t)) for x, y, t in points]


def upper_height(t):
    # Low toe box, rising instep, high heel collar.
    return .075 + .04 * min(t / .45, 1) + .03 * max(0, (t - .6) / .4)


def band(bm, lower, upper, material):
    for i in range(len(lower)):
        j = (i + 1) % len(lower)
        face = bm.faces.new((lower[i], lower[j], upper[j], upper[i]))
        face.material_index = material


def verts(bm, points):
    return [bm.verts.new((x, y, z)) for x, y, z in points]


bpy.ops.wm.read_factory_settings(use_empty=True)
mesh = bpy.data.meshes.new("Sneaker")
bm = bmesh.new()
SOLE, STRIPE, TRIM, UPPER = range(4)

# Sole: a chunky slab with a stripe proud of its side.
bottom = verts(bm, ring(1, 0))
stripe_low = verts(bm, ring(1, .011))
stripe_low_out = verts(bm, ring(1.025, .011))
stripe_high_out = verts(bm, ring(1.025, .019))
stripe_high = verts(bm, ring(1, .019))
sole_top = verts(bm, ring(1, .034))
bm.faces.new(list(reversed(bottom))).material_index = SOLE
band(bm, bottom, stripe_low, SOLE)
band(bm, stripe_low, stripe_low_out, STRIPE)
band(bm, stripe_low_out, stripe_high_out, STRIPE)
band(bm, stripe_high_out, stripe_high, STRIPE)
band(bm, stripe_high, sole_top, SOLE)

# Upper: a two-tone shell inset from the sole, closed at the collar.
base = verts(bm, ring(.96, .034))
waist = verts(bm, ring(.97, 0, lambda t: .034 + (upper_height(t) - .034) * .45))
collar = verts(bm, ring(.82, 0, upper_height))
band(bm, sole_top, base, SOLE)
band(bm, base, waist, TRIM)
band(bm, waist, collar, UPPER)
bm.faces.new(collar).material_index = UPPER

bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
bm.to_mesh(mesh)
bm.free()

for name, colour in (("Sole", (.9, .93, .95, 1)), ("Stripe", (.32, .37, .46, 1)), ("Trim", (.32, .37, .46, 1)), ("Upper", (.1, .12, .19, 1))):
    material = bpy.data.materials.new(name)
    material.diffuse_color = colour
    mesh.materials.append(material)

obj = bpy.data.objects.new("Sneaker", mesh)
bpy.context.scene.collection.objects.link(obj)
for polygon in mesh.polygons:
    polygon.use_smooth = False
# Chamfer the hard edges once: facets with a bevelled rim, not a rounded blob.
bevel = obj.modifiers.new("Bevel", "BEVEL")
bevel.width, bevel.segments, bevel.limit_method, bevel.angle_limit = .003, 1, "ANGLE", .6
bpy.context.view_layer.objects.active = obj
obj.select_set(True)
bpy.ops.object.modifier_apply(modifier="Bevel")
bpy.ops.object.modifier_add(type="TRIANGULATE")
bpy.ops.object.modifier_apply(modifier="Triangulate")

print("SNEAKER triangles", len(mesh.polygons), "dimensions", tuple(round(d, 3) for d in obj.dimensions))
output = sys.argv[sys.argv.index("--") + 1]
bpy.ops.export_scene.fbx(filepath=output, use_selection=True, apply_unit_scale=True, apply_scale_options="FBX_SCALE_UNITS",
                         axis_forward="-Z", axis_up="Y", mesh_smooth_type="FACE", use_mesh_modifiers=True, bake_space_transform=True)
